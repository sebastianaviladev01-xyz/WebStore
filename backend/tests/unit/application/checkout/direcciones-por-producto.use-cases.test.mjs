/**
 * Una dirección por pedido o una por producto en el checkout, el pedido y el Admin (lote 19, ADR-0021, PBI-0006;
 * confirmado por Sebastián Avila), con un almacén en memoria y el reloj fijo:
 *
 * - La configuración guarda `deliveryAddressMode` (`per-order` por defecto, o `per-product`) y la publica.
 * - Con `per-product`, cada línea puede llevar su dirección: el pedido la guarda en la línea, `shipping` sigue siendo
 *   la principal, y el envío se cobra una vez por destino distinto, con la misma comparación del total y la misma
 *   idempotencia de siempre.
 * - Con `per-order`, una línea con dirección se rechaza con `PER_PRODUCT_ADDRESS_DISABLED`, sin crear nada.
 * - Cambiar la dirección principal recalcula el envío con las direcciones de las líneas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminSnapshot } from '../../../../src/application/admin/admin.views.mjs';
import { createSnapshotUseCases } from '../../../../src/application/admin/snapshot.use-cases.mjs';
import { createCheckoutUseCases } from '../../../../src/application/checkout/checkout.use-cases.mjs';
import { createContenidoQueries } from '../../../../src/application/contenido/contenido.queries.mjs';
import { createPedidosUseCases } from '../../../../src/application/pedidos/pedidos.use-cases.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

let secuencia = 0;
const security = {
  digest: (valor) => `h:${valor}`,
  createToken: () => `t${++secuencia}`,
  newId: () => `id${++secuencia}`,
  hashPassword: (password) => ({ salt: 's', hash: `h:${password}` }),
};

const AHORA = new Date('2026-11-23T15:00:00.000Z');

function crearAlmacen(deliveryAddressMode = 'per-product') {
  return {
    state: {
      revision: 0,
      config: { firstDeliveryDay: 'next-calendar-day', deliveryCutoffTime: '', deliveryAddressMode },
      nonWorkingDates: [],
      termsVersions: [{ version: 1, publishedAt: null, content: 'Términos' }],
      products: [
        { id: 'p-1', name: 'Uno', price: 100, stock: 5, active: true, brandId: 'b', categoryId: 'c' },
        { id: 'p-2', name: 'Dos', price: 50, stock: 5, active: true, brandId: 'b', categoryId: 'c' },
      ],
      brands: [],
      categories: [],
      rates: [
        { id: 'r-1', origin: 'Lima Centro', destination: 'San Isidro', price: 12 },
        { id: 'r-2', origin: 'Lima Centro', destination: 'Miraflores', price: 10 },
      ],
      orders: [],
      customers: [],
      accounts: [],
      accountSessions: [],
      complaints: [],
    },
    save() {},
  };
}

const principal = {
  addressLine: 'Av Demo 123',
  district: 'San Isidro',
  province: 'Lima',
  department: 'Lima',
};
const otra = {
  addressLine: 'Calle Regalo 456',
  district: 'Miraflores',
  province: 'Lima',
  department: 'Lima',
};

const pedido = (cambios = {}) => ({
  customer: { fullName: 'Ana Pérez', email: 'ana@example.com', phone: '999999999', document: '12345678' },
  shipping: principal,
  deliveryDate: '2026-12-01',
  paymentMethod: 'card',
  items: [
    { productId: 'p-1', quantity: 1 },
    { productId: 'p-2', quantity: 2, shipping: otra },
  ],
  termsAccepted: true,
  termsVersion: 1,
  ...cambios,
});

const checkout = (store) => createCheckoutUseCases({ store, security, now: () => AHORA });

test('la semilla y los ajustes públicos traen una dirección por pedido', () => {
  assert.equal(seed.config.deliveryAddressMode, 'per-order');
  const store = { state: structuredClone(seed) };
  assert.equal(createContenidoQueries({ store }).getSettings().deliveryAddressMode, 'per-order');
});

test('con una por producto, la línea guarda su dirección y el envío se cobra por destino distinto', () => {
  const store = crearAlmacen();
  const creado = checkout(store).placeOrder(pedido(), '');
  assert.deepEqual(creado.shipping, principal);
  assert.equal(creado.items[0].shipping, undefined);
  assert.deepEqual(creado.items[1].shipping, otra);
  assert.equal(creado.shippingCost, 22);
  assert.equal(creado.subtotal, 200);
  assert.equal(creado.total, 222);
  assert.equal(creado.shippingOrigin, 'Lima Centro');
  assert.deepEqual(store.state.orders[0].items[1].shipping, otra);
});

test('una línea con la misma dirección que la principal, o dos con la misma, no cobran otro envío', () => {
  const store = crearAlmacen();
  const creado = checkout(store).placeOrder(
    pedido({
      items: [
        { productId: 'p-1', quantity: 1, shipping: { ...principal, addressLine: 'av demo 123' } },
        { productId: 'p-2', quantity: 1 },
      ],
    }),
    '',
  );
  assert.equal(creado.shippingCost, 12);
  assert.equal(creado.items[0].shipping, undefined);
  const dosIguales = checkout(crearAlmacen()).placeOrder(
    pedido({
      items: [
        { productId: 'p-1', quantity: 1, shipping: otra },
        { productId: 'p-2', quantity: 1, shipping: otra },
      ],
    }),
    '',
  );
  // Las dos van a Miraflores: la principal no es un destino.
  assert.equal(dosIguales.shippingCost, 10);
});

test('el total que vio el comprador se compara con el envío de todos los destinos', () => {
  const store = crearAlmacen();
  assert.throws(
    () => checkout(store).placeOrder(pedido({ total: 212 }), ''),
    (error) =>
      error.code === 'ORDER_TOTAL_CHANGED' &&
      error.details.shippingCost === 22 &&
      error.details.total === 222,
  );
  assert.equal(store.state.orders.length, 0);
  assert.equal(checkout(store).placeOrder(pedido({ total: 222 }), '').total, 222);
});

test('la misma clave de idempotencia devuelve el mismo pedido sin crear otro', () => {
  const store = crearAlmacen();
  const casos = checkout(store);
  const clave = 'clave-del-intento-0001';
  const primero = casos.placeOrder(pedido(), '', clave);
  const repetido = casos.replay(clave);
  assert.equal(repetido.id, primero.id);
  assert.deepEqual(repetido.items[1].shipping, otra);
  assert.equal(store.state.orders.length, 1);
});

test('con una por pedido, una dirección en una línea se rechaza sin crear nada ni tocar el stock', () => {
  const store = crearAlmacen('per-order');
  assert.throws(
    () => checkout(store).placeOrder(pedido(), ''),
    (error) => error.code === 'PER_PRODUCT_ADDRESS_DISABLED' && error.kind === 'conflict',
  );
  assert.equal(store.state.orders.length, 0);
  assert.equal(store.state.products[1].stock, 5);
  // Sin direcciones en las líneas, el pedido es el de siempre.
  const creado = checkout(store).placeOrder(pedido({ items: [{ productId: 'p-1', quantity: 1 }] }), '');
  assert.equal(creado.shippingCost, 12);
  assert.equal(creado.total, 112);
});

test('una tienda sin el campo cuenta como una por pedido', () => {
  const store = crearAlmacen();
  delete store.state.config.deliveryAddressMode;
  assert.throws(() => checkout(store).placeOrder(pedido(), ''), { code: 'PER_PRODUCT_ADDRESS_DISABLED' });
});

test('una dirección de línea sin tarifa responde SHIPPING_UNAVAILABLE', () => {
  const store = crearAlmacen();
  assert.throws(
    () =>
      checkout(store).placeOrder(
        pedido({ items: [{ productId: 'p-1', quantity: 1, shipping: { ...otra, district: 'Barranco' } }] }),
        '',
      ),
    { code: 'SHIPPING_UNAVAILABLE' },
  );
  assert.equal(store.state.orders.length, 0);
});

test('cambiar la dirección principal recalcula el envío con las direcciones de las líneas', () => {
  const store = crearAlmacen();
  const creado = checkout(store).placeOrder(pedido(), '');
  const pedidos = createPedidosUseCases({ store, security, now: () => AHORA });
  const orden = pedidos.requireModifiableOrder(creado.id, {
    bearerToken: '',
    orderToken: creado.accessToken,
  });
  // La principal pasa a Miraflores, la misma dirección de la línea: queda un solo destino.
  const cambiado = pedidos.modify(orden, 'shipping', { shipping: otra });
  assert.deepEqual(cambiado.shipping, otra);
  assert.deepEqual(cambiado.items[1].shipping, otra);
  assert.equal(cambiado.shippingCost, 10);
  assert.equal(cambiado.total, 210);
});

test('el Admin ve la dirección de cada línea que la tiene; los pedidos antiguos se ven igual', () => {
  const store = crearAlmacen();
  checkout(store).placeOrder(pedido(), '');
  store.state.orders.push({
    id: 'WS-00000001',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'delivered',
    customer: { fullName: 'Antes', email: 'a@example.com', phone: '9', document: '1' },
    shipping: principal,
    items: [{ productId: 'p-1', quantity: 1, product: { id: 'p-1', name: 'Uno', price: 100 } }],
    total: 112,
  });
  store.state.users = [];
  const vista = buildAdminSnapshot(store.state, 'superadmin');
  const [nuevo, antiguo] = vista.orders;
  assert.equal(nuevo.items[0].shipping, null);
  assert.deepEqual(nuevo.items[1].shipping, otra);
  assert.deepEqual(antiguo.items[0], {
    productId: 'p-1',
    name: 'Uno',
    quantity: 1,
    unitPrice: 100,
    shipping: null,
  });
});

test('la configuración guarda el modo de dirección y rechaza uno desconocido', () => {
  const store = {
    state: {
      ...structuredClone(seed),
      revision: 1,
      adminCredentials: [],
      adminSessions: [],
      complaints: [],
      orders: [],
      nonWorkingDates: [],
      termsVersions: [{ version: 1, publishedAt: null, content: seed.config.termsContent }],
    },
    save() {},
  };
  const casos = createSnapshotUseCases({ store, security, now: () => AHORA });
  const superadmin = { id: 'u-1', role: 'superadmin' };
  const vista = casos.save(superadmin, { revision: 1, config: { deliveryAddressMode: 'per-product' } });
  assert.equal(vista.config.deliveryAddressMode, 'per-product');
  for (const valor of ['per-line', true, ''])
    assert.throws(
      () =>
        casos.save(superadmin, { revision: store.state.revision, config: { deliveryAddressMode: valor } }),
      (error) =>
        error.code === 'INVALID_COLLECTION' &&
        error.details.collection === 'config' &&
        error.details.field === 'deliveryAddressMode',
      String(valor),
    );
});
