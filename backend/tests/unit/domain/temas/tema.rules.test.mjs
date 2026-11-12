/**
 * Pruebas unitarias de las reglas de un tema: derivación de sus tokens (D2, con la regla de la base neutra),
 * cálculo de los colores que pinta el navegador y medida de sus pares de contraste. Funciones puras.
 * Los casos salen de `casos-tema.json`, que también recorre la réplica del Admin (TEST-14).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PARES_DE_CONTRASTE,
  TOKENS_DEL_TEMA,
  coloresCalculados,
  medirPares,
  tokensDelTema,
} from '../../../../src/domain/temas/tema.rules.mjs';

const casos = JSON.parse(readFileSync(new URL('./casos-tema.json', import.meta.url), 'utf8'));
const centesimas = (pares) =>
  Object.fromEntries(Object.entries(pares).map(([par, valor]) => [par, Math.round(valor * 100) / 100]));
const caso = (inicio) => casos.tokensDelTema.find(({ nombre }) => nombre.startsWith(inicio));
const tokensB = casos.predefinidos.find(({ id }) => id === 'b').tokens;
const ESCALA_NEUTRA = TOKENS_DEL_TEMA.slice(TOKENS_DEL_TEMA.indexOf('--ws-bg'));

for (const { nombre, colores, tokens, pares } of casos.tokensDelTema) {
  test(`tokensDelTema: ${nombre}`, () => {
    const calculados = tokensDelTema(colores, casos.predefinidos);
    assert.deepEqual(Object.keys(calculados), [...TOKENS_DEL_TEMA], 'todos los tokens, en orden');
    assert.deepEqual({ ...calculados }, tokens);
    assert.ok(Object.isFrozen(calculados));
    assert.deepEqual(centesimas(medirPares(calculados)), pares);
  });
}

test('un principal claro pone el texto sobre él, los enlaces y el foco en el color de contraste (REQ-17)', () => {
  const { colores } = caso('principal claro');
  const tokens = tokensDelTema(colores, casos.predefinidos);
  assert.equal(tokens['--ws-on-primary'], '#0F172A');
  assert.equal(tokens['--ws-link'], '#0F172A');
  assert.equal(tokens['--ws-focus-ring'], '#0F172A');
  assert.equal(tokens['--ws-primary-strong'], 'color-mix(in srgb, #FFD400 88%, #0F172A)');
});

test('un principal oscuro sobre la base de B hereda su escala neutra y se mezcla como en Contenido (AC-23)', () => {
  const { colores } = caso('#123456');
  const tokens = tokensDelTema(colores, casos.predefinidos);
  assert.equal(tokens['--ws-primary-strong'], 'color-mix(in srgb, #123456 62%, #0F172A)');
  assert.equal(tokens['--ws-primary-soft'], 'color-mix(in srgb, #123456 10%, #FFFFFF)');
  assert.equal(tokens['--ws-on-primary'], '#FFFFFF');
  assert.equal(tokens['--ws-link'], '#123456');
  for (const nombre of ESCALA_NEUTRA) assert.equal(tokens[nombre], tokensB[nombre], nombre);
});

test('sin base predefinida, la escala neutra se deriva del contraste y la superficie', () => {
  const { colores } = caso('base oscura');
  const tokens = tokensDelTema(colores, casos.predefinidos);
  assert.equal(tokens['--ws-bg'], '#111318');
  assert.equal(tokens['--ws-text'], '#F5F7FA');
  assert.equal(tokens['--ws-muted'], 'color-mix(in srgb, #F5F7FA 68%, #1B1E25)');
  assert.equal(tokens['--ws-footer'], '#F5F7FA');
  assert.equal(tokens['--ws-footer-heading'], '#1B1E25');
  const pares = medirPares(tokens);
  assert.ok(pares['onPrimary/primary'] < 4.5, 'el texto sobre el principal queda bajo el mínimo');
  assert.ok(pares['contrast/background'] >= 4.5 && pares['contrast/surface'] >= 4.5);
});

test('sin predefinidos no hay base que heredar', () => {
  const { colores } = caso('#123456');
  assert.equal(tokensDelTema(colores)['--ws-text'], '#0F172A');
});

test('coloresCalculados resuelve var() y color-mix() como el navegador', () => {
  const colores = coloresCalculados(tokensB);
  assert.equal(colores['--ws-primary'], '#1D4ED8');
  assert.equal(colores['--ws-primary-strong'], '#183996');
  assert.equal(colores['--ws-primary-soft'], '#E8EDFB');
  assert.equal(colores['--ws-on-primary-soft'], '#183996');
  assert.equal(colores['--ws-link'], '#1D4ED8');
  assert.equal(colores['--ws-text'], '#1E293B');
});

test('coloresCalculados rechaza un valor que no sabe calcular', () => {
  assert.throws(() => coloresCalculados({ '--ws-primary': 'red' }));
  assert.throws(() => coloresCalculados({ '--ws-link': 'var(--ws-primary)' }));
  assert.throws(() => coloresCalculados({ '--ws-link': 'var(--ws-link)' }));
});

test('se miden 14 pares; solo los del contraste sobre los fondos bloquean (D7) y el foco pide 3:1', () => {
  assert.equal(PARES_DE_CONTRASTE.length, 14);
  assert.deepEqual(
    PARES_DE_CONTRASTE.filter(({ bloquea }) => bloquea).map(({ par }) => par),
    ['contrast/background', 'contrast/surface'],
  );
  for (const { par, minimo } of PARES_DE_CONTRASTE)
    assert.equal(minimo, par.startsWith('focusRing/') ? 3 : 4.5, par);
});
