/**
 * Qué pedidos puede cambiar o cancelar el cliente (PBI-0094, lote 01, ADR-0017): dentro de las 24 horas y solo
 * si el pedido no se envió, no se entregó y no se canceló. Lote 02 (PBI-0102): el límite exacto de las 24 horas,
 * el cambio de estado con su stock y quién es dueño del pedido.
 */
import { afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  canModify,
  changeOrderStatus,
  igvIncluded,
  IGV_RATE,
  isOrderOpen,
  nextOrderId,
  orderAmounts,
  ORDER_MODIFICATION_WINDOW_MS,
  orderBelongsTo,
  roundMoney,
  withinModificationWindow,
} from '../../../../src/domain/pedidos/pedido.rules.mjs';

afterEach(() => mock.timers.reset());

const haceUnaHora = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();
const fueraDeLaVentana = () => new Date(Date.now() - ORDER_MODIFICATION_WINDOW_MS - 60_000).toISOString();

for (const status of ['confirmed', 'processing'])
  test(`un pedido ${status} dentro de las 24 horas se puede cambiar`, () => {
    assert.equal(canModify({ status, createdAt: haceUnaHora() }), true);
  });

for (const status of ['shipped', 'delivered', 'cancelled'])
  test(`un pedido ${status} no se puede cambiar aunque siga dentro de las 24 horas`, () => {
    assert.equal(canModify({ status, createdAt: haceUnaHora() }), false);
  });

test('un pedido confirmado fuera de las 24 horas no se puede cambiar', () => {
  assert.equal(canModify({ status: 'confirmed', createdAt: fueraDeLaVentana() }), false);
});

test('la ventana de 24 horas incluye el instante exacto y termina un milisegundo después', () => {
  const compra = Date.parse('2026-11-10T15:00:00.000Z');
  const pedido = { status: 'confirmed', createdAt: new Date(compra).toISOString() };
  mock.timers.enable({ apis: ['Date'], now: compra + ORDER_MODIFICATION_WINDOW_MS });
  assert.equal(withinModificationWindow(pedido), true);
  assert.equal(canModify(pedido), true);
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now: compra + ORDER_MODIFICATION_WINDOW_MS + 1 });
  assert.equal(withinModificationWindow(pedido), false);
  assert.equal(canModify(pedido), false);
});

test('un pedido sin enviar ni cancelar está abierto; uno enviado, entregado o cancelado, no', () => {
  for (const status of ['confirmed', 'processing']) assert.equal(isOrderOpen({ status }), true, status);
  for (const status of ['shipped', 'delivered', 'cancelled'])
    assert.equal(isOrderOpen({ status }), false, status);
});

const producto = (id, stock) => ({ id, stock, active: true });
const pedidoConLineas = (status = 'confirmed') => ({
  id: 'WS-1',
  status,
  updatedAt: '2026-01-01T00:00:00.000Z',
  items: [
    { productId: 'p-1', quantity: 2 },
    { product: { id: 'p-2' }, quantity: 1 },
  ],
});
const stocks = (lista) => lista.map((item) => [item.id, item.stock]);

test('cancelar un pedido devuelve el stock de todas sus líneas y registra la fecha del cambio', () => {
  const pedido = pedidoConLineas();
  const despues = changeOrderStatus(pedido, 'cancelled', [producto('p-1', 3), producto('p-2', 0)]);
  assert.deepEqual(stocks(despues), [
    ['p-1', 5],
    ['p-2', 1],
  ]);
  assert.equal(pedido.status, 'cancelled');
  assert.notEqual(pedido.updatedAt, '2026-01-01T00:00:00.000Z');
});

test('reactivar un pedido cancelado vuelve a reservar su stock', () => {
  const pedido = pedidoConLineas('cancelled');
  const despues = changeOrderStatus(pedido, 'processing', [producto('p-1', 5), producto('p-2', 1)]);
  assert.deepEqual(stocks(despues), [
    ['p-1', 3],
    ['p-2', 0],
  ]);
  assert.equal(pedido.status, 'processing');
});

test('reactivar un pedido cancelado sin stock suficiente falla y lo deja cancelado', () => {
  const pedido = pedidoConLineas('cancelled');
  assert.throws(() => changeOrderStatus(pedido, 'confirmed', [producto('p-1', 1), producto('p-2', 1)]), {
    code: 'INSUFFICIENT_STOCK',
  });
  assert.equal(pedido.status, 'cancelled');
  assert.equal(pedido.updatedAt, '2026-01-01T00:00:00.000Z');
});

