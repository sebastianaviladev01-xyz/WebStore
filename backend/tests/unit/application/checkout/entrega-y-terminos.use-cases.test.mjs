/**
 * Lote 17 (ADR-0021; confirmado por Sebastián Avila), con un almacén en memoria y el reloj fijo:
 *
 * - PBI-0178: la primera fecha de entrega sale de la configuración de la tienda y de los días no laborables; el
 *   checkout y el cambio de fecha del pedido rechazan una anterior, y la tienda la consulta.
 * - PBI-0177: el pedido guarda la versión de los términos aceptada, y la fecha y hora con segundos.
 * - PBI-0183: el plazo de los reclamos cuenta con los días no laborables del estado.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createCheckoutUseCases } from '../../../../src/application/checkout/checkout.use-cases.mjs';
import { createPedidosUseCases } from '../../../../src/application/pedidos/pedidos.use-cases.mjs';
import { createReclamosUseCases } from '../../../../src/application/reclamos/reclamos.use-cases.mjs';

let secuencia = 0;
const security = {
  digest: (valor) => `h:${valor}`,
  createToken: () => `t${++secuencia}`,
  newId: () => `id${++secuencia}`,
};

/** Instante de una hora de Lima (UTC−5). */
const lima = (local) => new Date(`${local}-05:00`);

function crearAlmacen(config = {}, nonWorkingDates = []) {
  return {
    state: {
      revision: 0,
      config: { firstDeliveryDay: 'next-calendar-day', deliveryCutoffTime: '', ...config },
      nonWorkingDates,
      termsVersions: [
        { version: 1, publishedAt: null, content: 'Términos 1' },
        { version: 2, publishedAt: '2026-11-20T15:00:00.000Z', content: 'Términos 2' },
      ],
      products: [
        { id: 'p-1', name: 'Uno', price: 100, stock: 5, active: true, brandId: 'b', categoryId: 'c' },
      ],
      brands: [],
      categories: [],
      rates: [{ id: 'r', origin: 'Lima Centro', destination: 'San Isidro', price: 12 }],
      orders: [],
      customers: [],
      accounts: [],
      accountSessions: [],
      complaints: [],
    },
    save() {},
  };
}

const pedido = (cambios = {}) => ({
  customer: { fullName: 'Ana Pérez', email: 'ana@example.com', phone: '999999999', document: '12345678' },
  shipping: { addressLine: 'Av Demo 123', district: 'San Isidro', province: 'Lima', department: 'Lima' },
  deliveryDate: '2026-12-01',
  paymentMethod: 'card',
  items: [{ productId: 'p-1', quantity: 1 }],
  termsAccepted: true,
  termsVersion: 2,
  ...cambios,
});

const checkoutA = (store, local) => createCheckoutUseCases({ store, security, now: () => lima(local) });

test('la tienda consulta la primera fecha de entrega: por defecto, el día calendario siguiente en Lima', () => {
  assert.deepEqual(checkoutA(crearAlmacen(), '2026-11-23T23:59:59').firstDeliveryDate(), {
    minimum: '2026-11-24',
  });
  assert.deepEqual(checkoutA(crearAlmacen(), '2026-11-24T00:00:00').firstDeliveryDate(), {
    minimum: '2026-11-25',
  });
});

test('con el siguiente día hábil y hora de corte, la primera fecha salta el fin de semana y los feriados', () => {
  const store = crearAlmacen({ firstDeliveryDay: 'next-business-day', deliveryCutoffTime: '14:00' }, [
    { id: 'f', date: '2026-11-30', name: 'Feriado de prueba' },
  ]);
  assert.deepEqual(checkoutA(store, '2026-11-27T13:00:00').firstDeliveryDate(), { minimum: '2026-12-01' });
  assert.deepEqual(checkoutA(store, '2026-11-27T14:00:00').firstDeliveryDate(), { minimum: '2026-12-02' });
});

test('el checkout rechaza una fecha anterior a la primera con INVALID_DELIVERY_DATE y la primera en details', () => {
  const store = crearAlmacen();
  assert.throws(
    () => checkoutA(store, '2026-11-23T10:00:00').placeOrder(pedido({ deliveryDate: '2026-11-23' }), ''),
    (error) =>
      error.code === 'INVALID_DELIVERY_DATE' &&
      error.details.minimum === '2026-11-24' &&
      /24\/11\/2026/.test(error.message),
  );
  assert.equal(store.state.orders.length, 0);
  assert.equal(
    checkoutA(store, '2026-11-23T10:00:00').placeOrder(pedido({ deliveryDate: '2026-11-24' }), '')
      .deliveryDate,
    '2026-11-24',
  );
});

