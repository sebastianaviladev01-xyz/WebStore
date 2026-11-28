import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 45 (ADR-0033, PBI-0270): «Distribución de ventas por categoría» del Dashboard, como la del panel del SGC. Las
// ventas son las de la cifra «Total de ventas» (PBI-0186): el valor de los productos (`subtotal`), sin el envío ni los
// pedidos cancelados. Cada pedido reparte su `subtotal` entre sus líneas según su valor, y cada línea cuenta para la
// categoría principal (la raíz del árbol) de su producto.
const fuente = (await readFile(new URL('./distribucion-ventas.rules.ts', import.meta.url), 'utf8')).replace(
  /^import .*$/gm,
  '',
);
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { distribucionPorCategoria, MAXIMO_DE_CATEGORIAS, SERIE_DE_TONOS, tonoDeParticipacion } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

const CATEGORIAS = [
  { id: 'cat-tv', name: 'TV y audio' },
  { id: 'cat-tv-oled', name: 'OLED', parentId: 'cat-tv' },
  { id: 'cat-tv-oled-55', name: 'OLED 55', parentId: 'cat-tv-oled' },
  { id: 'cat-home', name: 'Electrohogar' },
  { id: 'cat-kitchen', name: 'Cocina' },
];
const PRODUCTOS = [
  { id: 'p-tv', categoryId: 'cat-tv' },
  { id: 'p-oled', categoryId: 'cat-tv-oled-55' },
  { id: 'p-home', categoryId: 'cat-home' },
  { id: 'p-kitchen', categoryId: 'cat-kitchen' },
  { id: 'p-huerfano', categoryId: 'cat-borrada' },
];
const linea = (productId, quantity, unitPrice) => ({ productId, quantity, unitPrice });
let siguiente = 0;
/** Cada pedido lleva S/ 15 de envío en su total: la distribución no debe contarlo. */
const pedido = (items, subtotal, status = 'delivered') => ({
  id: `P-${++siguiente}`,
  status,
  items,
  subtotal,
  shippingCost: 15,
  total: subtotal + 15,
});
const resumen = (filas) => filas.map(({ nombre, monto, porcentaje }) => [nombre, monto, porcentaje]);

test('reparte las ventas por la categoría principal del producto, de mayor a menor, sin envío ni cancelados', () => {
  const filas = distribucionPorCategoria(
    [
      // Una subcategoría de dos niveles cuenta para su raíz, «TV y audio».
      pedido([linea('p-oled', 2, 100), linea('p-home', 1, 100)], 300),
      pedido([linea('p-tv', 1, 100)], 100),
      // El cancelado no cuenta, aunque sea el más grande.
      pedido([linea('p-kitchen', 1, 5000)], 5000, 'cancelled'),
      pedido([linea('p-kitchen', 1, 50)], 50, 'confirmed'),
    ],
    PRODUCTOS,
    CATEGORIAS,
  );
  assert.deepEqual(resumen(filas), [
    ['TV y audio', 300, 67],
    ['Electrohogar', 100, 22],
    ['Cocina', 50, 11],
  ]);
  assert.deepEqual(
    filas.map((fila) => fila.clave),
    ['cat-tv', 'cat-home', 'cat-kitchen'],
  );
});

test('los montos suman exactamente las ventas: cada pedido reparte su subtotal entre sus líneas', () => {
  const pedidos = [
    // Las líneas suman 100, pero el subtotal es 90 (un pedido antiguo): se reparte 45 y 45.
    pedido([linea('p-tv', 1, 50), linea('p-home', 1, 50)], 90),
    // Tres líneas iguales y 100.00: los céntimos que sobran van a las primeras (33.34, 33.33 y 33.33).
    pedido([linea('p-tv', 1, 10), linea('p-home', 1, 10), linea('p-kitchen', 1, 10)], 100),
  ];
  const filas = distribucionPorCategoria(pedidos, PRODUCTOS, CATEGORIAS);
  assert.deepEqual(resumen(filas), [
    ['TV y audio', 78.34, 41],
    ['Electrohogar', 78.33, 41],
    ['Cocina', 33.33, 18],
  ]);
  const suma = Math.round(filas.reduce((total, fila) => total + fila.monto * 100, 0));
  assert.equal(suma, 19000, 'S/ 190.00, la suma de los subtotales');
  assert.equal(
    filas.reduce((total, fila) => total + fila.porcentaje, 0),
    100,
  );
});

test('un producto o una categoría que ya no existen, y un pedido sin líneas, van a «Sin categoría»', () => {
  const filas = distribucionPorCategoria(
    [
      pedido([linea('p-borrado', 1, 40)], 40),
      pedido([linea('p-huerfano', 1, 20)], 20),
      pedido([], 40),
      pedido([linea('p-tv', 1, 100)], 100),
    ],
    PRODUCTOS,
    CATEGORIAS,
  );
  assert.deepEqual(resumen(filas), [
    ['Sin categoría', 100, 50],
    ['TV y audio', 100, 50],
  ]);
  assert.equal(filas[0].clave, 'sin-categoria');
});

