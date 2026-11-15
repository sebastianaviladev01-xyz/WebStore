import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017), PBI-0119: el Admin reduce cada foto antes de guardarla (lado mayor acotado) y prueba
// calidades de mayor a menor hasta que cabe; si ni con la menor cabe, la rechaza.
const source = await readFile(new URL('./foto.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { medidasReducidas, primeraQueCabe, LADO_MAXIMO_FOTO, BYTES_MAXIMOS_FOTO, CALIDADES_FOTO } =
  await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

test('PBI-0119: el lado mayor se reduce al máximo conservando la proporción; una foto chica no se agranda', () => {
  assert.equal(LADO_MAXIMO_FOTO, 1600);
  assert.deepEqual(medidasReducidas(4000, 3000), { ancho: 1600, alto: 1200 });
  assert.deepEqual(medidasReducidas(1000, 3000), { ancho: 533, alto: 1600 });
  assert.deepEqual(medidasReducidas(800, 600), { ancho: 800, alto: 600 });
});

test('PBI-0119: se usa la primera calidad cuya foto cabe, y ninguna si ni la última cabe', () => {
  assert.equal(BYTES_MAXIMOS_FOTO, 250 * 1024);
  assert.deepEqual([...CALIDADES_FOTO], [0.85, 0.75, 0.6, 0.45]);
  const dataUrl = (bytes) => `data:image/jpeg;base64,${'A'.repeat(bytes)}`;
  assert.equal(primeraQueCabe([dataUrl(300_000), dataUrl(200_000), dataUrl(100_000)]), dataUrl(200_000));
  assert.equal(primeraQueCabe([dataUrl(300_000), dataUrl(260_000)]), null);
});

test('PBI-0119: seis fotos al máximo, con el resto del producto, caben en un guardado de 2 MB', () => {
  assert.ok(7 * BYTES_MAXIMOS_FOTO < 2 * 1024 * 1024 - 64 * 1024);
});
