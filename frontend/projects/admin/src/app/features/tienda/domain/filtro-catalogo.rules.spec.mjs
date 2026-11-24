import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// TEST-03 a TEST-06 (feature 008): filtros del catálogo del Admin y su lectura y escritura en la URL. La regla se
// transpila sin sus `import`, detrás de las reglas de las que depende (`categoria.rules.ts`, `listado.rules.ts`) y
// de las constantes de `filtro-catalogo.model.ts`.
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const fuente = [
  await leer('./categoria.rules.ts'),
  await leer('./listado.rules.ts'),
  await leer('./filtro-catalogo.model.ts'),
  await leer('./filtro-catalogo.rules.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const regla = await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);
const {
  filtrarProductos,
  filtrarMarcas,
  SIN_PADRE,
  FILTROS_PRODUCTOS_VACIOS,
  FILTROS_CATEGORIAS_VACIOS,
  FILTROS_MARCAS_VACIOS,
  leerFiltrosProductos,
  leerFiltrosCategorias,
  leerFiltrosMarcas,
  leerPagina,
  parametrosDeFiltrosProductos,
  parametrosDeFiltrosCategorias,
  parametrosDeFiltrosMarcas,
} = regla;

const cat = (id, name, parentId, order) => ({
  id,
  name,
  ...(parentId ? { parentId } : {}),
  ...(order !== undefined ? { order } : {}),
});
// Árbol de prueba: TV y audio › OLED › OLED 4K, TV y audio › Barras, y Hogar › Cocina.
const categorias = [
  cat('hogar', 'Hogar'),
  cat('cocina', 'Cocina', 'hogar'),
  cat('tv', 'TV y audio', undefined, 1),
  cat('oled', 'OLED', 'tv', 1),
  cat('oled-4k', 'OLED 4K', 'oled'),
  cat('barras', 'Barras de sonido', 'tv', 2),
];
const prod = (id, name, sku, categoryId, brandId, active = true) => ({
  id,
  name,
  sku,
  categoryId,
  brandId,
  active,
  description: '',
  imageUrl: '',
  thumbnailUrl: '',
  price: 1,
  stock: 1,
  highlights: [],
  gallery: [],
});
const productos = [
  prod('p1', 'Cooler portátil', 'COOL-01', 'cocina', 'm-norte'),
  prod('p2', 'Televisor Visión', 'TV-55', 'tv', 'm-sur'),
  prod('p3', 'OLED Visión 55', 'OLED-55', 'oled', 'm-sur', false),
  prod('p4', 'OLED Visión 65 4K', 'OLED-65', 'oled-4k', 'm-norte'),
  prod('p5', 'Barra Sónica', 'BAR-01', 'barras', 'm-sur'),
  prod('p6', 'Licuadora Jesús', 'LIC-01', 'cocina', 'm-norte', false),
];
const ids = (lista) => lista.map((item) => item.id);
const filtrosP = (cambios) => ({ ...FILTROS_PRODUCTOS_VACIOS, ...cambios });

test('los filtros vacíos no filtran nada y tienen el estado «todos»', () => {
  assert.deepEqual(FILTROS_PRODUCTOS_VACIOS, {
    nombre: '',
    sku: '',
    categoriaId: '',
    marcaId: '',
    estado: 'todos',
  });
  assert.deepEqual(FILTROS_CATEGORIAS_VACIOS, { nombre: '', padreId: '' });
  assert.deepEqual(FILTROS_MARCAS_VACIOS, { nombre: '', estado: 'todos' });
  assert.equal(SIN_PADRE, 'sin-padre');
});

test('TEST-03: sin filtros, todos los productos en el orden de entrada', () => {
  assert.deepEqual(ids(filtrarProductos(productos, categorias, FILTROS_PRODUCTOS_VACIOS)), [
    'p1',
    'p2',
    'p3',
    'p4',
    'p5',
    'p6',
  ]);
  const alReves = [...productos].reverse();
  assert.deepEqual(ids(filtrarProductos(alReves, categorias, FILTROS_PRODUCTOS_VACIOS)), ids(alReves));
});

test('TEST-03: por nombre, sin mayúsculas, tildes ni espacios de los extremos', () => {
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ nombre: '  VISION ' }))), [
    'p2',
    'p3',
    'p4',
  ]);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ nombre: 'jesus' }))), ['p6']);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ nombre: 'cooler' }))), ['p1']);
  assert.equal(
    filtrarProductos(productos, categorias, filtrosP({ nombre: '   ' })).length,
    6,
    'espacios no filtran',
  );
});

