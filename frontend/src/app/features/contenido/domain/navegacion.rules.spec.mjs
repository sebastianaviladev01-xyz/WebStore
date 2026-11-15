/**
 * Navegación de la cabecera de la tienda (PBI-0118, lote 05, ADR-0017). Las reglas salen de `app.layout.ts` sin
 * cambiar de comportamiento: la «Navegación superior» del CMS es una lista de textos y la ruta de cada uno se deduce
 * de sus palabras. Por eso un texto que no se reconoce no lleva a ninguna parte; la advertencia en el Admin al
 * renombrar un enlace es PBI-0153, del lote 07.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./navegacion.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { normalizarEtiqueta, enlaceDeNavegacion, ordenarPorNavegacion } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const todas = {
  contactPageEnabled: true,
  shippingPageEnabled: true,
  privacyPageEnabled: true,
  termsPageEnabled: true,
};
const ninguna = {
  contactPageEnabled: false,
  shippingPageEnabled: false,
  privacyPageEnabled: false,
  termsPageEnabled: false,
};

test('normalizarEtiqueta quita tildes, espacios de los extremos y mayúsculas', () => {
  assert.equal(normalizarEtiqueta('  Envíos y Términos '), 'envios y terminos');
});

test('cada texto conocido lleva a su página, si está habilitada', () => {
  assert.deepEqual(enlaceDeNavegacion('Envíos', todas), {
    label: 'Envíos',
    route: '/info/envios',
    icon: 'truck',
  });
  assert.deepEqual(enlaceDeNavegacion('Ayuda', todas), { label: 'Ayuda', route: '/info/contacto' });
  assert.deepEqual(enlaceDeNavegacion('Contacto', todas), { label: 'Contacto', route: '/info/contacto' });
  assert.deepEqual(enlaceDeNavegacion('Privacidad', todas), {
    label: 'Privacidad',
    route: '/info/privacidad',
  });
  assert.deepEqual(enlaceDeNavegacion('Términos', todas), { label: 'Términos', route: '/info/terminos' });
  assert.deepEqual(enlaceDeNavegacion('Libro de reclamaciones', ninguna), {
    label: 'Libro de reclamaciones',
    route: '/libro-reclamaciones',
  });
  assert.deepEqual(enlaceDeNavegacion('Mi cuenta', ninguna), { label: 'Mi cuenta', route: '/cuenta/login' });
  for (const etiqueta of ['Envíos', 'Contacto', 'Privacidad', 'Términos'])
    assert.equal(enlaceDeNavegacion(etiqueta, ninguna), null, etiqueta);
});

test('lo que la cabecera ya ofrece y lo que no se reconoce no se muestra', () => {
  for (const etiqueta of ['Inicio', 'Productos', 'Pedidos', 'Despachos', 'Ofertas'])
    assert.equal(enlaceDeNavegacion(etiqueta, todas), null, etiqueta);
});

test('las categorías siguen el orden de la navegación lateral y, después, su orden y su nombre', () => {
  const categorias = [
    { id: 'a', name: 'Cocina' },
    { id: 'b', name: 'Audio', order: 2 },
    { id: 'c', name: 'Electrohogar' },
    { id: 'd', name: 'TV y audio' },
    { id: 'e', name: 'Climatización', order: 1 },
  ];
  assert.deepEqual(
    ordenarPorNavegacion(categorias, ['tv y audio', 'Electrohogar']).map((c) => c.id),
    ['d', 'c', 'e', 'b', 'a'],
  );
});
