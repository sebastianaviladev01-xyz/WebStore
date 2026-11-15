/**
 * Notificaciones del Admin (lote 07b, ADR-0017, PBI-0033; provisional, por confirmar con Daniel): los pedidos nuevos
 * (estado «confirmado») creados desde la última vez que la persona abrió el menú de la campana. «Visto» se recuerda
 * por usuario.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_PEDIDOS_EN_NOTIFICACIONES,
  conVisto,
  notificacionesDe,
  vistoDe,
} from '../../../../src/domain/admin/notificaciones.rules.mjs';

const pedido = (id, createdAt, status = 'confirmed') => ({
  id,
  createdAt,
  status,
  total: 100,
  customer: { fullName: `Cliente ${id}`, email: 'privado@example.com' },
});
const pedidos = [
  pedido('WS-3', '2026-11-15T12:00:00.000Z'),
  pedido('WS-2', '2026-11-15T11:00:00.000Z', 'shipped'),
  pedido('WS-1', '2026-11-15T10:00:00.000Z'),
];

test('PBI-0033: sin «visto», todos los pedidos confirmados son nuevos, del más reciente al más antiguo', () => {
  const vista = notificacionesDe(pedidos, null);
  assert.equal(vista.total, 2);
  assert.deepEqual(
    vista.orders.map((item) => item.id),
    ['WS-3', 'WS-1'],
  );
  assert.deepEqual(vista.orders[0], {
    id: 'WS-3',
    customer: 'Cliente WS-3',
    total: 100,
    createdAt: '2026-11-15T12:00:00.000Z',
  });
  assert.equal(vista.seenAt, null);
});

test('PBI-0033: con «visto», solo cuentan los confirmados creados después', () => {
  const vista = notificacionesDe(pedidos, '2026-11-15T10:00:00.000Z');
  assert.deepEqual(
    vista.orders.map((item) => item.id),
    ['WS-3'],
  );
  assert.equal(notificacionesDe(pedidos, '2026-11-15T12:00:00.000Z').total, 0);
});

test('PBI-0033: el menú lista como mucho 20 pedidos, pero el total los cuenta todos', () => {
  const muchos = Array.from({ length: 25 }, (_, n) =>
    pedido(`WS-${n}`, new Date(Date.UTC(2026, 10, 15, 0, n)).toISOString()),
  );
  const vista = notificacionesDe(muchos, null);
  assert.equal(MAX_PEDIDOS_EN_NOTIFICACIONES, 20);
  assert.equal(vista.total, 25);
  assert.equal(vista.orders.length, 20);
  assert.equal(vista.orders[0].id, 'WS-24');
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
