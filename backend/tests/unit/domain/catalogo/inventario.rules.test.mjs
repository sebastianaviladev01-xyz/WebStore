/**
 * Reserva y liberación de stock (lote 01, ADR-0017): las líneas repetidas del mismo producto se suman antes de
 * validar y de descontar (PBI-0092), y un producto inactivo no se vende (PBI-0093).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { releaseStock, reserveStock } from '../../../../src/domain/catalogo/inventario.rules.mjs';

const productos = () => [
  { id: 'p-1', stock: 9, active: true },
  { id: 'p-2', stock: 4, active: false },
  { id: 'p-3', stock: 2, active: true },
];

const stockDe = (lista, id) => lista.find((producto) => producto.id === id).stock;

test('dos líneas del mismo producto que juntas superan el stock se rechazan sin tocar nada', () => {
  const antes = productos();
  assert.throws(
    () =>
      reserveStock(antes, [
        { productId: 'p-1', quantity: 6 },
        { productId: 'p-1', quantity: 6 },
      ]),
    { code: 'INSUFFICIENT_STOCK' },
  );
  assert.equal(stockDe(antes, 'p-1'), 9);
});

test('las líneas repetidas que caben en el stock descuentan la suma', () => {
  const despues = reserveStock(productos(), [
    { productId: 'p-1', quantity: 3 },
    { productId: 'p-3', quantity: 1 },
    { productId: 'p-1', quantity: 4 },
  ]);
  assert.equal(stockDe(despues, 'p-1'), 2);
  assert.equal(stockDe(despues, 'p-3'), 1);
});

test('un producto inactivo no se reserva si se exigen activos', () => {
  assert.throws(
    () => reserveStock(productos(), [{ productId: 'p-2', quantity: 1 }], { requireActive: true }),
    {
      code: 'PRODUCT_UNAVAILABLE',
    },
  );
});

test('sin exigir activos (reactivar un pedido desde el Admin) un inactivo con stock se reserva', () => {
  const despues = reserveStock(productos(), [{ productId: 'p-2', quantity: 1 }]);
  assert.equal(stockDe(despues, 'p-2'), 3);
});

test('liberar devuelve todas las unidades de las líneas repetidas', () => {
  const despues = releaseStock(productos(), [
    { productId: 'p-1', quantity: 2 },
    { product: { id: 'p-1' }, quantity: 5 },
  ]);
  assert.equal(stockDe(despues, 'p-1'), 16);
});
