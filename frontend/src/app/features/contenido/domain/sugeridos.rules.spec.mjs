/**
 * Dónde muestra la tienda los productos sugeridos al agregar al carrito (lote 16, ADR-0021, PBI-0179; confirmado por
 * Sebastián Avila): el diálogo «Producto agregado» (por defecto) o un panel lateral, según la configuración de la
 * tienda. Un valor que la tienda no conoce, o la configuración de respaldo sin el campo, se lee como el diálogo: lo de
 * siempre.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./sugeridos.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { LUGAR_DE_SUGERIDOS_POR_DEFECTO, lugarDeLosSugeridos } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0179: el panel lateral solo si la configuración lo elige; si no, el diálogo', () => {
  assert.equal(LUGAR_DE_SUGERIDOS_POR_DEFECTO, 'dialog');
  assert.equal(lugarDeLosSugeridos({ addToCartDisplay: 'side-panel' }), 'side-panel');
  assert.equal(lugarDeLosSugeridos({ addToCartDisplay: 'dialog' }), 'dialog');
  for (const otro of [undefined, '', 'panel', 'SIDE-PANEL', null, 3])
    assert.equal(lugarDeLosSugeridos({ addToCartDisplay: otro }), 'dialog', String(otro));
  assert.equal(lugarDeLosSugeridos({}), 'dialog');
});
