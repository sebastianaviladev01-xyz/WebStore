/**
 * Validación del checkout y de los cambios del pedido (PBI-0096, parte del BFF; lote 01, ADR-0017), con un
 * almacén en memoria: fecha de entrega desde hoy en Lima, método de pago de los que ofrece la tienda, cantidad
 * entera y positiva, y solo los campos conocidos de `customer` y `shipping`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createCheckoutUseCases } from '../../../../src/application/checkout/checkout.use-cases.mjs';
import { createPedidosUseCases } from '../../../../src/application/pedidos/pedidos.use-cases.mjs';

let secuencia = 0;
const security = {
  digest: (valor) => `h:${valor}`,
  createToken: () => `t${++secuencia}`,
  newId: () => `id${++secuencia}`,
};

function crearAlmacen() {
  return {
    state: {
      revision: 0,
      products: [
        { id: 'p-1', name: 'Uno', price: 100, stock: 5, active: true, brandId: 'b', categoryId: 'c' },
        { id: 'p-2', name: 'Dos', price: 50, stock: 5, active: true, brandId: 'b', categoryId: 'c' },
      ],
      brands: [],
      categories: [],
      rates: [{ id: 'r', origin: 'Lima Centro', destination: 'San Isidro', price: 12 }],
      orders: [],
      customers: [],
      accounts: [],
      accountSessions: [],
    },
    save() {},
  };
}

/** Fecha `AAAA-MM-DD` de Lima desplazada `dias` desde hoy. */
function fechaDeLima(dias) {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const fecha = new Date(`${hoy}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

const pedido = (cambios = {}) => ({
  customer: { fullName: 'Ana Pérez', email: 'ana@example.com', phone: '999999999', document: '12345678' },
  shipping: { addressLine: 'Av Demo 123', district: 'San Isidro', province: 'Lima', department: 'Lima' },
  deliveryDate: fechaDeLima(1),
  paymentMethod: 'card',
  items: [{ productId: 'p-1', quantity: 1 }],
  ...cambios,
});

const comprar = (cambios) =>
  createCheckoutUseCases({ store: crearAlmacen(), security }).placeOrder(pedido(cambios), '');

test('una fecha de entrega pasada, mal formada o ausente responde INVALID_DELIVERY_DATE', () => {
  for (const deliveryDate of [fechaDeLima(-1), '2020-01-05', '05/01/2030', '2030-02-30', '', undefined])
    assert.throws(() => comprar({ deliveryDate }), { code: 'INVALID_DELIVERY_DATE' }, String(deliveryDate));
});

test('la fecha de entrega de hoy en Lima se acepta', () => {
  assert.equal(comprar({ deliveryDate: fechaDeLima(0) }).deliveryDate, fechaDeLima(0));
});

test('un método de pago que la tienda no ofrece responde INVALID_PAYMENT_METHOD', () => {
  for (const paymentMethod of ['bitcoin', '', undefined, 3])
    assert.throws(
      () => comprar({ paymentMethod }),
      { code: 'INVALID_PAYMENT_METHOD' },
      String(paymentMethod),
    );
  for (const paymentMethod of ['card', 'yape-plin', 'transfer'])
    assert.equal(comprar({ paymentMethod }).paymentMethod, paymentMethod);
});

test('una cantidad decimal, cero, negativa o no numérica responde INVALID_ORDER_ITEMS', () => {
  for (const quantity of [1.5, 0, -1, '2', 'x', null])
    assert.throws(
      () => comprar({ items: [{ productId: 'p-1', quantity }] }),
      { code: 'INVALID_ORDER_ITEMS' },
      String(quantity),
    );
});

test('los campos de más de customer y shipping se descartan', () => {
  const resultado = comprar({
    customer: { ...pedido().customer, isAdmin: true, notes: 'x' },
    shipping: { ...pedido().shipping, reference: 'Puerta azul', price: 0, injected: { a: 1 } },
  });
  assert.deepEqual(Object.keys(resultado.customer).sort(), ['document', 'email', 'fullName', 'phone']);
  assert.deepEqual(Object.keys(resultado.shipping).sort(), [
    'addressLine',
    'department',
    'district',
    'province',
    'reference',
  ]);
  assert.equal(resultado.shipping.reference, 'Puerta azul');
});

test('las líneas repetidas del mismo producto quedan como una sola en el pedido', () => {
  const resultado = comprar({
    items: [
      { productId: 'p-1', quantity: 1 },
      { productId: 'p-2', quantity: 1 },
      { product: { id: 'p-1' }, quantity: 2 },
    ],
  });
  assert.deepEqual(
    resultado.items.map((item) => [item.productId, item.quantity]),
    [
      ['p-1', 3],
      ['p-2', 1],
    ],
  );
  assert.equal(resultado.subtotal, 350);
});

test('cambiar la fecha del pedido exige hoy o después, salvo que se conserve la que ya tiene', () => {
  const store = crearAlmacen();
  const creado = createCheckoutUseCases({ store, security }).placeOrder(pedido(), '');
  const pedidos = createPedidosUseCases({ store, security });
  const credenciales = { bearerToken: '', orderToken: creado.accessToken };
  const orden = pedidos.requireModifiableOrder(creado.id, credenciales);
  assert.throws(() => pedidos.modify(orden, 'delivery-date', { deliveryDate: fechaDeLima(-1) }), {
    code: 'INVALID_DELIVERY_DATE',
  });
  // La tienda reenvía la fecha vigente al actualizar la dirección: aunque ya haya pasado, se acepta igual.
  orden.deliveryDate = fechaDeLima(-1);
  assert.equal(
    pedidos.modify(orden, 'delivery-date', { deliveryDate: fechaDeLima(-1) }).deliveryDate,
    fechaDeLima(-1),
  );
  assert.equal(
    pedidos.modify(orden, 'delivery-date', { deliveryDate: fechaDeLima(3) }).deliveryDate,
    fechaDeLima(3),
  );
});

test('cambiar la dirección del pedido también descarta los campos de más', () => {
  const store = crearAlmacen();
  const creado = createCheckoutUseCases({ store, security }).placeOrder(pedido(), '');
  const pedidos = createPedidosUseCases({ store, security });
  const orden = pedidos.requireModifiableOrder(creado.id, {
    bearerToken: '',
    orderToken: creado.accessToken,
  });
  const cambiado = pedidos.modify(orden, 'shipping', {
    shipping: { ...pedido().shipping, total: 0, extra: true },
  });
  assert.deepEqual(Object.keys(cambiado.shipping).sort(), [
    'addressLine',
    'department',
    'district',
    'province',
  ]);
});
