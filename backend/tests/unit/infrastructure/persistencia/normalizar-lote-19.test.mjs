/**
 * Normalización del estado en el lote 19 (ADR-0021, PBI-0006; confirmado por Sebastián Avila), sin disco ni red
 * y sin cambiar `schemaVersion`: una tienda guardada antes del lote, o con un modo desconocido, carga con una dirección
 * por pedido, que es lo que hacía; los pedidos antiguos, sin direcciones por línea, no cambian.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeState,
  SCHEMA_VERSION,
} from '../../../../src/infrastructure/persistencia/normalizar-estado.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

const demoPasswords = { superadmin: 'Prueba#1', admin: 'Prueba#2', vendedor: 'Prueba#3' };

/** Estado guardado antes del lote 19: versión 4, sin `deliveryAddressMode`, con un pedido sin direcciones por línea. */
function estadoAnterior(config = {}) {
  const base = structuredClone(seed);
  delete base.config.deliveryAddressMode;
  return {
    ...base,
    schemaVersion: 4,
    adminCredentials: base.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
    config: { ...base.config, ...config },
    orders: [
      {
        id: 'WS-00000001',
        createdAt: '2026-11-01T15:00:00.000Z',
        status: 'confirmed',
        customer: { fullName: 'Ana', email: 'ana@example.com', phone: '9', document: '1' },
        shipping: { addressLine: 'Av Demo 1', district: 'San Isidro', province: 'Lima', department: 'Lima' },
        items: [{ productId: 'p-001', quantity: 1 }],
        subtotal: 100,
        shippingCost: 12,
        total: 112,
      },
    ],
  };
}

const normalizar = (estado) => normalizeState(estado, demoPasswords, () => {});

test('no cambia schemaVersion', () => {
  // El lote no sube la versión: la 5 es la del lote 22 (productos destacados configurables).
  assert.equal(SCHEMA_VERSION, 5);
  assert.equal(normalizar(estadoAnterior()).schemaVersion, SCHEMA_VERSION);
});

test('sin el modo de dirección, o con uno desconocido, carga con una dirección por pedido', () => {
  assert.equal(normalizar(estadoAnterior()).config.deliveryAddressMode, 'per-order');
  assert.equal(
    normalizar(estadoAnterior({ deliveryAddressMode: 'per-line' })).config.deliveryAddressMode,
    'per-order',
  );
  assert.equal(
    normalizar(estadoAnterior({ deliveryAddressMode: 'per-product' })).config.deliveryAddressMode,
    'per-product',
  );
});

test('los pedidos anteriores, sin direcciones por línea, quedan como estaban', () => {
  const anterior = estadoAnterior();
  assert.deepEqual(normalizar(anterior).orders, anterior.orders);
});
