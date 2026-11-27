import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 24 (ADR-0025, PBI-0221; confirmado por Sebastián Avila): Daniel no entendía «Tono de la foto». El backoffice lo
// calcula al cargar la imagen de escritorio del banner: mira la esquina inferior derecha, donde van los controles del
// carrusel, y si es oscura (luminancia media por debajo del gris medio, L* = 50) elige los controles oscuros (`dark`);
// si no, los claros.
const source = await readFile(new URL('./tono-de-foto.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { zonaDeLosControles, tonoDeLaZona, LUMINANCIA_DE_CORTE } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

/** `n` píxeles RGBA del mismo color. */
const pixeles = (n, [r, g, b, a = 255]) =>
  Uint8ClampedArray.from({ length: n * 4 }, (_, i) => [r, g, b, a][i % 4]);

test('PBI-0221: la zona de los controles es la esquina inferior derecha de la foto', () => {
  assert.deepEqual(zonaDeLosControles(2560, 1024), { x: 1792, y: 768, ancho: 768, alto: 256 });
  assert.deepEqual(zonaDeLosControles(1000, 400), { x: 700, y: 300, ancho: 300, alto: 100 });
  const chica = zonaDeLosControles(3, 3);
  assert.ok(chica.ancho >= 1 && chica.alto >= 1, 'una foto diminuta tiene al menos un píxel de zona');
});

test('PBI-0221: el corte es el gris medio (luminancia relativa 0,18, L* = 50)', () => {
  assert.equal(LUMINANCIA_DE_CORTE, 0.18);
});

test('PBI-0221: una esquina clara pide los controles claros y una oscura, los oscuros', () => {
  assert.equal(tonoDeLaZona(pixeles(10, [255, 255, 255])), 'light');
  assert.equal(tonoDeLaZona(pixeles(10, [0, 0, 0])), 'dark');
  // sRGB 128 es una luminancia de 0,216 (más clara que el gris medio); sRGB 110, de 0,155.
  assert.equal(tonoDeLaZona(pixeles(10, [128, 128, 128])), 'light');
  assert.equal(tonoDeLaZona(pixeles(10, [110, 110, 110])), 'dark');
  // La madera de la sala de ejemplo: marrón medio-oscuro.
  assert.equal(tonoDeLaZona(pixeles(10, [92, 64, 45])), 'dark');
});

test('PBI-0221: cuenta la media de la zona, no un píxel suelto', () => {
  const mezcla = new Uint8ClampedArray([...pixeles(9, [250, 250, 250]), ...pixeles(1, [0, 0, 0])]);
  assert.equal(tonoDeLaZona(mezcla), 'light');
  const oscura = new Uint8ClampedArray([...pixeles(9, [20, 20, 20]), ...pixeles(1, [255, 255, 255])]);
  assert.equal(tonoDeLaZona(oscura), 'dark');
});

test('PBI-0221: lo transparente se toma como fondo claro, y sin píxeles quedan los controles claros', () => {
  assert.equal(tonoDeLaZona(pixeles(10, [0, 0, 0, 0])), 'light');
  assert.equal(tonoDeLaZona(new Uint8ClampedArray()), 'light');
});
