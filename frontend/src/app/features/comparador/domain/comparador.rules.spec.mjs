/**
 * Comparador de productos (lote 19, ADR-0021, PBI-0001; confirmado por Sebastián Avila; Daniel lo había
 * dejado «más adelante»). La lista se guarda solo en memoria y en la URL (`/comparar?ids=…`), porque STD-08 no permite
 * más datos en el navegador que el carrito y la sesión.
 *
 * - Hasta 4 productos, sin repetidos; al pasar el máximo no se agrega y se avisa.
 * - La URL se lee con tolerancia: espacios, vacíos y repetidos fuera, y solo los 4 primeros.
 * - Los productos que ya no están en el catálogo (eliminados o inactivos) salen de la comparación.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./comparador.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  MAXIMO_A_COMPARAR,
  alternarEnComparar,
  quitarDeComparar,
  idsDesdeLaUrl,
  idsParaLaUrl,
  productosAComparar,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

test('se comparan hasta 4 productos', () => {
  assert.equal(MAXIMO_A_COMPARAR, 4);
});

test('alternar agrega al final un producto que no está y quita uno que ya está', () => {
  assert.deepEqual(alternarEnComparar([], 'p-1'), { ids: ['p-1'], resultado: 'agregado' });
  assert.deepEqual(alternarEnComparar(['p-1'], 'p-2'), { ids: ['p-1', 'p-2'], resultado: 'agregado' });
  assert.deepEqual(alternarEnComparar(['p-1', 'p-2'], 'p-1'), { ids: ['p-2'], resultado: 'quitado' });
});

test('con 4 productos, uno más no se agrega y se avisa; quitar sigue funcionando', () => {
  const llena = ['p-1', 'p-2', 'p-3', 'p-4'];
  assert.deepEqual(alternarEnComparar(llena, 'p-5'), { ids: llena, resultado: 'lleno' });
  assert.deepEqual(alternarEnComparar(llena, 'p-3'), { ids: ['p-1', 'p-2', 'p-4'], resultado: 'quitado' });
});

test('quitar un producto que no está no cambia nada', () => {
  assert.deepEqual(quitarDeComparar(['p-1', 'p-2'], 'p-1'), ['p-2']);
  assert.deepEqual(quitarDeComparar(['p-1'], 'p-9'), ['p-1']);
});

test('la URL se lee sin vacíos, sin espacios ni repetidos, y con los 4 primeros', () => {
  assert.deepEqual(idsDesdeLaUrl('p-1,p-2'), ['p-1', 'p-2']);
  assert.deepEqual(idsDesdeLaUrl(' p-1 , ,p-2,p-1,'), ['p-1', 'p-2']);
  assert.deepEqual(idsDesdeLaUrl('a,b,c,d,e,f'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(idsDesdeLaUrl(''), []);
  assert.deepEqual(idsDesdeLaUrl(null), []);
  assert.deepEqual(idsDesdeLaUrl(undefined), []);
});

test('la lista va a la URL separada por comas; vacía, sin parámetro', () => {
  assert.equal(idsParaLaUrl(['p-1', 'p-2']), 'p-1,p-2');
  assert.equal(idsParaLaUrl([]), null);
});

test('los productos se comparan en el orden de la lista; los que ya no están en el catálogo salen', () => {
  const catalogo = [{ id: 'p-1' }, { id: 'p-2' }, { id: 'p-3' }];
  assert.deepEqual(productosAComparar(['p-3', 'p-1'], catalogo), {
    productos: [{ id: 'p-3' }, { id: 'p-1' }],
    retirados: [],
  });
  assert.deepEqual(productosAComparar(['p-9', 'p-2', 'p-8'], catalogo), {
    productos: [{ id: 'p-2' }],
    retirados: ['p-9', 'p-8'],
  });
  assert.deepEqual(productosAComparar([], catalogo), { productos: [], retirados: [] });
});
