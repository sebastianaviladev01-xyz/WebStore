/**
 * Qué pedidos puede cambiar o cancelar el cliente (PBI-0094, lote 01, ADR-0017): dentro de las 24 horas y solo
 * si el pedido no se envió, no se entregó y no se canceló.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { canModify, ORDER_MODIFICATION_WINDOW_MS } from '../../../../src/domain/pedidos/pedido.rules.mjs';

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
