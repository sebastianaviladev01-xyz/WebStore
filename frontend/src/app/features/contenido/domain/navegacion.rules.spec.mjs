/**
 * Navegación de la cabecera de la tienda (PBI-0118, lote 05, ADR-0017): el orden de las categorías sigue la
 * «Navegación lateral» del CMS. Desde el lote 15 (PBI-0175), la «Navegación superior» es una lista de avisos
 * (`aviso.rules.ts`) y la cabecera ya no deduce rutas de las palabras.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./navegacion.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { normalizarEtiqueta, enlacesDeLaCabecera, ordenarPorNavegacion } = await import(
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

// Lote 15 (ADR-0021), PBI-0175: la «Navegación superior» de Contenido pasa a ser una lista de avisos y la tienda deja
// de deducir rutas de las palabras. El enlace «Envíos» que esa navegación ponía junto a las categorías queda fijo en
// la cabecera, como «Ayuda» en la barra superior, y solo se muestra si la página Envíos está activa.
test('PBI-0175: junto a las categorías, la cabecera ofrece Envíos si su página está activa', () => {
  assert.deepEqual(enlacesDeLaCabecera(todas), [{ label: 'Envíos', route: '/info/envios', icon: 'truck' }]);
  assert.deepEqual(enlacesDeLaCabecera(ninguna), []);
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
