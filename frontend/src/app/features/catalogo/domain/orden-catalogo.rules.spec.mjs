/**
 * Orden del catálogo de la tienda (lote 52, ADR-0037, PBI-0278; decisión de Sebastián Avila del 2026-11-27): «Relevancia»
 * (el orden en que llega el catálogo, por defecto), el precio de menor a mayor y de mayor a menor y el nombre de la A a
 * la Z y de la Z a la A. El orden va en la URL (`?orden=`); un valor desconocido se lee como «Relevancia». El nombre se
 * compara en español sin distinguir mayúsculas ni tildes y, a igualdad, manda el orden de «Relevancia».
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./orden-catalogo.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  OPCIONES_DE_ORDEN,
  ORDEN_POR_DEFECTO,
  leerOrdenCatalogo,
  parametrosDeOrdenCatalogo,
  ordenarProductos,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

const producto = (id, name, price) => ({ id, name, price });
// El orden de «Relevancia» es el de esta lista, el que da el BFF.
const productos = [
  producto('p1', 'Órgano digital', 1899),
  producto('p2', 'lavadora SmartWash', 699),
  producto('p3', 'Microondas EasyCook', 1899),
  producto('p4', 'Ñandú de peluche', 49),
  producto('p5', 'Nevera compacta', 699),
  producto('p6', 'Lavadora smartwash', 2399),
];
const ids = (lista) => lista.map((p) => p.id);

test('PBI-0278: las cinco opciones, con «Relevancia» primero y por defecto', () => {
  assert.deepEqual(
    OPCIONES_DE_ORDEN.map((opcion) => [opcion.valor, opcion.etiqueta]),
    [
      ['relevancia', 'Relevancia'],
      ['precio-asc', 'Precio: menor a mayor'],
      ['precio-desc', 'Precio: mayor a menor'],
      ['nombre-asc', 'Nombre: A–Z'],
      ['nombre-desc', 'Nombre: Z–A'],
    ],
  );
  assert.equal(ORDEN_POR_DEFECTO, 'relevancia');
});

test('PBI-0278: «Relevancia» deja el catálogo como llega y no crea una lista nueva sin necesidad', () => {
  assert.deepEqual(ids(ordenarProductos(productos, 'relevancia')), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  assert.deepEqual(ids(productos), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
});

test('PBI-0278: el precio, de menor a mayor y de mayor a menor; a igual precio, el orden de «Relevancia»', () => {
  assert.deepEqual(ids(ordenarProductos(productos, 'precio-asc')), ['p4', 'p2', 'p5', 'p1', 'p3', 'p6']);
  assert.deepEqual(ids(ordenarProductos(productos, 'precio-desc')), ['p6', 'p1', 'p3', 'p2', 'p5', 'p4']);
});

test('PBI-0278: el nombre, en español, sin distinguir mayúsculas ni tildes; a igual nombre, el orden de «Relevancia»', () => {
  // «Órgano» va con la O, no al final; la Ñ va después de la N, como en el alfabeto español; «lavadora SmartWash» y
  // «Lavadora smartwash» son el mismo nombre y quedan como en «Relevancia» en los dos sentidos.
  assert.deepEqual(ids(ordenarProductos(productos, 'nombre-asc')), ['p2', 'p6', 'p3', 'p5', 'p4', 'p1']);
  assert.deepEqual(ids(ordenarProductos(productos, 'nombre-desc')), ['p1', 'p4', 'p5', 'p3', 'p2', 'p6']);
});

test('PBI-0278: ordenar no cambia la lista que recibe', () => {
  const copia = [...productos];
  ordenarProductos(productos, 'precio-desc');
  ordenarProductos(productos, 'nombre-asc');
  assert.deepEqual(productos, copia);
});

test('PBI-0278: el orden se lee de la URL; vacío, desconocido o con otras mayúsculas es «Relevancia»', () => {
  assert.equal(leerOrdenCatalogo('precio-asc'), 'precio-asc');
  assert.equal(leerOrdenCatalogo('precio-desc'), 'precio-desc');
  assert.equal(leerOrdenCatalogo('nombre-asc'), 'nombre-asc');
  assert.equal(leerOrdenCatalogo('nombre-desc'), 'nombre-desc');
  assert.equal(leerOrdenCatalogo('relevancia'), 'relevancia');
  for (const valor of [undefined, null, '', 'precio', 'PRECIO-ASC', 'toString', '__proto__', 'nombre-asc '])
    assert.equal(leerOrdenCatalogo(valor), 'relevancia', String(valor));
});

test('PBI-0278: la URL lleva `orden` solo si no es «Relevancia»', () => {
  assert.deepEqual(parametrosDeOrdenCatalogo('relevancia'), {});
  assert.deepEqual(parametrosDeOrdenCatalogo('precio-desc'), { orden: 'precio-desc' });
  assert.deepEqual(parametrosDeOrdenCatalogo('nombre-asc'), { orden: 'nombre-asc' });
});
