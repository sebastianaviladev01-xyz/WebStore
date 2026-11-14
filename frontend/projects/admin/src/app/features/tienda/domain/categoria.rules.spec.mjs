import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// TEST-07 (feature 008): caracterización de `categoria.rules.ts` tal como está, antes de que los filtros del
// catálogo dependan de ella. Fija lo que hace hoy; no cambia la regla.
const source = await readFile(new URL('./categoria.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { aplanarArbolCategorias, idsDescendientes } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const cat = (id, name, parentId, order) => ({
  id,
  name,
  ...(parentId ? { parentId } : {}),
  ...(order !== undefined ? { order } : {}),
});
const arbol = (entradas) => entradas.map(({ category, depth }) => `${depth}:${category.id}`);

test('TEST-07: el orden explícito va antes que el alfabético, y sin orden se ordena por nombre', () => {
  const categorias = [
    cat('zeta', 'Zeta'),
    cat('beta', 'Beta', undefined, 2),
    cat('alfa', 'Alfa'),
    cat('omega', 'Omega', undefined, 1),
    cat('eñe', 'Ñandú'),
  ];
  assert.deepEqual(arbol(aplanarArbolCategorias(categorias)), [
    '0:omega',
    '0:beta',
    '0:alfa',
    '0:eñe',
    '0:zeta',
  ]);
});

test('TEST-07: cada subcategoría queda justo debajo de su padre, con su profundidad', () => {
  const categorias = [
    cat('nieta', 'OLED 4K', 'hija'),
    cat('raiz-b', 'Hogar'),
    cat('hija', 'OLED', 'raiz-a', 1),
    cat('raiz-a', 'TV y audio'),
    cat('hija-2', 'Barras de sonido', 'raiz-a', 2),
    cat('hija-b', 'Cocina', 'raiz-b'),
  ];
  assert.deepEqual(arbol(aplanarArbolCategorias(categorias)), [
    '0:raiz-b',
    '1:hija-b',
    '0:raiz-a',
    '1:hija',
    '2:nieta',
    '1:hija-2',
  ]);
});

test('TEST-07: una categoría cuyo padre no existe se muestra como raíz', () => {
  const categorias = [cat('b', 'Bravo'), cat('huerfana', 'Alfa', 'no-existe')];
  const resultado = aplanarArbolCategorias(categorias);
  assert.deepEqual(arbol(resultado), ['0:huerfana', '0:b']);
  assert.equal(resultado[0].category.parentId, 'no-existe', 'conserva el parentId original');
});

test('TEST-07: un ciclo se corta y sus categorías se listan al final con profundidad 0', () => {
  const categorias = [cat('x', 'Equis', 'y'), cat('raiz', 'Raíz'), cat('y', 'Ye', 'x')];
  assert.deepEqual(arbol(aplanarArbolCategorias(categorias)), ['0:raiz', '0:x', '0:y']);
});

test('TEST-07: sin categorías, el árbol está vacío', () => {
  assert.deepEqual(aplanarArbolCategorias([]), []);
});

test('TEST-07: idsDescendientes da las subcategorías a cualquier profundidad, sin incluirse', () => {
  const categorias = [
    cat('raiz', 'TV y audio'),
    cat('hija', 'OLED', 'raiz'),
    cat('nieta', 'OLED 4K', 'hija'),
    cat('bisnieta', 'OLED 4K 55', 'nieta'),
    cat('otra', 'Hogar'),
    cat('hija-otra', 'Cocina', 'otra'),
  ];
  assert.deepEqual([...idsDescendientes(categorias, 'raiz')].sort(), ['bisnieta', 'hija', 'nieta']);
  assert.deepEqual([...idsDescendientes(categorias, 'nieta')], ['bisnieta']);
  assert.equal(idsDescendientes(categorias, 'raiz').has('raiz'), false);
});

test('TEST-07: idsDescendientes de una categoría sin hijas, o inexistente, está vacío', () => {
  const categorias = [cat('raiz', 'TV y audio'), cat('hija', 'OLED', 'raiz')];
  assert.equal(idsDescendientes(categorias, 'hija').size, 0);
  assert.equal(idsDescendientes(categorias, 'no-existe').size, 0);
});

test('TEST-07: idsDescendientes termina con un ciclo y no se incluye a sí misma', () => {
  const categorias = [cat('x', 'Equis', 'y'), cat('y', 'Ye', 'x')];
  assert.deepEqual([...idsDescendientes(categorias, 'x')], ['y']);
});
