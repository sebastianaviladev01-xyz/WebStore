/**
 * Filtros del catálogo de la tienda (lote 05, ADR-0017): viven en la URL (PBI-0108), el precio no esconde los
 * productos caros por defecto y la búsqueda no distingue tildes ni mayúsculas (PBI-0115). Lote 16 (ADR-0021,
 * PBI-0181): el precio es un rango con mínimo y máximo, en lugar de los topes fijos. La regla de las categorías se
 * antepone porque el archivo se transpila sin sus import.
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
  leerFiltrosCatalogo,
  parametrosDeFiltrosCatalogo,
  hayFiltrosCatalogo,
  filtrarProductos,
  normalizarTexto,
  leerPrecio,
  validarRangoDePrecio,
  limitesDePrecio,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

const categoria = (id, parentId) => ({ id, name: id, parentId, slug: id, description: '' });
const categorias = [categoria('cat-tv'), categoria('cat-tv-oled', 'cat-tv'), categoria('cat-home')];
const producto = (id, name, categoryId, price) => ({ id, name, categoryId, price });
const productos = [
  producto('p1', 'OLED Visión 55” 4K', 'cat-tv-oled', 5499),
  producto('p2', 'Barra de sonido Cinema', 'cat-tv', 699),
  producto('p3', 'Lavadora SmartWash 18 kg', 'cat-home', 1899),
];
const sinFiltros = { buscar: '', categoria: '', precioMinimo: null, precioMaximo: null };

test('PBI-0115: sin filtros no hay tope de precio y aparece el producto de más de S/ 5,000', () => {
  assert.deepEqual(leerFiltrosCatalogo({}), sinFiltros);
  assert.deepEqual(
    filtrarProductos(productos, categorias, sinFiltros).map((p) => p.id),
    ['p1', 'p2', 'p3'],
  );
  assert.equal(hayFiltrosCatalogo(sinFiltros), false);
});

test('PBI-0181: el rango filtra con mínimo y máximo, los dos incluidos y cada uno opcional', () => {
  const ids = (filtros) =>
    filtrarProductos(productos, categorias, { ...sinFiltros, ...filtros }).map((p) => p.id);
  assert.deepEqual(ids({ precioMinimo: 699, precioMaximo: 1899 }), ['p2', 'p3']);
  assert.deepEqual(ids({ precioMinimo: 700 }), ['p1', 'p3']);
  assert.deepEqual(ids({ precioMaximo: 699 }), ['p2']);
  assert.deepEqual(ids({ precioMinimo: 0, precioMaximo: 0 }), []);
  assert.equal(hayFiltrosCatalogo({ ...sinFiltros, precioMinimo: 0 }), true);
  assert.equal(hayFiltrosCatalogo({ ...sinFiltros, precioMaximo: 2000 }), true);
});

test('PBI-0181: el rango se lee de la URL; un precio que no vale, o un mínimo mayor que el máximo, no filtra', () => {
  assert.deepEqual(leerFiltrosCatalogo({ precioMin: '500', precioMax: '2000.5' }), {
    ...sinFiltros,
    precioMinimo: 500,
    precioMaximo: 2000.5,
  });
  assert.deepEqual(leerFiltrosCatalogo({ precioMin: '-5', precioMax: 'mucho' }), sinFiltros);
  assert.deepEqual(leerFiltrosCatalogo({ precioMin: '3000', precioMax: '1000' }), sinFiltros);
  // El tope anterior (`precio`, lote 05) se lee como el máximo, para que los enlaces guardados sigan valiendo.
  assert.equal(leerFiltrosCatalogo({ precio: '2000' }).precioMaximo, 2000);
  assert.equal(leerFiltrosCatalogo({ precio: '2000', precioMax: '900' }).precioMaximo, 900);
  assert.deepEqual(parametrosDeFiltrosCatalogo({ ...sinFiltros, precioMinimo: 0, precioMaximo: 1500 }), {
    precioMin: '0',
    precioMax: '1500',
  });
});

test('PBI-0181: un precio escrito acepta números con hasta dos decimales y separador de miles', () => {
  assert.deepEqual(leerPrecio(''), { valor: null });
  assert.deepEqual(leerPrecio('  '), { valor: null });
  assert.deepEqual(leerPrecio(' 1500 '), { valor: 1500 });
  assert.deepEqual(leerPrecio('1,500.90'), { valor: 1500.9 });
  assert.deepEqual(leerPrecio('0'), { valor: 0 });
  assert.deepEqual(leerPrecio('-10'), { error: 'El precio no puede ser negativo.' });
  for (const texto of ['abc', '1.234', '1,50', '1e3', '12,34,567', 'S/ 100'])
    assert.deepEqual(leerPrecio(texto), { error: 'Escribe solo números, por ejemplo 1500.' }, texto);
});

test('PBI-0181: el rango escrito vale sin un mínimo mayor que el máximo, y cada error va en su campo', () => {
  assert.deepEqual(validarRangoDePrecio('500', '2000'), { ok: true, precioMinimo: 500, precioMaximo: 2000 });
  assert.deepEqual(validarRangoDePrecio('', ''), { ok: true, precioMinimo: null, precioMaximo: null });
  assert.deepEqual(validarRangoDePrecio('800', '800'), { ok: true, precioMinimo: 800, precioMaximo: 800 });
  assert.deepEqual(validarRangoDePrecio('2000', '500'), {
    ok: false,
    errores: { maximo: 'El máximo no puede ser menor que el mínimo.' },
  });
  assert.deepEqual(validarRangoDePrecio('-1', 'x'), {
    ok: false,
    errores: {
      minimo: 'El precio no puede ser negativo.',
      maximo: 'Escribe solo números, por ejemplo 1500.',
    },
  });
});

test('PBI-0181: los límites de precio son el más bajo y el más alto de los productos dados', () => {
  assert.deepEqual(limitesDePrecio(productos), { minimo: 699, maximo: 5499 });
  assert.equal(limitesDePrecio([]), null);
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
  const filtros = leerFiltrosCatalogo({ buscar: ' oled ', categoria: 'cat-tv', precioMax: '5000' });
  assert.deepEqual(filtros, {
    buscar: ' oled ',
    categoria: 'cat-tv',
    precioMinimo: null,
    precioMaximo: 5000,
  });
  assert.deepEqual(parametrosDeFiltrosCatalogo(filtros), {
    buscar: 'oled',
    categoria: 'cat-tv',
    precioMax: '5000',
  });
  assert.deepEqual(parametrosDeFiltrosCatalogo(sinFiltros), {});
  assert.deepEqual(parametrosDeFiltrosCatalogo({ ...sinFiltros, buscar: '   ' }), {});
  assert.deepEqual(
    leerFiltrosCatalogo({ buscar: null, categoria: undefined, precioMin: '', precioMax: null }),
    sinFiltros,
  );
});
