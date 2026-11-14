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
          primary: '#F2B705',
          secondary: '#1F2328',
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

test('C conserva los valores presentados y usa el grafito para texto, enlaces, foco y la barra superior', () => {
  const tokens = tema('c').tokens;
  const presentados = {
    '--ws-primary': '#F2B705',
    '--ws-primary-soft': '#FFF6D6',
    '--ws-on-primary': '#1F2328',
    '--ws-on-primary-soft': '#8A5A00',
    '--ws-accent': '#1F2328',
    '--ws-on-accent': '#F2B705',
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
  for (const [nombre, valor] of Object.entries(presentados)) assert.equal(tokens[nombre], valor, nombre);
  assert.equal(tokens['--ws-primary-strong'], 'color-mix(in srgb, #F2B705 88%, #1F2328)', 'derivado');
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

test('en C, el texto sobre el principal, los enlaces y el foco se calculan en grafito', () => {
  const colores = coloresCalculados(tema('c').tokens);
  for (const nombre of ['--ws-on-primary', '--ws-link', '--ws-focus-ring'])
    assert.equal(colores[nombre], '#1F2328', nombre);
});
