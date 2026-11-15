/**
 * Categorías (lote 02, PBI-0102): el árbol sin padres inexistentes ni ciclos, el orden de los listados y el
 * mensaje de lo que no se puede eliminar. La dirección única y las categorías en uso las cubren los casos de uso
 * del guardado (PBI-0131 y PBI-0148).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  requireRemovedWithoutChildren,
  requireValidCategoryTree,
  sortCategories,
} from '../../../../src/domain/catalogo/categoria.rules.mjs';
import { slugify } from '../../../../src/domain/catalogo/slug.mjs';

const categoria = (id, parentId, extra = {}) => ({ id, name: id.toUpperCase(), parentId, ...extra });
const invalido = { code: 'INVALID_CATEGORY_TREE', kind: 'validation' };

test('una lista con raíces y subcategorías encadenadas es válida', () => {
  assert.doesNotThrow(() =>
    requireValidCategoryTree([
      categoria('a', undefined),
      categoria('b', 'a'),
      categoria('c', 'b'),
      categoria('d', null),
      categoria('e', ''),
    ]),
  );
  assert.doesNotThrow(() => requireValidCategoryTree([]));
});

test('lo que no es una lista responde INVALID_CATEGORY_TREE', () => {
  for (const lista of [undefined, null, {}, 'a'])
    assert.throws(() => requireValidCategoryTree(lista), invalido, String(lista));
});

test('un padre que no existe responde INVALID_CATEGORY_TREE y dice qué categoría lo tiene', () => {
  assert.throws(() => requireValidCategoryTree([categoria('a', 'x')]), {
    ...invalido,
    details: { categoryId: 'a' },
  });
});

test('una categoría no puede ser su propio padre ni colgar de una de sus subcategorías', () => {
  assert.throws(() => requireValidCategoryTree([categoria('a', 'a')]), invalido);
  assert.throws(() => requireValidCategoryTree([categoria('a', 'b'), categoria('b', 'a')]), invalido);
  assert.throws(
    () =>
      requireValidCategoryTree([
        categoria('r', undefined),
        categoria('a', 'c'),
        categoria('b', 'a'),
        categoria('c', 'b'),
      ]),
    invalido,
  );
});

test('un ciclo que no incluye a la categoría revisada también se detecta, sin colgarse', () => {
  assert.throws(
    () => requireValidCategoryTree([categoria('hoja', 'a'), categoria('a', 'b'), categoria('b', 'a')]),
    invalido,
  );
});

test('el listado agrupa por padre, ordena por `order` y deja sin orden al final, por nombre en español', () => {
  const lista = [
    categoria('z', undefined, { name: 'Zapatos' }),
    categoria('a2', 'a', { name: 'Beta', order: 2 }),
    categoria('a-sin', 'a', { name: 'Ñandú' }),
    categoria('a1', 'a', { name: 'Zeta', order: 1 }),
    categoria('a-sin2', 'a', { name: 'Nube' }),
    categoria('b', undefined, { name: 'Árboles', order: 5 }),
  ];
  assert.deepEqual(
    sortCategories(lista).map((item) => item.id),
    ['b', 'z', 'a1', 'a2', 'a-sin2', 'a-sin'],
  );
});

test('ordenar no modifica la lista recibida', () => {
  const lista = [categoria('b', undefined, { name: 'B' }), categoria('a', undefined, { name: 'A' })];
  sortCategories(lista);
  assert.deepEqual(
    lista.map((item) => item.id),
    ['b', 'a'],
  );
});

test('eliminar una categoría con subcategorías responde CATEGORY_HAS_CHILDREN con el conteo y el plural correcto', () => {
  const previo = [categoria('a', undefined, { name: 'Audio' }), categoria('b', 'a'), categoria('c', 'a')];
  assert.throws(() => requireRemovedWithoutChildren([categoria('b', 'a'), categoria('c', 'a')], previo), {
    code: 'CATEGORY_HAS_CHILDREN',
    kind: 'conflict',
    details: { categoryId: 'a', children: 2 },
    message: /«Audio».*2 subcategorías.*Muévelas o elimínalas/,
  });
  assert.throws(() => requireRemovedWithoutChildren([categoria('b', 'a')], previo), {
    details: { categoryId: 'a', children: 1 },
    message: /1 subcategoría\. Muévela o elimínala/,
  });
});

test('eliminar una categoría y todas sus subcategorías a la vez, o una sin hijos, es válido', () => {
  const previo = [categoria('a', undefined), categoria('b', 'a'), categoria('c', undefined)];
  assert.doesNotThrow(() => requireRemovedWithoutChildren([categoria('c', undefined)], previo));
  assert.doesNotThrow(() =>
    requireRemovedWithoutChildren([categoria('a', undefined), categoria('b', 'a')], previo),
  );
});

test('la dirección de una categoría sale de su nombre, sin tildes ni símbolos', () => {
  assert.equal(slugify('Cámaras & Fotografía'), 'camaras-fotografia');
  assert.equal(slugify('  Línea blanca  '), 'linea-blanca');
  assert.equal(slugify(''), '');
  assert.equal(slugify(), '');
});
