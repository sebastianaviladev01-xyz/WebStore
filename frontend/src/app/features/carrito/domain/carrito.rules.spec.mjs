/**
 * Reglas del carrito (lote 04, ADR-0017): unir las líneas guardadas del mismo producto (PBI-0092), saber cuántas
 * unidades se agregaron de verdad (PBI-0065) y qué cambió al conciliar con el catálogo vigente (PBI-0106).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./carrito.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { unirLineasGuardadas, agregarAlCarrito, conciliarCarrito } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const producto = (id, price, stock, name = `Producto ${id}`) => ({ id, name, price, stock });

test('PBI-0092: las líneas guardadas del mismo producto se unen en una, en el orden de la primera', () => {
  assert.deepEqual(
    unirLineasGuardadas([
      { productId: 'a', quantity: 2 },
      { productId: 'b', quantity: 1 },
      { productId: 'a', quantity: 3 },
    ]),
    [
      { productId: 'a', quantity: 5 },
      { productId: 'b', quantity: 1 },
    ],
  );
  assert.deepEqual(unirLineasGuardadas([]), []);
});

test('PBI-0065: agregar un producto nuevo cuenta las unidades agregadas, topadas en el stock', () => {
  const tele = producto('t', 100, 4);
  assert.deepEqual(agregarAlCarrito([], tele, 1), { items: [{ product: tele, quantity: 1 }], agregadas: 1 });
  assert.deepEqual(agregarAlCarrito([], tele, 6), { items: [{ product: tele, quantity: 4 }], agregadas: 4 });
});

test('PBI-0065: con todo el stock ya en el carrito no se agrega nada y el carrito no cambia', () => {
  const tele = producto('t', 100, 4);
  const items = [{ product: tele, quantity: 4 }];
  const resultado = agregarAlCarrito(items, tele, 1);
  assert.equal(resultado.agregadas, 0);
  assert.deepEqual(resultado.items, items);
});

test('PBI-0065: si solo cabe una parte, se agrega esa parte y se dice cuántas', () => {
  const tele = producto('t', 100, 4);
  const resultado = agregarAlCarrito([{ product: tele, quantity: 3 }], tele, 2);
  assert.equal(resultado.agregadas, 1);
  assert.deepEqual(resultado.items, [{ product: tele, quantity: 4 }]);
});

test('PBI-0065: un producto agotado o una cantidad no positiva no agrega nada', () => {
  assert.equal(agregarAlCarrito([], producto('x', 10, 0), 1).agregadas, 0);
  assert.equal(agregarAlCarrito([], producto('x', 10, 5), 0).agregadas, 0);
  assert.deepEqual(agregarAlCarrito([], producto('x', 10, 0), 1).items, []);
});

test('PBI-0106: sin cambios en el catálogo, la conciliación no informa nada', () => {
  const a = producto('a', 100, 5);
  const { items, cambios } = conciliarCarrito([{ product: a, quantity: 2 }], [{ ...a }]);
  assert.deepEqual(cambios, []);
  assert.equal(items[0].quantity, 2);
});

test('PBI-0106: un precio distinto se informa con el anterior y el vigente, y la línea toma el vigente', () => {
  const a = producto('a', 100, 5, 'Soundbar');
  const { items, cambios } = conciliarCarrito([{ product: a, quantity: 2 }], [{ ...a, price: 120 }]);
  assert.deepEqual(cambios, [{ tipo: 'precio', nombre: 'Soundbar', antes: 100, ahora: 120 }]);
  assert.equal(items[0].product.price, 120);
});

test('PBI-0106: si el stock ya no alcanza, la cantidad baja al stock y se informa', () => {
  const a = producto('a', 100, 5, 'Soundbar');
  const { items, cambios } = conciliarCarrito([{ product: a, quantity: 4 }], [{ ...a, stock: 2 }]);
  assert.deepEqual(cambios, [{ tipo: 'stock', nombre: 'Soundbar', antes: 4, ahora: 2 }]);
  assert.deepEqual(
    items.map((i) => i.quantity),
    [2],
  );
});

test('PBI-0106: un producto agotado o retirado sale del carrito y se informa', () => {
  const a = producto('a', 100, 5, 'Soundbar');
  const b = producto('b', 50, 5, 'Monitor');
  const { items, cambios } = conciliarCarrito(
    [
      { product: a, quantity: 1 },
      { product: b, quantity: 1 },
    ],
    [{ ...a, stock: 0 }],
  );
  assert.deepEqual(items, []);
  assert.deepEqual(cambios, [
    { tipo: 'retirado', nombre: 'Soundbar' },
    { tipo: 'retirado', nombre: 'Monitor' },
  ]);
});

test('PBI-0106: precio y stock cambiados en la misma línea se informan los dos', () => {
  const a = producto('a', 100, 5, 'Soundbar');
  const { cambios } = conciliarCarrito([{ product: a, quantity: 4 }], [{ ...a, price: 90, stock: 3 }]);
  assert.deepEqual(cambios, [
    { tipo: 'precio', nombre: 'Soundbar', antes: 100, ahora: 90 },
    { tipo: 'stock', nombre: 'Soundbar', antes: 4, ahora: 3 },
  ]);
});
