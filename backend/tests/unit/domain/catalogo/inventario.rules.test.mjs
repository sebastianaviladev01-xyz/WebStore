/**
 * Reserva y liberación de stock (lote 01, ADR-0017): las líneas repetidas del mismo producto se suman antes de
 * validar y de descontar (PBI-0092), y un producto inactivo no se vende (PBI-0093).
 * Lote 23 (ADR-0025, PBI-0226; confirmado por Sebastián Avila): el stock se gestiona solo en Inventario. Un producto
 * que llega sin stock desde el registro del producto conserva el vigente, y uno nuevo empieza en 0.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  conStockVigente,
  releaseStock,
  reserveStock,
} from '../../../../src/domain/catalogo/inventario.rules.mjs';

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

// Lote 02 (PBI-0102): los límites del stock y lo que no se toca.

test('se puede reservar justo todo el stock, pero no una unidad más', () => {
  assert.equal(stockDe(reserveStock(productos(), [{ productId: 'p-3', quantity: 2 }]), 'p-3'), 0);
  assert.throws(() => reserveStock(productos(), [{ productId: 'p-3', quantity: 3 }]), {
    code: 'INSUFFICIENT_STOCK',
    kind: 'conflict',
    details: { productId: 'p-3' },
  });
});

test('un producto que no existe se rechaza como sin stock, con su identificador', () => {
  assert.throws(() => reserveStock(productos(), [{ productId: 'p-9', quantity: 1 }]), {
    code: 'INSUFFICIENT_STOCK',
    details: { productId: 'p-9' },
  });
  assert.throws(
    () => reserveStock(productos(), [{ productId: 'p-9', quantity: 1 }], { requireActive: true }),
    { code: 'INSUFFICIENT_STOCK' },
  );
});

test('reservar acepta las líneas con el producto embebido, como las envía la tienda', () => {
  const despues = reserveStock(productos(), [{ product: { id: 'p-1' }, quantity: 4 }]);
  assert.equal(stockDe(despues, 'p-1'), 5);
});

test('un producto activo y sin stock responde INSUFFICIENT_STOCK, no PRODUCT_UNAVAILABLE', () => {
  const sinStock = [{ id: 'p-1', stock: 0, active: true }];
  assert.throws(() => reserveStock(sinStock, [{ productId: 'p-1', quantity: 1 }], { requireActive: true }), {
    code: 'INSUFFICIENT_STOCK',
  });
});

test('reservar y liberar devuelven una lista nueva: la recibida y los demás productos no cambian', () => {
  const antes = productos();
  const copia = structuredClone(antes);
  const reservada = reserveStock(antes, [{ productId: 'p-1', quantity: 2 }]);
  const liberada = releaseStock(antes, [{ productId: 'p-1', quantity: 2 }]);
  assert.deepEqual(antes, copia);
  assert.notEqual(reservada, antes);
  assert.equal(reservada[2], antes[2]);
  assert.equal(stockDe(liberada, 'p-1'), 11);
});

test('liberar una línea de un producto que ya no existe no falla ni inventa productos', () => {
  assert.deepEqual(releaseStock(productos(), [{ productId: 'p-9', quantity: 3 }]), productos());
});

test('reservar y liberar las mismas líneas deja el stock como estaba', () => {
  const lineas = [
    { productId: 'p-1', quantity: 3 },
    { productId: 'p-3', quantity: 2 },
  ];
  assert.deepEqual(releaseStock(reserveStock(productos(), lineas), lineas), productos());
});

test('PBI-0226: un producto que llega sin stock conserva el vigente, y uno nuevo empieza en 0', () => {
  const vigentes = productos();
  const llegan = [
    { id: 'p-1', active: true }, // la ficha guardada sin el campo: no pisa las 9 unidades
    { id: 'p-2', stock: 7, active: false }, // Inventario cambia el stock: se toma el que llega
    { id: 'p-nuevo', active: true }, // nuevo, sin stock: 0
  ];
  assert.deepEqual(conStockVigente(llegan, vigentes), [
    { id: 'p-1', active: true, stock: 9 },
    { id: 'p-2', stock: 7, active: false },
    { id: 'p-nuevo', active: true, stock: 0 },
  ]);
  assert.equal('stock' in llegan[0], false, 'no cambia la lista recibida');
});

test('PBI-0226: un stock que llega con otro tipo no se completa: lo rechaza la validación de la colección', () => {
  const [producto] = conStockVigente([{ id: 'p-1', stock: '5' }], productos());
  assert.equal(producto.stock, '5');
});