test('TEST-03: por SKU, como texto contenido', () => {
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ sku: 'oled' }))), ['p3', 'p4']);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ sku: '-01' }))), [
    'p1',
    'p5',
    'p6',
  ]);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ sku: 'cooler' }))), []);
});

test('TEST-03: por categoría, con sus subcategorías a cualquier profundidad', () => {
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ categoriaId: 'tv' }))), [
    'p2',
    'p3',
    'p4',
    'p5',
  ]);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ categoriaId: 'oled' }))), [
    'p3',
    'p4',
  ]);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ categoriaId: 'oled-4k' }))), [
    'p4',
  ]);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ categoriaId: 'no-existe' }))), []);
});

test('TEST-03: por marca y por estado', () => {
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ marcaId: 'm-norte' }))), [
    'p1',
    'p4',
    'p6',
  ]);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ estado: 'activos' }))), [
    'p1',
    'p2',
    'p4',
    'p5',
  ]);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, filtrosP({ estado: 'inactivos' }))), [
    'p3',
    'p6',
  ]);
});

test('TEST-03: todos los filtros a la vez se cumplen juntos', () => {
  const todos = filtrosP({
    nombre: 'vision',
    sku: 'oled',
    categoriaId: 'tv',
    marcaId: 'm-sur',
    estado: 'inactivos',
  });
  assert.deepEqual(ids(filtrarProductos(productos, categorias, todos)), ['p3']);
  assert.deepEqual(ids(filtrarProductos(productos, categorias, { ...todos, estado: 'activos' })), []);
});

const marcas = [
  { id: 'm1', name: 'Sónica', active: true },
  { id: 'm2', name: 'Norte', active: false },
  { id: 'm3', name: 'Sonata', active: false },
];
const filtrosM = (cambios) => ({ ...FILTROS_MARCAS_VACIOS, ...cambios });

test('TEST-05: marcas por nombre, por estado y las dos a la vez, en el orden de entrada', () => {
  assert.deepEqual(ids(filtrarMarcas(marcas, FILTROS_MARCAS_VACIOS)), ['m1', 'm2', 'm3']);
  assert.deepEqual(ids(filtrarMarcas(marcas, filtrosM({ nombre: 'SON' }))), ['m1', 'm3']);
  assert.deepEqual(ids(filtrarMarcas(marcas, filtrosM({ estado: 'activos' }))), ['m1']);
  assert.deepEqual(ids(filtrarMarcas(marcas, filtrosM({ estado: 'inactivos' }))), ['m2', 'm3']);
  assert.deepEqual(ids(filtrarMarcas(marcas, filtrosM({ nombre: 'sonica', estado: 'inactivos' }))), []);
  assert.deepEqual(ids(filtrarMarcas(marcas, filtrosM({ nombre: 'son', estado: 'inactivos' }))), ['m3']);
});

// TEST-06: filtros y página en los parámetros de la URL.
test('TEST-06: sin parámetros, los filtros vacíos y la página 1', () => {
  assert.deepEqual(leerFiltrosProductos({}), FILTROS_PRODUCTOS_VACIOS);
  assert.deepEqual(leerFiltrosCategorias({}), FILTROS_CATEGORIAS_VACIOS);
  assert.deepEqual(leerFiltrosMarcas({}), FILTROS_MARCAS_VACIOS);
  assert.equal(leerPagina({}), 1);
});

test('TEST-06: los filtros de productos se leen de nombre, sku, categoria, marca y estado', () => {
  assert.deepEqual(
    leerFiltrosProductos({
      nombre: 'Cooler',
      sku: 'COOL',
      categoria: 'cat-tv',
      marca: 'brand-1',
      estado: 'inactivos',
      pagina: '2',
      otro: 'x',
    }),
    { nombre: 'Cooler', sku: 'COOL', categoriaId: 'cat-tv', marcaId: 'brand-1', estado: 'inactivos' },
  );
  assert.deepEqual(leerFiltrosCategorias({ nombre: 'oled', padre: 'cat-tv' }), {
    nombre: 'oled',
    padreId: 'cat-tv',
  });
  assert.deepEqual(leerFiltrosCategorias({ padre: SIN_PADRE }), { nombre: '', padreId: SIN_PADRE });
  assert.deepEqual(leerFiltrosMarcas({ nombre: 'son', estado: 'activos' }), {
    nombre: 'son',
    estado: 'activos',
  });
});

