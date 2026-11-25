/**
 * Pruebas unitarias de los temas predefinidos A, B y C (D1): ids, nombres, colores, valores presentados el
 * 05/11, mapa completo de tokens y contraste AA de todos sus pares (TEST-02 y TEST-03).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { TEMAS_PREDEFINIDOS } from '../../../../src/domain/temas/temas-predefinidos.mjs';
import {
  PARES_DE_CONTRASTE,
  TOKENS_DEL_TEMA,
  coloresCalculados,
  medirPares,
  tokensDelTema,
} from '../../../../src/domain/temas/tema.rules.mjs';
import { relacionDeContraste } from '../../../../src/domain/temas/contraste.rules.mjs';

const casos = JSON.parse(readFileSync(new URL('./casos-tema.json', import.meta.url), 'utf8'));
const tema = (id) => TEMAS_PREDEFINIDOS.find((candidato) => candidato.id === id);
const minimos = Object.fromEntries(PARES_DE_CONTRASTE.map(({ par, minimo }) => [par, minimo]));

test('hay tres predefinidos, A, B y C, con sus nombres y sus cinco colores', () => {
  assert.deepEqual(
    TEMAS_PREDEFINIDOS.map(({ id, name, colors }) => ({ id, name, colors: { ...colors } })),
    [
      {
        id: 'a',
        name: 'Violeta tienda',
        colors: {
          primary: '#4C2A92',
          secondary: '#F5A524',
          background: '#F4F4F6',
          surface: '#FFFFFF',
          contrast: '#17151C',
        },
      },
      {
        id: 'b',
        name: 'Azul cobalto',
        colors: {
          primary: '#1D4ED8',
          secondary: '#C2410C',
          background: '#F3F5F8',
          surface: '#FFFFFF',
          contrast: '#0F172A',
        },
      },
      {
        id: 'c',
        name: 'Grafito y ámbar',
        colors: {
          primary: '#1F2328',
          secondary: '#F2B705',
          background: '#F2F3F5',
          surface: '#FFFFFF',
          contrast: '#1F2328',
        },
      },
    ],
  );
});

test('A conserva los valores presentados', () => {
  const tokens = tema('a').tokens;
  const presentados = {
    '--ws-primary': '#4C2A92',
    '--ws-primary-strong': '#2E1A5C',
    '--ws-primary-soft': '#EFE9FB',
    '--ws-on-primary': '#FFFFFF',
    '--ws-on-primary-soft': '#3A1F72',
    '--ws-accent': '#F5A524',
    '--ws-on-accent': '#2B1700',
    '--ws-topbar': '#2E1A5C',
    '--ws-on-topbar': '#FFFFFF',
    '--ws-bg': '#F4F4F6',
    '--ws-surface': '#FFFFFF',
    '--ws-ink': '#17151C',
    '--ws-text': '#17151C',
    '--ws-muted': '#5B5866',
    '--ws-footer': '#1E1530',
    '--ws-footer-text': '#CFC8E0',
    '--ws-footer-heading': '#FFFFFF',
  };
  for (const [nombre, valor] of Object.entries(presentados)) assert.equal(tokens[nombre], valor, nombre);
});

// Lote 28 (PBI-0240, ADR-0028): Daniel, en la reunión del 2026-11-20: «Principal negro, secundario, amarillo». El
// grafito pasa a principal y el ámbar a secundario; los tokens de la marca se derivan de nuevo de los cinco colores, y
// C solo fija lo presentado que no depende de cuál es el principal: la franja, el lienzo, el texto tenue y el pie.
test('C lleva el grafito de principal y el ámbar de secundario, con el texto negro sobre el amarillo (PBI-0240)', () => {
  const tokens = tema('c').tokens;
  const esperados = {
    '--ws-primary': '#1F2328',
    '--ws-on-primary': '#FFFFFF',
    '--ws-primary-soft': 'color-mix(in srgb, #1F2328 10%, #FFFFFF)',
    '--ws-accent': '#F2B705',
    '--ws-on-accent': '#1F2328',
    '--ws-link': '#1F2328',
    '--ws-focus-ring': '#1F2328',
    '--ws-topbar': '#1F2328',
    '--ws-on-topbar': '#FFFFFF',
    '--ws-bg': '#F2F3F5',
    '--ws-surface': '#FFFFFF',
    '--ws-text': '#1F2328',
    '--ws-muted': '#555B65',
    '--ws-footer': '#16181C',
    '--ws-footer-text': '#C9CDD3',
    '--ws-footer-heading': '#FFFFFF',
  };
  for (const [nombre, valor] of Object.entries(esperados)) assert.equal(tokens[nombre], valor, nombre);
});

test('en C, el principal fuerte (el botón principal con el puntero encima) se distingue del grafito y su texto se lee', () => {
  // Antes del lote, con el grafito de principal y de contraste, la mezcla al 62 % daba el mismo grafito (1.00:1).
  assert.equal(tema('c').tokens['--ws-primary-strong'], 'color-mix(in srgb, #1F2328 90%, #FFFFFF)');
  const colores = coloresCalculados(tema('c').tokens);
  const fuerte = colores['--ws-primary-strong'];
  assert.ok(relacionDeContraste(fuerte, colores['--ws-primary']) >= 1.3, `no cambia: ${fuerte}`);
  assert.ok(relacionDeContraste(colores['--ws-on-primary'], fuerte) >= 4.5, 'texto');
  assert.ok(relacionDeContraste(colores['--ws-on-primary-soft'], colores['--ws-primary-soft']) >= 4.5);
});

test('B copia los tokens de tokens.css, con var() y color-mix()', () => {
  const tokens = tema('b').tokens;
  assert.equal(tokens['--ws-primary'], '#1d4ed8');
  assert.equal(tokens['--ws-primary-strong'], 'color-mix(in srgb, var(--ws-primary) 62%, #0f172a)');
  assert.equal(tokens['--ws-on-primary-soft'], 'var(--ws-primary-strong)');
  assert.equal(tokens['--ws-link'], 'var(--ws-primary)');
  assert.equal(tokens['--ws-topbar'], 'var(--ws-primary-strong)');
  assert.equal(tokens['--ws-on-topbar'], '#ffffff');
  assert.equal(tokens['--ws-footer-rule'], '#22314f');
});

test('A, B y C fijan el lienzo de la tienda con su literal de D2 y no cambian el fondo principal (AC-05, ADR-0013)', () => {
  const esperados = {
    a: { lienzo: '#FAFAFB', fondo: '#F4F4F6', background: '#F4F4F6' },
    b: { lienzo: '#f9fafc', fondo: '#f3f5f8', background: '#F3F5F8' },
    c: { lienzo: '#F9F9FA', fondo: '#F2F3F5', background: '#F2F3F5' },
  };
  for (const [id, { lienzo, fondo, background }] of Object.entries(esperados)) {
    const { colors, tokens } = tema(id);
    assert.equal(tokens['--ws-store-bg'], lienzo, id);
    assert.equal(tokens['--ws-bg'], fondo, id);
    assert.equal(colors.background, background, id);
  }
});

test('el contorno fuerte de B es #8894a6, en minúsculas como el resto de su mapa, y llega a 3:1 sobre la superficie (AC-09)', () => {
  assert.equal(tema('b').tokens['--ws-border-strong'], '#8894a6');
  const relaciones = Object.fromEntries(
    ['a', 'b', 'c'].map((id) => [
      id,
      Math.round(medirPares(tema(id).tokens)['borderStrong/surface'] * 100) / 100,
    ]),
  );
  assert.deepEqual(relaciones, { a: 3.43, b: 3.07, c: 3.16 });
});

test('un tema propio con la base de B hereda el contorno fuerte nuevo y conserva su propio lienzo (AC-15)', () => {
  const tokens = tokensDelTema({ ...tema('b').colors, primary: '#123456' }, TEMAS_PREDEFINIDOS);
  assert.equal(tokens['--ws-border-strong'], '#8894a6');
  assert.equal(tokens['--ws-store-bg'], '#F3F5F8');
});

test('cada predefinido tiene el mapa completo de tokens, en orden, y no se puede modificar', () => {
  assert.ok(Object.isFrozen(TEMAS_PREDEFINIDOS));
  for (const { id, colors, tokens } of TEMAS_PREDEFINIDOS) {
    assert.deepEqual(Object.keys(tokens), [...TOKENS_DEL_TEMA], id);
    assert.ok(Object.isFrozen(tokens) && Object.isFrozen(colors), id);
  }
});

test('los predefinidos coinciden con los de casos-tema.json, que usa la réplica del Admin', () => {
  assert.deepEqual(
    TEMAS_PREDEFINIDOS.map(({ id, name, colors, tokens }) => ({
      id,
      name,
      colors: { ...colors },
      tokens: { ...tokens },
    })),
    casos.predefinidos,
  );
});

for (const id of ['a', 'b', 'c']) {
  test(`todos los pares de ${id.toUpperCase()} alcanzan AA (REQ-13)`, () => {
    const pares = medirPares(tema(id)?.tokens ?? {});
    assert.equal(Object.keys(pares).length, PARES_DE_CONTRASTE.length);
    for (const [par, relacion] of Object.entries(pares)) {
      assert.ok(relacion >= minimos[par], `${par}: ${relacion}`);
      assert.equal(Math.round(relacion * 100) / 100, casos.paresPredefinidos[id][par], par);
    }
  });
}

// TEST-02 (feature 005, ADR-0014): el texto sobre el enlace en A, B y C.
test('A, B y C fijan el texto sobre el enlace con #FFFFFF, #ffffff y #FFFFFF, justo después del enlace', () => {
  const esperados = { a: '#FFFFFF', b: '#ffffff', c: '#FFFFFF' };
  for (const [id, valor] of Object.entries(esperados)) {
    const nombres = Object.keys(tema(id).tokens);
    assert.equal(tema(id).tokens['--ws-on-link'], valor, id);
    assert.equal(nombres.indexOf('--ws-on-link'), nombres.indexOf('--ws-link') + 1, id);
  }
});

test('onLink/link alcanza su mínimo en A, B y C, medido sobre el mapa literal de cada uno: 10.23, 6.70 y 15.80', () => {
  const relaciones = Object.fromEntries(
    ['a', 'b', 'c'].map((id) => [id, Math.round(medirPares(tema(id).tokens)['onLink/link'] * 100) / 100]),
  );
  assert.deepEqual(relaciones, { a: 10.23, b: 6.7, c: 15.8 });
  const colores = coloresCalculados(tema('c').tokens);
  assert.equal(colores['--ws-link'], '#1F2328', 'C fija el enlace con su literal');
  assert.equal(colores['--ws-on-link'], '#FFFFFF');
});

// Lote 03 (PBI-0061 y PBI-0062, ADR-0019): A, B y C se ven igual que antes de calcular el error, la alerta y el
// texto sobre el principal con el tema.
test('A, B y C conservan los colores de error y de alerta que antes eran fijos en tokens.css', () => {
  const deHoy = {
    '--ws-danger': '#b42318',
    '--ws-danger-soft': '#fef3f2',
    '--ws-danger-line': '#fecdca',
    '--ws-warning': '#8a4b08',
    '--ws-warning-soft': '#fff6e5',
  };
  for (const id of ['a', 'b', 'c'])
    for (const [nombre, valor] of Object.entries(deHoy))
      assert.equal(tema(id).tokens[nombre].toLowerCase(), valor, `${id} ${nombre}`);
  assert.equal(tema('b').tokens['--ws-danger'], '#b42318', 'B en minúsculas, como tokens.css');
});

test('el texto sobre el principal es blanco en A, B y C (C desde el lote 28, con el grafito de principal)', () => {
  const colores = (id) => coloresCalculados(tema(id).tokens)['--ws-on-primary'];
  assert.deepEqual(['a', 'b', 'c'].map(colores), ['#FFFFFF', '#FFFFFF', '#FFFFFF']);
});

test('en C, los enlaces y el foco son el grafito, y el texto sobre el secundario también', () => {
  const colores = coloresCalculados(tema('c').tokens);
  for (const nombre of ['--ws-link', '--ws-focus-ring', '--ws-on-accent'])
    assert.equal(colores[nombre], '#1F2328', nombre);
});

// Lote 08 (ADR-0017), PBI-0079: el tema por defecto está definido una sola vez; la consulta de temas, la normalización
// del estado y el seed lo usan, y las dos copias del frontend lo comparan con este (tema-visible.rules.spec.mjs).
test('el tema por defecto es uno de los predefinidos y es el activo del seed', async () => {
  const { TEMA_POR_DEFECTO } = await import('../../../../src/domain/temas/temas-predefinidos.mjs');
  const { seed } = await import('../../../../src/infrastructure/persistencia/seed.mjs');
  assert.equal(TEMA_POR_DEFECTO, 'b');
  assert.ok(TEMAS_PREDEFINIDOS.some((predefinido) => predefinido.id === TEMA_POR_DEFECTO));
  assert.equal(seed.appearance.activeThemeId, TEMA_POR_DEFECTO);
});

// Lote 14 (PBI-0189, ADR-0023): el borde del acento de A, B y C. En B y C el secundario ya llega a 3:1 sobre los dos
// fondos y el borde es el propio secundario (B no cambia a la vista); en A, el ámbar #F5A524 (2.04:1 sobre el blanco)
// se contornea con su mezcla al 70 % con el contraste. Los demás tokens del acento de A, B y C no cambian.
test('A, B y C tienen su borde del acento, que llega a 3:1 sobre el fondo principal y la superficie', () => {
  assert.equal(tema('a').tokens['--ws-accent-line'], 'color-mix(in srgb, #F5A524 70%, #17151C)');
  assert.equal(tema('b').tokens['--ws-accent-line'], 'var(--ws-accent)');
  // Lote 28: el ámbar de C (1.82:1 sobre el blanco) se contornea con su mezcla con el grafito, como el de A.
  assert.equal(tema('c').tokens['--ws-accent-line'], 'color-mix(in srgb, #F2B705 60%, #1F2328)');
  for (const id of ['a', 'b', 'c']) {
    const colores = coloresCalculados(tema(id).tokens);
    for (const fondo of ['--ws-bg', '--ws-surface', '--ws-store-bg'])
      assert.ok(relacionDeContraste(colores['--ws-accent-line'], colores[fondo]) >= 3, `${id} ${fondo}`);
  }
  assert.equal(tema('a').tokens['--ws-accent-strong'], 'color-mix(in srgb, #F5A524 78%, #17151C)');
});

// Lote 20 (ADR-0021): con C, el botón secundario con el puntero encima era el mismo grafito (la mezcla del grafito con
// el grafito); ahora se aclara hacia el blanco, cambia a la vista y su texto ámbar se sigue leyendo. A y B no cambian.
test('con el puntero encima, el botón secundario de A, B y C cambia a la vista y su texto se lee a 4.5:1', () => {
  assert.equal(tema('a').tokens['--ws-accent-strong'], 'color-mix(in srgb, #F5A524 78%, #17151C)');
  assert.equal(tema('b').tokens['--ws-accent-strong'], 'color-mix(in srgb, var(--ws-accent) 78%, #0f172a)');
  // Lote 28: con el ámbar de secundario, C vuelve a la mezcla de siempre con el contraste.
  assert.equal(tema('c').tokens['--ws-accent-strong'], 'color-mix(in srgb, #F2B705 78%, #1F2328)');
  for (const id of ['a', 'b', 'c']) {
    const colores = coloresCalculados(tema(id).tokens);
    const fuerte = colores['--ws-accent-strong'];
    assert.ok(relacionDeContraste(fuerte, colores['--ws-accent']) >= 1.3, `${id}: no cambia`);
    assert.ok(relacionDeContraste(colores['--ws-on-accent'], fuerte) >= 4.5, `${id}: texto`);
  }
});

// Lote 28 (PBI-0240, ADR-0028): el secundario suave es el fondo de lo que tiene el puntero encima o el foco en la tienda
// (acciones de la cabecera, botones de íconos, menús y opciones). Era el secundario al 9 % sobre la superficie y no lo
// usaba nadie (ADR-0023); pasa al 20 % para que se vea como el secundario, y el texto y el texto tenue se leen sobre él
// a 4.5:1 en A, B y C.
test('el secundario suave de A, B y C es el secundario al 20 % sobre la superficie, y lo que se escribe encima se lee', () => {
  assert.equal(tema('a').tokens['--ws-accent-soft'], 'color-mix(in srgb, #F5A524 20%, #FFFFFF)');
  assert.equal(tema('b').tokens['--ws-accent-soft'], 'color-mix(in srgb, var(--ws-accent) 20%, #ffffff)');
  assert.equal(tema('c').tokens['--ws-accent-soft'], 'color-mix(in srgb, #F2B705 20%, #FFFFFF)');
  for (const id of ['a', 'b', 'c']) {
    const colores = coloresCalculados(tema(id).tokens);
    const suave = colores['--ws-accent-soft'];
    // Se distingue de la superficie más que el gris neutro que usaba la tienda al pasar el puntero en C (1.05:1 al 9 %).
    assert.ok(relacionDeContraste(suave, colores['--ws-surface']) >= 1.1, `${id}: no se distingue`);
    for (const texto of ['--ws-ink', '--ws-muted'])
      assert.ok(relacionDeContraste(colores[texto], suave) >= 4.5, `${id}: ${texto}`);
  }
});
