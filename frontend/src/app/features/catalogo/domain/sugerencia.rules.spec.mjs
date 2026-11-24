/**
 * Productos sugeridos del diálogo «Producto agregado» (PBI-0039, lote 05, ADR-0017; confirmado por Daniel el
 * 2026-11-20): hasta tres de la misma categoría, con stock y distintos del agregado, en el orden del catálogo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./sugerencia.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { MAXIMO_SUGERIDOS, productosSugeridos } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const producto = (id, categoryId, stock = 5) => ({ id, categoryId, stock });

test('hasta tres productos de la misma categoría, con stock y distintos del agregado', () => {
  const agregado = producto('tv-1', 'cat-tv');
  const catalogo = [
    agregado,
    producto('tv-2', 'cat-tv'),
    producto('casa-1', 'cat-home'),
    producto('tv-3', 'cat-tv', 0),
    producto('tv-4', 'cat-tv'),
    producto('tv-5', 'cat-tv'),
    producto('tv-6', 'cat-tv'),
  ];
  assert.equal(MAXIMO_SUGERIDOS, 3);
  assert.deepEqual(
    productosSugeridos(catalogo, agregado).map((p) => p.id),
    ['tv-2', 'tv-4', 'tv-5'],
  );
});

test('sin otros productos con stock en la categoría no sugiere nada', () => {
  const agregado = producto('casa-1', 'cat-home');
  assert.deepEqual(
    productosSugeridos([agregado, producto('casa-2', 'cat-home', 0), producto('tv-1', 'cat-tv')], agregado),
    [],
  );
});
