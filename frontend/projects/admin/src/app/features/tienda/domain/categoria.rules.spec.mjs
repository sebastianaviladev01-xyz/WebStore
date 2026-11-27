import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// TEST-07 (feature 008): caracterización de `categoria.rules.ts` tal como está, antes de que los filtros del
// catálogo dependan de ella. Fija lo que hace hoy; no cambia la regla.
// Lote 29 (PBI-0238): la búsqueda usa `textoBuscable` de `listado.rules.ts`, que se antepone sin sus import.
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const source = [await leer('./listado.rules.ts'), await leer('./categoria.rules.ts')].join('\n');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { aplanarArbolCategorias, buscarCategorias, idsDescendientes, opcionesDeCategoria } = await import(
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

// Lote 29 (ADR-0027, PBI-0238; confirmado por Sebastián Avila): la categoría del filtro de Productos y del registro
// del producto se elige con búsqueda. Daniel: busca «en todos los niveles donde esté una categoría» (electrodomésticos,
// refrigeradoras y, dentro, side by side), desde «mínimo tres caracteres», y cada opción muestra su ruta.
// Electrodomésticos › Refrigeradoras › (Frigobar, Side by side); Electrodomésticos › Lavadoras; TV y audio › OLED;
// Bebidas › Refrescos.
const ARBOL = [
  cat('beb', 'Bebidas', undefined, 3),
  cat('side', 'Side by side', 'refri'),
  cat('tv', 'TV y audio', undefined, 2),
  cat('refri', 'Refrigeradoras', 'elec', 1),
  cat('frigo', 'Frigobar', 'refri'),
  cat('elec', 'Electrodomésticos', undefined, 1),
  cat('lava', 'Lavadoras', 'elec', 2),
  cat('oled', 'OLED', 'tv'),
  cat('refrescos', 'Refrescos', 'beb'),
];
const rutas = (opciones) => opciones.map(({ ruta }) => ruta);

test('PBI-0238: opcionesDeCategoria da cada categoría con su ruta, en el orden del árbol', () => {
  const opciones = opcionesDeCategoria(ARBOL);
  assert.deepEqual(rutas(opciones), [
    'Electrodomésticos',
    'Electrodomésticos › Refrigeradoras',
    'Electrodomésticos › Refrigeradoras › Frigobar',
    'Electrodomésticos › Refrigeradoras › Side by side',
    'Electrodomésticos › Lavadoras',
    'TV y audio',
    'TV y audio › OLED',
    'Bebidas',
    'Bebidas › Refrescos',
  ]);
  const side = opciones.find(({ category }) => category.id === 'side');
  assert.deepEqual(side.ancestros, ['Electrodomésticos', 'Refrigeradoras']);
  assert.equal(side.category.name, 'Side by side');
  assert.deepEqual(opciones[0].ancestros, []);
});

test('PBI-0238: una categoría sin padre existente o atrapada en un ciclo tiene solo su nombre como ruta', () => {
  const opciones = opcionesDeCategoria([
    cat('huerfana', 'Huérfana', 'no-existe'),
    cat('x', 'Equis', 'y'),
    cat('y', 'Ye', 'x'),
  ]);
  assert.deepEqual(rutas(opciones), ['Huérfana', 'Equis', 'Ye']);
  assert.deepEqual(opcionesDeCategoria([]), []);
});

test('PBI-0238: con menos de tres caracteres (sin contar espacios ni tildes) no se filtra: están todas', () => {
  const opciones = opcionesDeCategoria(ARBOL);
  for (const texto of ['', '   ', 'S', 'sí', '  Re  ']) {
    assert.deepEqual(rutas(buscarCategorias(opciones, texto)), rutas(opciones), JSON.stringify(texto));
  }
});

test('PBI-0238: desde el tercer carácter busca en todos los niveles, sin distinguir mayúsculas ni tildes', () => {
  const opciones = opcionesDeCategoria(ARBOL);
  assert.deepEqual(rutas(buscarCategorias(opciones, 'SIDE')), [
    'Electrodomésticos › Refrigeradoras › Side by side',
  ]);
  assert.deepEqual(rutas(buscarCategorias(opciones, 'oled')), ['TV y audio › OLED']);
  assert.deepEqual(rutas(buscarCategorias(opciones, 'side by')), [
    'Electrodomésticos › Refrigeradoras › Side by side',
  ]);
  assert.deepEqual(rutas(buscarCategorias(opciones, 'ELECTRODOMESTICOS')), [
    'Electrodomésticos',
    'Electrodomésticos › Refrigeradoras',
    'Electrodomésticos › Refrigeradoras › Frigobar',
    'Electrodomésticos › Refrigeradoras › Side by side',
    'Electrodomésticos › Lavadoras',
  ]);
  assert.deepEqual(rutas(buscarCategorias(opciones, 'Ñandú')), []);
});

test('PBI-0238: primero las que coinciden por su nombre y después las que están dentro de una que coincide', () => {
  const opciones = opcionesDeCategoria(ARBOL);
  // Enter elige la primera coincidencia: una cuyo nombre lleva lo escrito, no una subcategoría de otra.
  assert.deepEqual(rutas(buscarCategorias(opciones, 'refr')), [
    'Electrodomésticos › Refrigeradoras',
    'Bebidas › Refrescos',
    'Electrodomésticos › Refrigeradoras › Frigobar',
    'Electrodomésticos › Refrigeradoras › Side by side',
  ]);
});