test('con montos iguales, el orden es alfabético; un árbol con un ciclo no se recorre sin fin', () => {
  const conCiclo = [
    { id: 'a', name: 'Ciclo A', parentId: 'b' },
    { id: 'b', name: 'Ciclo B', parentId: 'a' },
    { id: 'cat-home', name: 'Electrohogar' },
  ];
  const filas = distribucionPorCategoria(
    [pedido([linea('p-ciclo', 1, 10), linea('p-home', 1, 10)], 20)],
    [
      { id: 'p-ciclo', categoryId: 'a' },
      { id: 'p-home', categoryId: 'cat-home' },
    ],
    conCiclo,
  );
  assert.equal(filas.length, 2);
  assert.deepEqual(
    filas.map((fila) => fila.porcentaje),
    [50, 50],
  );
  assert.equal(filas[1].nombre, 'Electrohogar');
});

test('pasadas las seis primeras, las demás categorías se agrupan en «Otras», al final', () => {
  assert.equal(MAXIMO_DE_CATEGORIAS, 6);
  const categorias = Array.from({ length: 9 }, (_, i) => ({ id: `c-${i + 1}`, name: `Categoría ${i + 1}` }));
  const productos = categorias.map((categoria) => ({ id: `p-${categoria.id}`, categoryId: categoria.id }));
  // Montos 90, 80 … 10: las seis primeras suman 390 y las tres últimas, 60 (más que la sexta, pero van al final).
  const pedidos = categorias.map((categoria, i) =>
    pedido([linea(`p-${categoria.id}`, 1, (9 - i) * 10)], (9 - i) * 10),
  );
  const filas = distribucionPorCategoria(pedidos.reverse(), productos, categorias);
  assert.deepEqual(resumen(filas), [
    ['Categoría 1', 90, 20],
    ['Categoría 2', 80, 18],
    ['Categoría 3', 70, 16],
    ['Categoría 4', 60, 13],
    ['Categoría 5', 50, 11],
    ['Categoría 6', 40, 9],
    ['Otras', 60, 13],
  ]);
  assert.equal(filas.at(-1).clave, 'otras');

  const seis = distribucionPorCategoria(pedidos.slice(0, 6), productos, categorias);
  assert.equal(seis.length, 6, 'con seis categorías no hay «Otras»');
  assert.ok(seis.every((fila) => fila.clave !== 'otras'));
});

test('sin ventas (sin pedidos, solo cancelados o con subtotal 0) no hay distribución', () => {
  assert.deepEqual(distribucionPorCategoria([], PRODUCTOS, CATEGORIAS), []);
  assert.deepEqual(
    distribucionPorCategoria([pedido([linea('p-tv', 1, 10)], 10, 'cancelled')], PRODUCTOS, CATEGORIAS),
    [],
  );
  assert.deepEqual(distribucionPorCategoria([pedido([linea('p-tv', 1, 0)], 0)], PRODUCTOS, CATEGORIAS), []);
});

// Lote 50 (ADR-0037, PBI-0288; decisión de Sebastián Avila del 2026-11-27, «Lotes 50 a 56»): cada barra lleva un color
// distinto de una serie fija sacada de los colores del tema y de estado, en el mismo orden en cada carga (por la posición
// de la fila, que ya va de mayor a menor); «Otras» sigue en gris. La cifra y el nombre siguen en texto.
test('PBI-0288: la serie es fija, sin repetir, y alcanza para todas las categorías con nombre', () => {
  assert.deepEqual(SERIE_DE_TONOS, ['principal', 'exito', 'acento', 'principal-fuerte', 'peligro', 'alerta']);
  assert.equal(new Set(SERIE_DE_TONOS).size, SERIE_DE_TONOS.length);
  assert.ok(SERIE_DE_TONOS.length >= MAXIMO_DE_CATEGORIAS, 'ninguna barra con nombre repite color');
  assert.ok(!SERIE_DE_TONOS.includes('neutro'), 'el gris queda para «Otras»');
});

test('PBI-0288: cada fila toma el color de su posición; «Otras», el gris', () => {
  const claves = ['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'otras'];
  assert.deepEqual(
    claves.map((clave, posicion) => tonoDeParticipacion(clave, posicion)),
    [...SERIE_DE_TONOS, 'neutro'],
  );
  assert.equal(tonoDeParticipacion('otras', 0), 'neutro');
  assert.equal(tonoDeParticipacion('sin-categoria', 2), 'acento', '«Sin categoría» es una categoría más');
});

test('PBI-0288: el mismo orden da los mismos colores en cada carga', () => {
  const primera = distribucionPorCategoria(
    [pedido([linea('p-tv', 1, 60), linea('p-home', 1, 40)], 100)],
    PRODUCTOS,
    CATEGORIAS,
  );
  const segunda = distribucionPorCategoria(
    [pedido([linea('p-home', 1, 40), linea('p-tv', 1, 60)], 100)],
    PRODUCTOS,
    CATEGORIAS,
  );
  const tonos = (filas) =>
    filas.map((fila, posicion) => [fila.nombre, tonoDeParticipacion(fila.clave, posicion)]);
  assert.deepEqual(tonos(primera), [
    ['TV y audio', 'principal'],
    ['Electrohogar', 'exito'],
  ]);
  assert.deepEqual(tonos(segunda), tonos(primera));
});