test('los demás cambios de estado no tocan el stock', () => {
  const productos = [producto('p-1', 3), producto('p-2', 3)];
  for (const [desde, hacia] of [
    ['confirmed', 'processing'],
    ['processing', 'shipped'],
    ['shipped', 'delivered'],
  ]) {
    const pedido = pedidoConLineas(desde);
    assert.equal(changeOrderStatus(pedido, hacia, productos), productos, `${desde} → ${hacia}`);
    assert.equal(pedido.status, hacia);
  }
});

test('repetir el estado actual no cambia nada, ni siquiera la fecha de actualización', () => {
  const pedido = pedidoConLineas('cancelled');
  const productos = [producto('p-1', 3), producto('p-2', 3)];
  assert.equal(changeOrderStatus(pedido, 'cancelled', productos), productos);
  assert.equal(pedido.updatedAt, '2026-01-01T00:00:00.000Z');
});

const cuenta = (id, verified, email = 'ana@example.com') => ({ id, verified, email });

test('el pedido es de la cuenta que lo hizo o de la cuenta verificada con el mismo correo', () => {
  const pedido = { accountId: 'a-1', customer: { email: 'Ana@Example.com ' } };
  assert.equal(orderBelongsTo(pedido, cuenta('a-1', false, 'otra@example.com')), true);
  // El correo del pedido se compara normalizado (sin mayúsculas ni espacios en los extremos).
  assert.equal(orderBelongsTo(pedido, cuenta('a-2', true)), true);
  assert.equal(orderBelongsTo({ customer: { email: 'ana@example.com' } }, cuenta('a-2', true)), true);
});

test('una cuenta sin verificar no hereda los pedidos de invitado de su correo, ni la de otro correo', () => {
  const invitado = { customer: { email: 'ana@example.com' } };
  assert.equal(orderBelongsTo(invitado, cuenta('a-2', false)), false);
  assert.equal(orderBelongsTo(invitado, cuenta('a-2', true, 'otra@example.com')), false);
  assert.equal(
    orderBelongsTo({ accountId: 'a-1', customer: { email: 'x@example.com' } }, cuenta('a-2', true)),
    false,
  );
});

test('roundMoney redondea a céntimos', () => {
  assert.equal(roundMoney(10.126), 10.13);
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(112), 112);
  assert.equal(roundMoney(0), 0);
});

// Lote 02 (PBI-0103): el código del pedido, el IGV y los montos.

test('el código del pedido es WS- y ocho dígitos tomados del reloj', () => {
  assert.equal(nextOrderId([], 1_794_000_123_456), 'WS-00123456');
  assert.equal(nextOrderId([], 1_794_067_890_123), 'WS-67890123');
});

test('el código no repite uno ya emitido: si el del reloj está tomado, toma el siguiente libre', () => {
  const ocupados = ['WS-00123456', 'WS-00123457', 'WS-00123458', 'WS-99999999'];
  assert.equal(nextOrderId(ocupados, 1_794_000_123_456), 'WS-00123459');
  // Al llegar al final de los ocho dígitos, vuelve al principio.
  assert.equal(nextOrderId(['WS-99999999'], 1_794_099_999_999), 'WS-00000000');
});

test('dos pedidos en el mismo milisegundo reciben códigos distintos', () => {
  const emitidos = [];
  for (let i = 0; i < 40; i++) emitidos.push(nextOrderId(emitidos, 1_794_000_123_456));
  assert.equal(new Set(emitidos).size, 40);
  for (const id of emitidos) assert.match(id, /^WS-\d{8}$/);
});

test('el código ignora los identificadores de pedidos que no tienen su forma', () => {
  assert.equal(nextOrderId(['WS-1', 'otro', null, undefined], 1_794_000_000_001), 'WS-00000001');
});

test('el IGV es del 18 % y los precios lo incluyen', () => {
  assert.equal(IGV_RATE, 0.18);
  assert.equal(igvIncluded(118), 18);
  assert.equal(igvIncluded(100), 15.25);
  assert.equal(igvIncluded(350), 53.39);
  assert.equal(igvIncluded(59.97), 9.15);
  assert.equal(igvIncluded(0), 0);
});

test('los montos del pedido: el IGV sale del subtotal y el envío se suma aparte', () => {
  assert.deepEqual(orderAmounts(100, 12), { subtotal: 100, igv: 15.25, shippingCost: 12, total: 112 });
  assert.deepEqual(orderAmounts(350, 0), { subtotal: 350, igv: 53.39, shippingCost: 0, total: 350 });
  assert.deepEqual(orderAmounts(59.97, 9.5), { subtotal: 59.97, igv: 9.15, shippingCost: 9.5, total: 69.47 });
});
