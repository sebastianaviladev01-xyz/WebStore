/**
 * Notificaciones del Admin (lote 07b, ADR-0017, PBI-0033; confirmadas por Daniel el 2026-11-18): los pedidos nuevos
 * (estado «confirmado») creados desde la última vez que la persona abrió el menú de la campana. «Visto» se recuerda
 * por usuario. Lote 13 (ADR-0021, PBI-0173; confirmado por Sebastián Avila): también los reclamos nuevos (estado
 * «recibido») y los errores de compra, cada tipo para el rol que lo gestiona.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_AVISOS_EN_NOTIFICACIONES,
  conVisto,
  notificacionesDe,
  puedeVerNotificaciones,
  vistoDe,
} from '../../../../src/domain/admin/notificaciones.rules.mjs';

const pedido = (id, createdAt, status = 'confirmed') => ({
  id,
  createdAt,
  status,
  subtotal: 90,
  total: 100,
  customer: { fullName: `Cliente ${id}`, email: 'privado@example.com', phone: '999' },
});
const reclamo = (id, createdAt, status = 'received', type = 'reclamo') => ({
  id,
  createdAt,
  status,
  type,
  name: 'Persona Privada',
  email: 'privado@example.com',
  detail: 'Detalle privado',
});
const errorDeCompra = (id, at, code = 'INSUFFICIENT_STOCK', productId = 'p-1') => ({
  id,
  at,
  code,
  productId,
  attempt: 'h:clave',
});

const estado = (cambios = {}) => ({
  orders: [
    pedido('WS-3', '2026-11-15T12:00:00.000Z'),
    pedido('WS-2', '2026-11-15T11:00:00.000Z', 'shipped'),
    pedido('WS-1', '2026-11-15T10:00:00.000Z'),
  ],
  complaints: [],
  checkoutErrors: [],
  products: [{ id: 'p-1', name: 'Audífonos' }],
  ...cambios,
});

test('PBI-0033: sin «visto», todos los pedidos confirmados son nuevos, del más reciente al más antiguo', () => {
  const vista = notificacionesDe(estado(), 'vendedor', null);
  assert.equal(vista.total, 2);
  assert.deepEqual(
    vista.items.map((item) => item.id),
    ['WS-3', 'WS-1'],
  );
  assert.deepEqual(vista.items[0], {
    type: 'order',
    id: 'WS-3',
    at: '2026-11-15T12:00:00.000Z',
    customer: 'Cliente WS-3',
    total: 100,
  });
  assert.deepEqual(vista.counts, { orders: 2, complaints: 0, checkoutErrors: 0 });
  assert.equal(vista.seenAt, null);
});

test('PBI-0033: con «visto», solo cuentan los confirmados creados después', () => {
  const vista = notificacionesDe(estado(), 'admin', '2026-11-15T10:00:00.000Z');
  assert.deepEqual(
    vista.items.map((item) => item.id),
    ['WS-3'],
  );
  assert.equal(notificacionesDe(estado(), 'admin', '2026-11-15T12:00:00.000Z').total, 0);
});

test('PBI-0173: los reclamos nuevos son los «recibidos» después de lo visto, sin datos de quien reclama', () => {
  const vista = notificacionesDe(
    estado({
      orders: [],
      complaints: [
        reclamo('RC-2026-000003', '2026-11-15T13:00:00.000Z', 'received', 'queja'),
        reclamo('RC-2026-000002', '2026-11-15T12:30:00.000Z', 'in-review'),
        reclamo('RC-2026-000001', '2026-11-15T09:00:00.000Z'),
      ],
    }),
    'admin',
    '2026-11-15T10:00:00.000Z',
  );
  assert.deepEqual(vista.items, [
    {
      type: 'complaint',
      id: 'RC-2026-000003',
      at: '2026-11-15T13:00:00.000Z',
      complaintType: 'queja',
    },
  ]);
  assert.deepEqual(vista.counts, { orders: 0, complaints: 1, checkoutErrors: 0 });
  assert.ok(!JSON.stringify(vista).includes('privado'));
});

test('PBI-0173: los errores de compra traen su código y el nombre del producto, si sigue en el catálogo', () => {
  const vista = notificacionesDe(
    estado({
      orders: [],
      checkoutErrors: [
        errorDeCompra('e-3', '2026-11-15T14:00:00.000Z', 'ORDER_TOTAL_CHANGED', null),
        errorDeCompra('e-2', '2026-11-15T13:00:00.000Z', 'PRODUCT_UNAVAILABLE', 'p-borrado'),
        errorDeCompra('e-1', '2026-11-15T12:00:00.000Z'),
      ],
    }),
    'superadmin',
    null,
  );
  assert.deepEqual(vista.items, [
    {
      type: 'checkout-error',
      id: 'e-3',
      at: '2026-11-15T14:00:00.000Z',
      code: 'ORDER_TOTAL_CHANGED',
      product: null,
    },
    {
      type: 'checkout-error',
      id: 'e-2',
      at: '2026-11-15T13:00:00.000Z',
      code: 'PRODUCT_UNAVAILABLE',
      product: null,
    },
    {
      type: 'checkout-error',
      id: 'e-1',
      at: '2026-11-15T12:00:00.000Z',
      code: 'INSUFFICIENT_STOCK',
      product: 'Audífonos',
    },
  ]);
  assert.ok(!JSON.stringify(vista).includes('attempt'), 'la clave del intento no sale del BFF');
});

test('PBI-0173: cada rol ve los avisos de lo que gestiona, mezclados del más reciente al más antiguo', () => {
  const todo = estado({
    orders: [pedido('WS-1', '2026-11-15T10:00:00.000Z')],
    complaints: [reclamo('RC-2026-000001', '2026-11-15T12:00:00.000Z')],
    checkoutErrors: [errorDeCompra('e-1', '2026-11-15T11:00:00.000Z')],
  });
  const tipos = (rol) => notificacionesDe(todo, rol, null).items.map((item) => item.type);
  assert.deepEqual(tipos('superadmin'), ['complaint', 'checkout-error', 'order']);
  assert.deepEqual(tipos('admin'), ['complaint', 'checkout-error', 'order']);
  assert.deepEqual(
    tipos('vendedor'),
    ['order'],
    'el vendedor ve pedidos, pero no gestiona reclamos ni pedidos',
  );
  assert.deepEqual(notificacionesDe(todo, 'vendedor', null).counts, {
    orders: 1,
    complaints: 0,
    checkoutErrors: 0,
  });
  assert.equal(puedeVerNotificaciones('vendedor'), true);
  assert.equal(puedeVerNotificaciones('otro'), false);
});

test('PBI-0033 y PBI-0173: el menú lista como mucho 20 avisos, pero el total los cuenta todos', () => {
  const muchos = Array.from({ length: 25 }, (_, n) =>
    pedido(`WS-${n}`, new Date(Date.UTC(2026, 10, 15, 0, n)).toISOString()),
  );
  const vista = notificacionesDe(estado({ orders: muchos }), 'admin', null);
  assert.equal(MAX_AVISOS_EN_NOTIFICACIONES, 20);
  assert.equal(vista.total, 25);
  assert.equal(vista.items.length, 20);
  assert.equal(vista.items[0].id, 'WS-24');
});

test('PBI-0033: «visto» se guarda por usuario, nunca retrocede ni pasa de ahora', () => {
  const ahora = '2026-11-15T12:30:00.000Z';
  let vistos = conVisto([], 'u-1', '2026-11-15T11:00:00.000Z', ahora);
  vistos = conVisto(vistos, 'u-2', '2026-11-15T12:00:00.000Z', ahora);
  assert.equal(vistoDe(vistos, 'u-1'), '2026-11-15T11:00:00.000Z');
  assert.equal(vistoDe(vistos, 'u-3'), null);
  vistos = conVisto(vistos, 'u-1', '2026-11-15T09:00:00.000Z', ahora);
  assert.equal(vistoDe(vistos, 'u-1'), '2026-11-15T11:00:00.000Z', 'no retrocede');
  vistos = conVisto(vistos, 'u-1', '2030-01-01T00:00:00.000Z', ahora);
  assert.equal(vistoDe(vistos, 'u-1'), ahora, 'no pasa de ahora');
  assert.equal(vistos.length, 2);
});

test('PBI-0033: «hasta» debe ser una fecha ISO válida', () => {
  for (const malo of [undefined, '', 'ayer', 12, '2026-13-45T00:00:00Z'])
    assert.throws(
      () => conVisto([], 'u-1', malo, '2026-11-15T12:30:00.000Z'),
      (error) => error.code === 'INVALID_SEEN_AT' && error.kind === 'validation',
    );
});
