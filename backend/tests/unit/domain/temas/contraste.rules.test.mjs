/**
 * Pruebas unitarias de las reglas de contraste y mezcla de color de los temas: funciones puras,
 * sin servidor ni archivo de estado. Los casos viven en `casos-tema.json`, compartido con la
 * réplica de estas reglas en el Admin (TEST-14).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  mezclarSrgb,
  relacionDeContraste,
  textoMasLegible,
} from '../../../../src/domain/temas/contraste.rules.mjs';

const casos = JSON.parse(readFileSync(new URL('./casos-tema.json', import.meta.url)));

test('la relación de contraste WCAG coincide con los casos, también en orden inverso', () => {
  for (const { a, b, relacion, decimales } of casos.contraste) {
    const factor = 10 ** decimales;
    const obtenida = Math.round(relacionDeContraste(a, b) * factor) / factor;
    assert.equal(obtenida, relacion, `contraste de ${a} sobre ${b}`);
  }
});

test('la mezcla en sRGB coincide con color-mix y devuelve mayúsculas', () => {
  for (const { a, peso, b, resultado } of casos.mezcla) {
    assert.equal(mezclarSrgb(a, peso, b), resultado, `mezcla de ${a} al ${peso} con ${b}`);
  }
});

test('el texto más legible elige el mayor contraste, el primero en empate y tal como llegó', () => {
  for (const { fondo, candidatos, resultado } of casos.textoMasLegible) {
    assert.equal(textoMasLegible(fondo, candidatos), resultado, `texto sobre ${fondo}`);
  }
});

test('un valor que no sea #RRGGBB es un error de programación', () => {
  assert.throws(() => relacionDeContraste('azul', '#FFFFFF'), Error);
  assert.throws(() => mezclarSrgb('#FFF', 0.5, '#000000'), Error);
  assert.throws(() => textoMasLegible('#12345G', ['#FFFFFF']), Error);
});
