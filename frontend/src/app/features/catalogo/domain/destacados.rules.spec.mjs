/**
 * Productos destacados del inicio (lote 22, ADR-0025, PBI-0215; provisional, por confirmar con Daniel): los que el
 * Admin marca con «Es destacado», solo con stock y en el orden del catálogo, sin tope. Con más de cuatro, el inicio los
 * muestra en un carrusel; con ninguno, la sección no sale.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./destacados.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { MAXIMO_SIN_CARRUSEL, necesitaCarrusel, productosDestacados } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const producto = (id, featured, stock = 5) => ({ id, featured, stock });

test('solo los marcados como destacados y con stock, en el orden del catálogo', () => {
  const catalogo = [
    producto('a', true),
    producto('b', false),
    producto('agotado', true, 0),
    producto('c', true),
    producto('d', false, 0),
  ];
  assert.deepEqual(
    productosDestacados(catalogo).map((p) => p.id),
    ['a', 'c'],
  );
});

test('sin tope: con ocho destacados con stock salen los ocho', () => {
  const catalogo = Array.from({ length: 8 }, (_, i) => producto(`p${i}`, true));
  assert.equal(productosDestacados(catalogo).length, 8);
});

test('sin destacados con stock, la lista queda vacía', () => {
  assert.deepEqual(productosDestacados([producto('a', false), producto('b', true, 0)]), []);
  assert.deepEqual(productosDestacados([]), []);
});

test('el carrusel aparece solo con más de cuatro', () => {
  assert.equal(MAXIMO_SIN_CARRUSEL, 4);
  assert.equal(necesitaCarrusel(0), false);
  assert.equal(necesitaCarrusel(4), false);
  assert.equal(necesitaCarrusel(5), true);
  assert.equal(necesitaCarrusel(20), true);
});
