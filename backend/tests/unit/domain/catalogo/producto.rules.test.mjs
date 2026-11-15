/**
 * Productos (lote 02, PBI-0102): las fotos de la ficha, qué roles no pueden dejar fuera un producto y los límites de
 * la dirección de ficha única, de la marca en uso y de la categoría en uso (PBI-0129 y PBI-0131, en los casos de uso
 * del guardado con sus mensajes completos).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  galleryOf,
  requireNoRemovedProducts,
  requireRemovedNotInUse,
  requireUniqueSlugs,
} from '../../../../src/domain/catalogo/producto.rules.mjs';

test('la galería son solo los textos con contenido, y lo que no es una lista no es galería', () => {
  assert.deepEqual(galleryOf({ gallery: ['a.png', '', '   ', 3, null, 'b.png'] }), ['a.png', 'b.png']);
  for (const gallery of [undefined, null, 'a.png', {}]) assert.deepEqual(galleryOf({ gallery }), []);
});

test('quien no elimina productos puede conservar, agregar y cambiar, pero no dejar fuera uno vigente', () => {
  const vigentes = [{ id: 'p-1' }, { id: 'p-2' }];
  assert.doesNotThrow(() =>
    requireNoRemovedProducts(vigentes, [{ id: 'p-2' }, { id: 'p-1' }, { id: 'p-3' }]),
  );
  assert.throws(() => requireNoRemovedProducts(vigentes, [{ id: 'p-1' }]), {
    code: 'CATALOG_SCOPE_VIOLATION',
    kind: 'forbidden',
  });
  assert.throws(() => requireNoRemovedProducts(vigentes, []), { code: 'CATALOG_SCOPE_VIOLATION' });
});

const producto = (id, name) => ({ id, name });

test('la dirección de ficha se compara por la dirección del nombre, no por el nombre', () => {
  const previo = [producto('p-1', 'Televisor 55')];
  assert.throws(() => requireUniqueSlugs([...previo, producto('p-2', 'TELEVISOR  55!')], previo), {
    code: 'INVALID_COLLECTION',
    details: { collection: 'products', field: 'slug', id: 'p-2' },
  });
  assert.doesNotThrow(() => requireUniqueSlugs([...previo, producto('p-2', 'Televisor 65')], previo));
});

test('renombrar un producto a una dirección ya usada se rechaza; conservar la propia no', () => {
  const previo = [producto('p-1', 'Uno'), producto('p-2', 'Dos')];
  assert.throws(() => requireUniqueSlugs([producto('p-1', 'Uno'), producto('p-2', 'uno')], previo), {
    code: 'INVALID_COLLECTION',
  });
  assert.doesNotThrow(() => requireUniqueSlugs([producto('p-1', 'Uno'), producto('p-2', 'Dos')], previo));
});

const contexto = (cambios = {}) => ({
  previousBrands: [{ id: 'b-1', name: 'Acme' }],
  nextBrands: [{ id: 'b-1', name: 'Acme' }],
  previousCategories: [{ id: 'c-1', name: 'Audio' }],
  nextCategories: [{ id: 'c-1', name: 'Audio' }],
  ...cambios,
});

test('eliminar una marca o una categoría que usa un producto responde con su código, su conteo y la forma correcta', () => {
  const productos = [
    { id: 'p-1', brandId: 'b-1', categoryId: 'c-1' },
    { id: 'p-2', brandId: 'b-1', categoryId: 'c-1' },
  ];
  assert.throws(() => requireRemovedNotInUse(productos, contexto({ nextBrands: [] })), {
    code: 'BRAND_IN_USE',
    kind: 'conflict',
    details: { brandId: 'b-1', products: 2 },
    message: /«Acme».*la usan 2 productos\. Cámbiales la marca/,
  });
  assert.throws(() => requireRemovedNotInUse(productos.slice(0, 1), contexto({ nextCategories: [] })), {
    code: 'CATEGORY_IN_USE',
    details: { categoryId: 'c-1', products: 1 },
    message: /«Audio».*la usa 1 producto\. Cámbiale la categoría/,
  });
});

test('eliminar una marca o una categoría sin productos es válido, y no revisa las que se conservan', () => {
  const productos = [{ id: 'p-1', brandId: 'b-9', categoryId: 'c-9' }];
  assert.doesNotThrow(() =>
    requireRemovedNotInUse(productos, contexto({ nextBrands: [], nextCategories: [] })),
  );
  assert.doesNotThrow(() =>
    requireRemovedNotInUse([{ id: 'p-1', brandId: 'b-1', categoryId: 'c-1' }], contexto()),
  );
});