test('TEST-06: un estado desconocido se lee como «todos»', () => {
  for (const estado of ['todos', 'Activos', 'otro', '']) {
    assert.equal(leerFiltrosProductos({ estado }).estado, 'todos', `estado=${estado}`);
    assert.equal(leerFiltrosMarcas({ estado }).estado, 'todos', `estado=${estado}`);
  }
});

test('TEST-06: la página es un entero desde 1; si no es válida, la 1', () => {
  assert.equal(leerPagina({ pagina: '3' }), 3);
  assert.equal(leerPagina({ pagina: '12' }), 12);
  for (const pagina of ['0', '-2', '2.5', 'abc', '', ' 2', '1e2', undefined]) {
    assert.equal(leerPagina({ pagina }), 1, `pagina=${pagina}`);
  }
});

test('TEST-06: al escribir, los valores por defecto se omiten y la página nunca se escribe', () => {
  assert.deepEqual(parametrosDeFiltrosProductos(FILTROS_PRODUCTOS_VACIOS), {});
  assert.deepEqual(parametrosDeFiltrosCategorias(FILTROS_CATEGORIAS_VACIOS), {});
  assert.deepEqual(parametrosDeFiltrosMarcas(FILTROS_MARCAS_VACIOS), {});
  assert.deepEqual(
    parametrosDeFiltrosProductos({ ...FILTROS_PRODUCTOS_VACIOS, nombre: '   ', estado: 'activos' }),
    {
      estado: 'activos',
    },
  );
  for (const parametros of [
    parametrosDeFiltrosProductos({ ...FILTROS_PRODUCTOS_VACIOS, pagina: 3 }),
    parametrosDeFiltrosCategorias({ ...FILTROS_CATEGORIAS_VACIOS, pagina: 3 }),
    parametrosDeFiltrosMarcas({ ...FILTROS_MARCAS_VACIOS, pagina: 3 }),
  ]) {
    assert.equal('pagina' in parametros, false);
  }
});

test('TEST-06: los textos se escriben sin los espacios de los extremos', () => {
  assert.deepEqual(
    parametrosDeFiltrosProductos({ ...FILTROS_PRODUCTOS_VACIOS, nombre: '  Cooler portátil ' }),
    {
      nombre: 'Cooler portátil',
    },
  );
});

test('TEST-06: ida y vuelta de los tres filtros', () => {
  const productos = {
    nombre: 'Jesús',
    sku: 'LIC',
    categoriaId: 'cat-tv',
    marcaId: 'brand-2',
    estado: 'inactivos',
  };
  assert.deepEqual(parametrosDeFiltrosProductos(productos), {
    nombre: 'Jesús',
    sku: 'LIC',
    categoria: 'cat-tv',
    marca: 'brand-2',
    estado: 'inactivos',
  });
  assert.deepEqual(leerFiltrosProductos(parametrosDeFiltrosProductos(productos)), productos);
  for (const categorias of [
    { nombre: 'oled', padreId: 'cat-tv' },
    { nombre: '', padreId: SIN_PADRE },
  ]) {
    assert.deepEqual(leerFiltrosCategorias(parametrosDeFiltrosCategorias(categorias)), categorias);
  }
  assert.deepEqual(parametrosDeFiltrosCategorias({ nombre: 'oled', padreId: 'cat-tv' }), {
    nombre: 'oled',
    padre: 'cat-tv',
  });
  const marcas = { nombre: 'Sónica', estado: 'activos' };
  assert.deepEqual(parametrosDeFiltrosMarcas(marcas), { nombre: 'Sónica', estado: 'activos' });
  assert.deepEqual(leerFiltrosMarcas(parametrosDeFiltrosMarcas(marcas)), marcas);
});