test('con el mismo día, hoy se acepta hasta la hora de corte', () => {
  const store = crearAlmacen({ firstDeliveryDay: 'same-day', deliveryCutoffTime: '12:00' });
  assert.equal(
    checkoutA(store, '2026-11-23T11:59:00').placeOrder(pedido({ deliveryDate: '2026-11-23' }), '')
      .deliveryDate,
    '2026-11-23',
  );
  assert.throws(
    () => checkoutA(store, '2026-11-23T12:00:00').placeOrder(pedido({ deliveryDate: '2026-11-23' }), ''),
    { code: 'INVALID_DELIVERY_DATE' },
  );
});

test('el pedido guarda la versión de los términos aceptada y la fecha y hora con segundos', () => {
  const store = crearAlmacen();
  const creado = checkoutA(store, '2026-11-23T10:15:42').placeOrder(pedido(), '');
  assert.equal(creado.termsVersion, 2);
  assert.equal(creado.termsAcceptedAt, '2026-11-23T15:15:42.000Z');
  assert.equal(creado.createdAt, creado.termsAcceptedAt);
  assert.equal(store.state.orders[0].termsVersion, 2);
});

test('una versión de los términos que ya no es la vigente responde TERMS_VERSION_CHANGED y no crea nada', () => {
  const store = crearAlmacen();
  assert.throws(
    () => checkoutA(store, '2026-11-23T10:00:00').placeOrder(pedido({ termsVersion: 1 }), ''),
    (error) => error.code === 'TERMS_VERSION_CHANGED' && error.details.termsVersion === 2,
  );
  assert.throws(
    () => checkoutA(store, '2026-11-23T10:00:00').placeOrder(pedido({ termsVersion: undefined }), ''),
    { code: 'INVALID_TERMS_VERSION' },
  );
  assert.equal(store.state.orders.length, 0);
  assert.equal(store.state.products[0].stock, 5);
  assert.equal(store.state.checkoutErrors, undefined, 'no es un error de compra para la campana');
});

test('sin aceptar los términos, TERMS_NOT_ACCEPTED se comprueba antes que la versión', () => {
  assert.throws(
    () =>
      checkoutA(crearAlmacen(), '2026-11-23T10:00:00').placeOrder(
        pedido({ termsAccepted: false, termsVersion: 1 }),
        '',
      ),
    { code: 'TERMS_NOT_ACCEPTED' },
  );
});

test('cambiar la fecha de un pedido sigue la misma regla; reenviar la que ya tiene se acepta', () => {
  const store = crearAlmacen({ firstDeliveryDay: 'next-business-day' });
  const creado = checkoutA(store, '2026-11-27T09:00:00').placeOrder(
    pedido({ deliveryDate: '2026-11-30' }),
    '',
  );
  const pedidos = createPedidosUseCases({ store, security, now: () => lima('2026-11-27T10:00:00') });
  const orden = pedidos.requireModifiableOrder(creado.id, {
    bearerToken: '',
    orderToken: creado.accessToken,
  });
  assert.throws(() => pedidos.modify(orden, 'delivery-date', { deliveryDate: '2026-11-28' }), {
    code: 'INVALID_DELIVERY_DATE',
    details: { minimum: '2026-11-30' },
  });
  assert.equal(
    pedidos.modify(orden, 'delivery-date', { deliveryDate: '2026-11-30' }).deliveryDate,
    '2026-11-30',
  );
  assert.equal(
    pedidos.modify(orden, 'delivery-date', { deliveryDate: '2026-12-03' }).deliveryDate,
    '2026-12-03',
  );
  // Ya pasó la primera fecha de hoy (la del pedido es anterior): reenviarla sigue valiendo.
  orden.deliveryDate = '2026-11-20';
  assert.equal(
    pedidos.modify(orden, 'delivery-date', { deliveryDate: '2026-11-20' }).deliveryDate,
    '2026-11-20',
  );
});

test('el plazo de los reclamos cuenta con los días no laborables del estado, no con los del arranque', () => {
  const store = crearAlmacen();
  const reclamar = () =>
    createReclamosUseCases({ store, now: () => lima('2026-12-01T10:00:00') }).register({
      name: 'Ana',
      document: '12345678',
      email: 'ana@example.com',
      phone: '999',
      address: 'Av',
      subject: 'S',
      type: 'reclamo',
      detail: 'D',
      request: 'R',
    });
  const sinFeriados = reclamar().dueAt;
  store.state.nonWorkingDates = [{ id: 'f', date: '2026-12-08', name: 'Inmaculada Concepción' }];
  const conFeriado = reclamar().dueAt;
  // 15 días hábiles desde el martes 1 de diciembre: el 22; con el 8 feriado, el 23.
  assert.equal(sinFeriados, '2026-12-23T04:59:59.999Z');
  assert.equal(conFeriado, '2026-12-24T04:59:59.999Z');
});
