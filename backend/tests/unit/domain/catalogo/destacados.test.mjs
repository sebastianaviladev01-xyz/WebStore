/**
 * Productos destacados configurables (lote 22, ADR-0025, PBI-0215; provisional, por confirmar con Daniel): el producto
 * lleva una marca `featured` que el Admin elige con la casilla «Es destacado». El catálogo público la devuelve tal cual,
 * sin tope y sin depender de la posición del producto; el guardado del Admin rechaza un valor que no sea booleano.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { requireValidProducts } from '../../../../src/domain/admin/colecciones.rules.mjs';
import { createCatalogoQueries } from '../../../../src/application/catalogo/catalogo.queries.mjs';

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

const catalogo = (products) =>
  createCatalogoQueries({ store: { state: { products, categories: [], brands: [] } } });

test('el catálogo público devuelve la marca de cada producto, sin importar su posición ni cuántos son', () => {
  const productos = [
    producto('a', { featured: false }),
    ...['b', 'c', 'd', 'e', 'f', 'g'].map((id) => producto(id, { featured: true })),
  ];
  const publicos = catalogo(productos).listProducts();
  assert.deepEqual(
    publicos.filter((p) => p.featured).map((p) => p.id),
    ['b', 'c', 'd', 'e', 'f', 'g'],
  );
  assert.equal(publicos[0].featured, false);
});

test('un producto sin la marca no es destacado, aunque esté entre los cuatro primeros', () => {
  const publicos = catalogo([producto('a'), producto('b')]).listProducts();
  assert.deepEqual(
    publicos.map((p) => p.featured),
    [false, false],
  );
});

test('el guardado del Admin acepta la marca booleana o su ausencia', () => {
  // Productos ya guardados (lote 24): sus imágenes de `assets/` no cambian.
  const guardados = [producto('a', { featured: true }), producto('b', { featured: false }), producto('c')];
  assert.doesNotThrow(() => requireValidProducts(guardados, guardados));
});

test('el guardado del Admin rechaza una marca que no es booleana', () => {
  for (const featured of ['si', 1, null])
    assert.throws(
      () => requireValidProducts([producto('a', { featured })]),
      (error) => {
        assert.equal(error.code, 'INVALID_COLLECTION');
        assert.deepEqual(error.details, { collection: 'products', field: 'featured', id: 'a' });
        return true;
      },
    );
});
