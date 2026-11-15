/**
 * Pedidos de la tienda (lote 02, PBI-0102), con un almacén en memoria: quién puede ver un pedido, cuándo puede
 * cambiarlo y cancelarlo, y el efecto de cada cambio (dirección y total, stock, actividad y revisión).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createPedidosUseCases } from '../../../../src/application/pedidos/pedidos.use-cases.mjs';

const security = { digest: (valor) => `h:${valor}` };
const HORA = 60 * 60 * 1000;

const pedido = (id, cambios = {}) => ({
  id,
  createdAt: new Date(Date.now() - HORA).toISOString(),
  updatedAt: new Date(Date.now() - HORA).toISOString(),
  status: 'confirmed',
  customer: { fullName: 'Ana', email: 'ana@example.com', phone: '999', document: '1' },
  shipping: { addressLine: 'Av 1', district: 'San Isidro', province: 'Lima', department: 'Lima' },
  shippingOrigin: 'Lima Centro',
  deliveryDate: '2030-01-01',
  items: [{ productId: 'p-1', quantity: 2, product: { id: 'p-1', price: 100 } }],
  subtotal: 200,
  igv: 30.51,
  shippingCost: 12,
  total: 212,
  accessTokenHash: 'h:token-invitado',
  idempotencyKeyHash: 'h:clave',
  ...cambios,
});

function crear() {
  const state = {
    revision: 0,
    products: [{ id: 'p-1', name: 'Uno', price: 100, stock: 3, active: true }],
    rates: [
      { id: 'r-1', origin: 'Lima Centro', destination: 'San Isidro', price: 12 },
      { id: 'r-2', origin: 'Callao', destination: 'San Isidro', price: 9 },
      { id: 'r-3', origin: 'Lima Centro', destination: 'Miraflores', price: 20 },
    ],
    orders: [
      pedido('WS-1', { accountId: 'a-1' }),
      pedido('WS-2'),
      pedido('WS-3', { customer: { fullName: 'Ana', email: 'ana@example.com' } }),
      pedido('WS-4', {
        customer: { fullName: 'Luis', email: 'luis@example.com' },
        accessTokenHash: 'h:otro',
      }),
    ],
    accounts: [
      { id: 'a-1', email: 'ana@example.com', verified: true },
      { id: 'a-2', email: 'ana@example.com', verified: false },
    ],
    accountSessions: [
      { tokenHash: 'h:sesion-a1', accountId: 'a-1', expiresAt: new Date(Date.now() + HORA).toISOString() },
      { tokenHash: 'h:sesion-a2', accountId: 'a-2', expiresAt: new Date(Date.now() + HORA).toISOString() },
      { tokenHash: 'h:vencida', accountId: 'a-1', expiresAt: new Date(Date.now() - HORA).toISOString() },
    ],
  };
  const store = {
    state,
    guardados: 0,
    save() {
      this.guardados += 1;
    },
  };
  return { store, pedidos: createPedidosUseCases({ store, security }) };
}

const noEncontrado = { code: 'ORDER_NOT_FOUND', kind: 'not-found' };
const invitado = { bearerToken: '', orderToken: 'token-invitado' };

test('«mis pedidos» pide sesión y trae los de la cuenta y los de su correo verificado, sin datos internos', () => {
  const { pedidos } = crear();
  assert.throws(() => pedidos.listMine(''), { code: 'AUTHENTICATION_REQUIRED', kind: 'unauthenticated' });
  assert.throws(() => pedidos.listMine('vencida'), { code: 'AUTHENTICATION_REQUIRED' });
  const mios = pedidos.listMine('sesion-a1');
  assert.deepEqual(mios.map((item) => item.id).sort(), ['WS-1', 'WS-2', 'WS-3']);
  for (const item of mios)
    for (const campo of ['accessTokenHash', 'idempotencyKeyHash', 'accountId'])
      assert.equal(campo in item, false, `${item.id} ${campo}`);
});

test('una cuenta sin verificar no ve los pedidos de invitado de su correo', () => {
  const { pedidos } = crear();
  assert.deepEqual(pedidos.listMine('sesion-a2'), []);
});

test('un pedido se consulta con la cuenta dueña o con el token de acceso del invitado', () => {
  const { pedidos } = crear();
  assert.equal(pedidos.getOrder('WS-1', { bearerToken: 'sesion-a1', orderToken: '' }).id, 'WS-1');
  assert.equal(pedidos.getOrder('WS-2', invitado).id, 'WS-2');
  assert.equal(pedidos.getOrder('WS-2', { bearerToken: 'sesion-a1', orderToken: 'otro' }).id, 'WS-2');
});

test('un pedido inexistente y uno ajeno responden igual: ORDER_NOT_FOUND', () => {
  const { pedidos } = crear();
  const ajenos = [
    ['WS-9', invitado],
    ['WS-4', invitado],
    ['WS-4', { bearerToken: 'sesion-a1', orderToken: '' }],
    ['WS-2', { bearerToken: '', orderToken: '' }],
    ['WS-2', { bearerToken: 'vencida', orderToken: '' }],
    ['WS-2', { bearerToken: 'sesion-a2', orderToken: '' }],
  ];
  const mensajes = new Set();
  for (const [id, credenciales] of ajenos)
    assert.throws(
      () => pedidos.getOrder(id, credenciales),
      (error) => {
        mensajes.add(error.message);
        return error.code === noEncontrado.code && error.kind === noEncontrado.kind;
      },
      id,
    );
  assert.equal(mensajes.size, 1);
});

test('un pedido enviado, entregado o cancelado responde ORDER_NOT_MODIFIABLE, aunque siga en la ventana', () => {
  for (const status of ['shipped', 'delivered', 'cancelled']) {
    const { store, pedidos } = crear();
    store.state.orders.find((item) => item.id === 'WS-2').status = status;
    assert.throws(() => pedidos.requireModifiableOrder('WS-2', invitado), {
      code: 'ORDER_NOT_MODIFIABLE',
      kind: 'conflict',
    });
  }
});

test('pasadas las 24 horas responde ORDER_WINDOW_EXPIRED; si además se envió, ORDER_NOT_MODIFIABLE', () => {
  const { store, pedidos } = crear();
  const viejo = store.state.orders.find((item) => item.id === 'WS-2');
  viejo.createdAt = new Date(Date.now() - 25 * HORA).toISOString();
  assert.throws(() => pedidos.requireModifiableOrder('WS-2', invitado), {
    code: 'ORDER_WINDOW_EXPIRED',
    kind: 'conflict',
  });
  viejo.status = 'shipped';
  assert.throws(() => pedidos.requireModifiableOrder('WS-2', invitado), { code: 'ORDER_NOT_MODIFIABLE' });
});

test('para cambiar un pedido hay que poder verlo: uno ajeno responde ORDER_NOT_FOUND', () => {
  const { pedidos } = crear();
  assert.throws(() => pedidos.requireModifiableOrder('WS-4', invitado), noEncontrado);
});

test('cambiar la dirección toma la tarifa más baja del nuevo distrito y recalcula origen, envío y total', () => {
  const { store, pedidos } = crear();
  const orden = pedidos.requireModifiableOrder('WS-2', invitado);
  const cambiado = pedidos.modify(orden, 'shipping', {
    shipping: { addressLine: 'Jr 2', district: 'San Isidro', province: 'Lima', department: 'Lima' },
  });
  assert.deepEqual(
    [cambiado.shippingOrigin, cambiado.shippingCost, cambiado.total, cambiado.subtotal, cambiado.igv],
    ['Callao', 9, 209, 200, 30.51],
  );
  assert.equal(cambiado.shipping.addressLine, 'Jr 2');
  assert.equal(store.state.revision, 1);
  assert.equal(store.guardados, 1);
  assert.equal('accessTokenHash' in cambiado, false);
});

test('cambiar la dirección a un distrito sin tarifa responde SHIPPING_UNAVAILABLE y no cambia el pedido', () => {
  const { store, pedidos } = crear();
  const orden = pedidos.requireModifiableOrder('WS-2', invitado);
  const antes = structuredClone(orden);
  assert.throws(
    () =>
      pedidos.modify(orden, 'shipping', {
        shipping: { addressLine: 'Jr 2', district: 'Barranco', province: 'Lima', department: 'Lima' },
      }),
    { code: 'SHIPPING_UNAVAILABLE', kind: 'validation' },
  );
  assert.deepEqual(orden, antes);
  assert.equal(store.state.revision, 0);
  assert.equal(store.guardados, 0);
});

test('cambiar la dirección con datos incompletos responde VALIDATION_ERROR y no cambia el pedido', () => {
  const { pedidos } = crear();
  const orden = pedidos.requireModifiableOrder('WS-2', invitado);
  const antes = structuredClone(orden);
  assert.throws(() => pedidos.modify(orden, 'shipping', { shipping: { district: 'San Isidro' } }), {
    code: 'VALIDATION_ERROR',
  });
  assert.deepEqual(orden, antes);
});

test('cancelar devuelve el stock, deja el evento «el cliente canceló», sube la revisión y guarda una vez', () => {
  const { store, pedidos } = crear();
  const orden = pedidos.requireModifiableOrder('WS-2', invitado);
  const cancelado = pedidos.modify(orden, 'cancel', {});
  assert.equal(cancelado.status, 'cancelled');
  assert.equal(store.state.products[0].stock, 5);
  assert.equal(store.state.revision, 1);
  assert.equal(store.guardados, 1);
  assert.equal(store.state.activity.length, 1);
  assert.equal(store.state.activity[0].description, 'El cliente canceló el pedido WS-2.');
  // Ya cancelado, no se puede cambiar ni cancelar otra vez: el stock no se devuelve dos veces.
  assert.throws(() => pedidos.requireModifiableOrder('WS-2', invitado), { code: 'ORDER_NOT_MODIFIABLE' });
  assert.equal(store.state.products[0].stock, 5);
});

test('cambiar la fecha de entrega solo mueve la fecha', () => {
  const { pedidos } = crear();
  const orden = pedidos.requireModifiableOrder('WS-2', invitado);
  const cambiado = pedidos.modify(orden, 'delivery-date', { deliveryDate: '2031-05-20' });
  assert.equal(cambiado.deliveryDate, '2031-05-20');
  assert.equal(cambiado.total, 212);
  assert.equal(cambiado.status, 'confirmed');
});
