/**
 * Productos destacados configurables (lote 22, ADR-0025, PBI-0215; confirmado por Sebastián Avila). Hasta el
 * lote, el BFF destacaba los cuatro primeros productos activos del catálogo (`featured ?? index < 4`). La migración a la
 * versión 5 guarda una sola vez ese resultado en cada producto, para que la tienda se vea igual; desde entonces, un
 * producto sin la marca no es destacado.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeState,
  SCHEMA_VERSION,
} from '../../../../src/infrastructure/persistencia/normalizar-estado.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

const demoPasswords = { superadmin: 'Prueba#1', admin: 'Prueba#2', vendedor: 'Prueba#3' };

const producto = (id, extra = {}) => ({
  id,
  sku: `SKU-${id}`,
  name: `Producto ${id}`,
  description: '',
  imageUrl: 'assets/products/tv.svg',
  brandId: 'b-nova',
  categoryId: 'cat-tv',
  price: 10,
  stock: 1,
  active: true,
  ...extra,
});

/** Estado guardado antes del lote 22: versión 4 y productos sin `featured`. */
const estadoAnterior = (products) => ({
  ...structuredClone(seed),
  schemaVersion: 4,
  adminCredentials: seed.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
  products,
});

const destacados = (estado) => estado.products.filter((p) => p.featured).map((p) => p.id);

test('la versión del esquema pasa a 5', () => {
  assert.equal(SCHEMA_VERSION, 5);
});

test('la semilla marca como destacados los cuatro productos que la demo mostraba', () => {
  assert.deepEqual(destacados(seed), ['p-001', 'p-002', 'p-003', 'p-004']);
  assert.ok(seed.products.every((p) => typeof p.featured === 'boolean'));
});

test('al migrar, se destacan los cuatro primeros activos y el resto queda sin destacar', () => {
  const estado = normalizeState(
    estadoAnterior([
      producto('a'),
      producto('inactivo', { active: false }),
      producto('b'),
      producto('c'),
      producto('d'),
      producto('e'),
    ]),
    demoPasswords,
  );
  assert.equal(estado.schemaVersion, 5);
  assert.deepEqual(destacados(estado), ['a', 'b', 'c', 'd']);
  assert.ok(estado.products.every((p) => typeof p.featured === 'boolean'));
});

test('al migrar, una marca ya guardada se respeta y sigue contando su posición, como hacía el BFF', () => {
  const estado = normalizeState(
    estadoAnterior([
      producto('a', { featured: false }),
      producto('b'),
      producto('c'),
      producto('d'),
      producto('e'),
      producto('f', { featured: true }),
    ]),
    demoPasswords,
  );
  assert.deepEqual(destacados(estado), ['b', 'c', 'd', 'f']);
});

test('ya migrado, un producto sin la marca no es destacado y la migración no se repite', () => {
  const migrado = normalizeState(
    estadoAnterior([producto('a'), producto('b'), producto('c'), producto('d'), producto('e')]),
    demoPasswords,
  );
  migrado.products = migrado.products.map((p) => ({ ...p, featured: false }));
  migrado.products.push(producto('nuevo'));
  const recargado = normalizeState(migrado, demoPasswords);
  assert.deepEqual(destacados(recargado), []);
  assert.equal(recargado.products.find((p) => p.id === 'nuevo').featured, false);
});
