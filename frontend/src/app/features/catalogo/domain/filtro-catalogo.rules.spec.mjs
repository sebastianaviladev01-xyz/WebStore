/**
 * Filtros del catálogo de la tienda (lote 05, ADR-0017): viven en la URL (PBI-0108), el precio no esconde los
 * productos caros por defecto y la búsqueda no distingue tildes ni mayúsculas (PBI-0115). La regla de las categorías
 * se antepone porque el archivo se transpila sin sus import.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = [
  await readFile(new URL('./categoria.rules.ts', import.meta.url), 'utf8'),
  await readFile(new URL('./filtro-catalogo.rules.ts', import.meta.url), 'utf8'),
].join('\n');
const moduleSource = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  TOPES_DE_PRECIO,
  leerFiltrosCatalogo,
  parametrosDeFiltrosCatalogo,
  hayFiltrosCatalogo,
  filtrarProductos,
  normalizarTexto,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

const categoria = (id, parentId) => ({ id, name: id, parentId, slug: id, description: '' });
const categorias = [categoria('cat-tv'), categoria('cat-tv-oled', 'cat-tv'), categoria('cat-home')];
const producto = (id, name, categoryId, price) => ({ id, name, categoryId, price });
const productos = [
  producto('p1', 'OLED Visión 55” 4K', 'cat-tv-oled', 5499),
  producto('p2', 'Barra de sonido Cinema', 'cat-tv', 699),
  producto('p3', 'Lavadora SmartWash 18 kg', 'cat-home', 1899),
];
const sinFiltros = { buscar: '', categoria: '', precioMaximo: null };

test('PBI-0115: sin filtros no hay tope de precio y aparece el producto de más de S/ 5,000', () => {
  assert.deepEqual(leerFiltrosCatalogo({}), sinFiltros);
  assert.deepEqual(
    filtrarProductos(productos, categorias, sinFiltros).map((p) => p.id),
    ['p1', 'p2', 'p3'],
  );
  assert.equal(hayFiltrosCatalogo(sinFiltros), false);
});

test('PBI-0115: el tope de precio solo acepta los valores ofrecidos; otro se lee como «sin tope»', () => {
  assert.deepEqual([...TOPES_DE_PRECIO], [1000, 2000, 3000, 5000]);
  assert.equal(leerFiltrosCatalogo({ precio: '2000' }).precioMaximo, 2000);
  assert.equal(leerFiltrosCatalogo({ precio: '2500' }).precioMaximo, null);
  assert.equal(leerFiltrosCatalogo({ precio: 'mucho' }).precioMaximo, null);
  const hasta2000 = { ...sinFiltros, precioMaximo: 2000 };
  assert.deepEqual(
    filtrarProductos(productos, categorias, hasta2000).map((p) => p.id),
    ['p2', 'p3'],
  );
  assert.equal(hayFiltrosCatalogo(hasta2000), true);
});

test('PBI-0115: la búsqueda no distingue tildes ni mayúsculas', () => {
  assert.equal(normalizarTexto('  Visión ÑANDÚ '), 'vision nandu');
  for (const buscar of ['vision', 'VISIÓN', 'visión']) {
    assert.deepEqual(
      filtrarProductos(productos, categorias, { ...sinFiltros, buscar }).map((p) => p.id),
      ['p1'],
      buscar,
    );
  }
});

test('la categoría incluye a sus descendientes', () => {
  assert.deepEqual(
    filtrarProductos(productos, categorias, { ...sinFiltros, categoria: 'cat-tv' }).map((p) => p.id),
    ['p1', 'p2'],
  );
  assert.deepEqual(
    filtrarProductos(productos, categorias, { ...sinFiltros, categoria: 'cat-tv-oled' }).map((p) => p.id),
    ['p1'],
  );
});

test('PBI-0108: los filtros se leen de la URL y se escriben en ella sin los valores por defecto', () => {
  const filtros = leerFiltrosCatalogo({ buscar: ' oled ', categoria: 'cat-tv', precio: '5000' });
  assert.deepEqual(filtros, { buscar: ' oled ', categoria: 'cat-tv', precioMaximo: 5000 });
  assert.deepEqual(parametrosDeFiltrosCatalogo(filtros), {
    buscar: 'oled',
    categoria: 'cat-tv',
    precio: '5000',
  });
  assert.deepEqual(parametrosDeFiltrosCatalogo(sinFiltros), {});
  assert.deepEqual(parametrosDeFiltrosCatalogo({ ...sinFiltros, buscar: '   ' }), {});
  assert.deepEqual(leerFiltrosCatalogo({ buscar: null, categoria: undefined, precio: '' }), sinFiltros);
});
