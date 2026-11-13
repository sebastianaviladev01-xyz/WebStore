/**
 * Pruebas unitarias de las reglas de un tema: derivación de sus tokens (D2, con la regla de la base neutra),
 * cálculo de los colores que pinta el navegador, medida de sus pares de contraste y revisión de contraste
 * (relación redondeada hacia abajo, qué pares bloquean). Funciones puras.
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
  revisarContraste,
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

test('la barra superior de un tema propio es su principal fuerte, con el texto más legible entre blanco y el contraste', () => {
  const claro = tokensDelTema(caso('principal claro').colores, casos.predefinidos);
  assert.equal(claro['--ws-topbar'], claro['--ws-primary-strong']);
  assert.equal(claro['--ws-on-topbar'], '#0F172A');
  const oscuro = tokensDelTema(caso('#123456').colores, casos.predefinidos);
  assert.equal(oscuro['--ws-topbar'], 'color-mix(in srgb, #123456 62%, #0F172A)');
  assert.equal(oscuro['--ws-on-topbar'], '#FFFFFF');
  const pares = PARES_DE_CONTRASTE.find(({ par }) => par === 'onTopbar/topbar');
  assert.deepEqual(pares, {
    par: 'onTopbar/topbar',
    texto: '--ws-on-topbar',
    fondo: '--ws-topbar',
    minimo: 4.5,
    bloquea: false,
  });
});

test('se miden 20 pares; solo los del contraste sobre los fondos bloquean (D7) y el foco y el contorno piden 3:1', () => {
  assert.equal(PARES_DE_CONTRASTE.length, 20);
  assert.deepEqual(
    PARES_DE_CONTRASTE.filter(({ bloquea }) => bloquea).map(({ par }) => par),
    ['contrast/background', 'contrast/surface'],
  );
  for (const { par, minimo } of PARES_DE_CONTRASTE)
    assert.equal(minimo, par.startsWith('focusRing/') || par.startsWith('borderStrong/') ? 3 : 4.5, par);
});

test('los cinco pares nuevos van al final, después de disabledText/disabled, con sus mínimos y sin bloquear (AC-07, AC-09)', () => {
  assert.equal(PARES_DE_CONTRASTE[14].par, 'disabledText/disabled');
  assert.deepEqual(PARES_DE_CONTRASTE.slice(15), [
    {
      par: 'contrast/storeBackground',
      texto: '--ws-ink',
      fondo: '--ws-store-bg',
      minimo: 4.5,
      bloquea: false,
    },
    {
      par: 'muted/storeBackground',
      texto: '--ws-muted',
      fondo: '--ws-store-bg',
      minimo: 4.5,
      bloquea: false,
    },
    { par: 'link/storeBackground', texto: '--ws-link', fondo: '--ws-store-bg', minimo: 4.5, bloquea: false },
    {
      par: 'focusRing/storeBackground',
      texto: '--ws-focus-ring',
      fondo: '--ws-store-bg',
      minimo: 3,
      bloquea: false,
    },
    {
      par: 'borderStrong/surface',
      texto: '--ws-border-strong',
      fondo: '--ws-surface',
      minimo: 3,
      bloquea: false,
    },
  ]);
});

test('el mapa tiene 31 tokens y el lienzo de la tienda va justo antes del fondo principal, fuera de la escala neutra (ADR-0013)', () => {
  assert.equal(TOKENS_DEL_TEMA.length, 31);
  assert.equal(TOKENS_DEL_TEMA.indexOf('--ws-store-bg'), TOKENS_DEL_TEMA.indexOf('--ws-bg') - 1);
  assert.equal(ESCALA_NEUTRA.includes('--ws-store-bg'), false);
});

test('en un tema propio, el lienzo de la tienda es su fondo principal, herede o no la escala de B (AC-05, REQ-14)', () => {
  const derivado = tokensDelTema(caso('base oscura').colores, casos.predefinidos);
  assert.equal(derivado['--ws-store-bg'], '#111318');
  for (const inicio of ['principal claro', '#123456']) {
    const tokens = tokensDelTema(caso(inicio).colores, casos.predefinidos);
    assert.equal(tokens['--ws-store-bg'], '#F3F5F8', inicio);
    assert.notEqual(tokens['--ws-store-bg'].toUpperCase(), tokensB['--ws-store-bg'].toUpperCase(), inicio);
    assert.equal(tokens['--ws-bg'], tokensB['--ws-bg'], inicio);
  }
});

test('en un tema propio, los cuatro pares sobre el lienzo de la tienda valen lo mismo que los del fondo principal', () => {
  for (const { nombre, colores } of casos.tokensDelTema) {
    const pares = medirPares(tokensDelTema(colores, casos.predefinidos));
    for (const prefijo of ['contrast', 'muted', 'link', 'focusRing'])
      assert.equal(
        pares[`${prefijo}/storeBackground`],
        pares[`${prefijo}/background`],
        `${nombre}: ${prefijo}`,
      );
  }
});

for (const { nombre, colores, bajoMinimo } of casos.revisarContraste) {
  test(`revisarContraste: ${nombre}`, () => {
    const pares = revisarContraste(colores, casos.predefinidos);
    assert.deepEqual(
      pares.filter((p) => p.relacion < p.minimo),
      bajoMinimo,
    );
  });
}

test('revisarContraste devuelve siempre los 20 pares, en orden, congelados y con solo par, relación, mínimo y bloqueo (AC-14)', () => {
  for (const { colores } of casos.revisarContraste) {
    const pares = revisarContraste(colores, casos.predefinidos);
    assert.ok(Object.isFrozen(pares));
    assert.equal(pares.length, 20);
    assert.deepEqual(
      pares.map(({ par }) => par),
      PARES_DE_CONTRASTE.map(({ par }) => par),
    );
    for (const [indice, par] of pares.entries()) {
      assert.deepEqual(Object.keys(par), ['par', 'relacion', 'minimo', 'bloquea']);
      assert.equal(par.minimo, PARES_DE_CONTRASTE[indice].minimo, par.par);
      assert.equal(par.bloquea, PARES_DE_CONTRASTE[indice].bloquea, par.par);
    }
  }
});

test('revisarContraste redondea la relación hacia abajo: un par bajo el mínimo no se muestra como si lo alcanzara', () => {
  const { colores } = casos.revisarContraste.find(({ nombre }) => nombre.startsWith('redondeo'));
  const exacta = medirPares(tokensDelTema(colores, casos.predefinidos))['contrast/background'];
  assert.ok(exacta > 4.45 && exacta < 4.5, 'el redondeo al más cercano lo mostraría como 4.5');
  const par = revisarContraste(colores, casos.predefinidos).find((p) => p.par === 'contrast/background');
  assert.equal(par.relacion, 4.4);
  assert.ok(par.relacion < par.minimo);
});

test('revisarContraste: bloquea indica qué pares frenan el guardado, con independencia de la medida', () => {
  for (const { colores } of casos.revisarContraste) {
    const bloqueantes = revisarContraste(colores, casos.predefinidos)
      .filter(({ bloquea }) => bloquea)
      .map(({ par }) => par);
    assert.deepEqual(bloqueantes, ['contrast/background', 'contrast/surface']);
  }
});
