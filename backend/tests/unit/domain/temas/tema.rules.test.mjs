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
import { exigirTemaValido } from '../../../../src/domain/temas/tema-propio.rules.mjs';
import { relacionDeContraste } from '../../../../src/domain/temas/contraste.rules.mjs';

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
  // PBI-0062: la superficie también es candidata para el texto sobre el principal y lo deja en su mínimo.
  assert.equal(tokens['--ws-on-primary'], '#1B1E25');
  assert.ok(pares['onPrimary/primary'] >= 4.5, 'el texto sobre el principal llega al mínimo');
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

test('la barra superior de un tema propio es su principal fuerte, con el texto más legible entre blanco, el contraste y la superficie', () => {
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

test('se miden 27 pares; solo los del contraste sobre los fondos bloquean (D7) y el foco y el contorno piden 3:1', () => {
  assert.equal(PARES_DE_CONTRASTE.length, 27);
  assert.deepEqual(
    PARES_DE_CONTRASTE.filter(({ bloquea }) => bloquea).map(({ par }) => par),
    ['contrast/background', 'contrast/surface'],
  );
  for (const { par, minimo } of PARES_DE_CONTRASTE)
    assert.equal(minimo, par.startsWith('focusRing/') || par.startsWith('borderStrong/') ? 3 : 4.5, par);
});

test('los cinco pares de la feature 004 van después de disabledText/disabled, con sus mínimos y sin bloquear (AC-07, AC-09)', () => {
  assert.equal(PARES_DE_CONTRASTE[14].par, 'disabledText/disabled');
  assert.deepEqual(PARES_DE_CONTRASTE.slice(15, 20), [
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

test('el mapa tiene 37 tokens y el lienzo de la tienda va justo antes del fondo principal, fuera de la escala neutra (ADR-0013)', () => {
  assert.equal(TOKENS_DEL_TEMA.length, 37);
  assert.equal(TOKENS_DEL_TEMA.indexOf('--ws-store-bg'), TOKENS_DEL_TEMA.indexOf('--ws-bg') - 1);
  assert.equal(ESCALA_NEUTRA.includes('--ws-store-bg'), false);
});

// TEST-01 (feature 005, ADR-0014): el texto y las marcas sobre el color de los enlaces.
test('el texto sobre el enlace va justo después del enlace y antes del foco, fuera de la escala neutra (ADR-0014)', () => {
  const indice = TOKENS_DEL_TEMA.indexOf('--ws-on-link');
  assert.ok(indice > 0, 'falta --ws-on-link');
  assert.equal(TOKENS_DEL_TEMA[indice - 1], '--ws-link');
  assert.equal(TOKENS_DEL_TEMA[indice + 1], '--ws-focus-ring');
  assert.equal(ESCALA_NEUTRA.includes('--ws-on-link'), false);
});

test('con un principal legible sobre los fondos, el enlace es el principal y el texto sobre él, el blanco', () => {
  const tokens = tokensDelTema(caso('#123456').colores, casos.predefinidos);
  assert.equal(tokens['--ws-link'], '#123456');
  assert.equal(tokens['--ws-on-link'], '#FFFFFF');
});

test('cuando el enlace pasa al contraste, el texto sobre él es el blanco', () => {
  const tokens = tokensDelTema(caso('principal claro').colores, casos.predefinidos);
  assert.equal(tokens['--ws-link'], '#0F172A');
  assert.equal(tokens['--ws-on-link'], '#FFFFFF');
});

test('con la base de un predefinido, el texto sobre el enlace se calcula y no se hereda', () => {
  const tokens = tokensDelTema(caso('#123456').colores, casos.predefinidos);
  assert.equal(tokensB['--ws-on-link'], '#ffffff', 'B lo fija con su literal en minúsculas');
  assert.equal(tokens['--ws-on-link'], '#FFFFFF', 'calculado, en mayúsculas');
  assert.equal(tokens['--ws-bg'], tokensB['--ws-bg'], 'la escala neutra sí se hereda');
});

test('en un tema oscuro, el texto sobre el enlace es la superficie: #1B1E25 en la base oscura (4.54:1), como el texto sobre el principal (PBI-0062)', () => {
  const tokens = tokensDelTema(caso('base oscura').colores, casos.predefinidos);
  assert.equal(tokens['--ws-link'], '#3B82F6');
  assert.equal(tokens['--ws-on-link'], '#1B1E25');
  assert.equal(tokens['--ws-on-primary'], '#1B1E25');
  const relacion = medirPares(tokens)['onLink/link'];
  assert.equal(Math.round(relacion * 100) / 100, 4.54);
});

test('en un tema oscuro cuyo enlace pasa a un contraste claro, el texto sobre él también es la superficie', () => {
  const colores = {
    primary: '#1E3A8A',
    secondary: '#F97316',
    background: '#111318',
    surface: '#1B1E25',
    contrast: '#F5F7FA',
  };
  const tokens = tokensDelTema(colores, casos.predefinidos);
  assert.equal(tokens['--ws-link'], '#F5F7FA');
  assert.equal(tokens['--ws-on-link'], '#1B1E25');
  assert.ok(medirPares(tokens)['onLink/link'] >= 4.5);
});

// TEST-03 (feature 005, ADR-0014): el par del texto sobre el enlace solo avisa.
test('onLink/link va justo después del contorno: texto sobre el enlace, mínimo 4.5:1 y sin bloquear (ADR-0014)', () => {
  assert.equal(PARES_DE_CONTRASTE[19].par, 'borderStrong/surface');
  assert.deepEqual(PARES_DE_CONTRASTE[20], {
    par: 'onLink/link',
    texto: '--ws-on-link',
    fondo: '--ws-link',
    minimo: 4.5,
    bloquea: false,
  });
});

const coloresAC05 = {
  primary: '#F2B705',
  secondary: '#C2410C',
  background: '#F2F3F5',
  surface: '#FFFFFF',
  contrast: '#1F2328',
};

test('con el tema propio de AC-05, el par del texto sobre el enlace llega a su mínimo y el tema se guarda', () => {
  const par = revisarContraste(coloresAC05, casos.predefinidos).find(({ par }) => par === 'onLink/link');
  // 15.80:1 en centésimas; revisarContraste redondea a un decimal hacia abajo (15.797 → 15.7).
  assert.deepEqual(par, { par: 'onLink/link', relacion: 15.7, minimo: 4.5, bloquea: false });
  assert.deepEqual(exigirTemaValido({ name: 'AC-05', colors: coloresAC05 }, []).colors, coloresAC05);
});

test('INSUFFICIENT_THEME_CONTRAST sigue listando solo contrast/background y contrast/surface', () => {
  const gris = casos.revisarContraste.find(({ nombre }) => nombre.startsWith('un contraste gris')).colores;
  assert.throws(
    () => exigirTemaValido({ name: 'Gris', colors: gris }, []),
    (error) =>
      error.code === 'INSUFFICIENT_THEME_CONTRAST' &&
      error.details.pairs.map(({ pair }) => pair).join() === 'contrast/background,contrast/surface',
  );
});

test('un tema que pasa los dos pares que bloquean nunca deja onLink/link bajo 4.5: la superficie es candidata', () => {
  // Si el enlace es el principal, se lee sobre la superficie; si es el contraste, la superficie se lee sobre él
  // (contrast/surface bloquea). Por eso no existe un tema válido con este par bajo su mínimo: el par avisa
  // de temas que no deberían darse y no puede impedir guardar.
  const principales = [
    '#1D4ED8',
    '#F2B705',
    '#123456',
    '#3B82F6',
    '#1E3A8A',
    '#E5E7EB',
    '#C2410C',
    '#10B981',
  ];
  const bases = [
    { background: '#F3F5F8', surface: '#FFFFFF', contrast: '#0F172A' },
    { background: '#F2F3F5', surface: '#FFFFFF', contrast: '#1F2328' },
    { background: '#111318', surface: '#1B1E25', contrast: '#F5F7FA' },
    { background: '#FFFFFF', surface: '#F0F0F0', contrast: '#595959' },
  ];
  let validos = 0;
  for (const primary of principales)
    for (const base of bases) {
      const colores = { primary, secondary: '#C2410C', ...base };
      const pares = revisarContraste(colores, casos.predefinidos);
      if (pares.some(({ bloquea, relacion, minimo }) => bloquea && relacion < minimo)) continue;
      validos += 1;
      const par = pares.find(({ par }) => par === 'onLink/link');
      assert.ok(par, 'falta el par onLink/link');
      assert.ok(par.relacion >= 4.5, `${primary} sobre ${base.surface}: ${par.relacion}`);
    }
  assert.equal(validos, principales.length * bases.length, 'los 32 temas de la rejilla son válidos');
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

test('revisarContraste devuelve siempre los 27 pares, en orden, congelados y con solo par, relación, mínimo y bloqueo (AC-14)', () => {
  for (const { colores } of casos.revisarContraste) {
    const pares = revisarContraste(colores, casos.predefinidos);
    assert.ok(Object.isFrozen(pares));
    assert.equal(pares.length, 27);
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

// Lote 03 (PBI-0061, ADR-0019): el error y la alerta son tokens del tema que calcula el BFF.
const TOKENS_DE_AVISO = [
  '--ws-danger',
  '--ws-danger-soft',
  '--ws-danger-line',
  '--ws-warning',
  '--ws-warning-soft',
];
const AVISO_DE_HOY = {
  '--ws-danger': '#B42318',
  '--ws-danger-soft': '#FEF3F2',
  '--ws-danger-line': '#FECDCA',
  '--ws-warning': '#8A4B08',
  '--ws-warning-soft': '#FFF6E5',
};
const BASE_OSCURA = { background: '#111318', surface: '#1B1E25', contrast: '#F5F7FA' };

test('el error y la alerta son cinco tokens del tema, justo después de la franja superior y fuera de la escala neutra (PBI-0061)', () => {
  const inicio = TOKENS_DEL_TEMA.indexOf('--ws-on-topbar') + 1;
  assert.deepEqual(TOKENS_DEL_TEMA.slice(inicio, inicio + 5), TOKENS_DE_AVISO);
  assert.equal(TOKENS_DEL_TEMA[inicio + 5], '--ws-store-bg');
  for (const nombre of TOKENS_DE_AVISO) assert.equal(ESCALA_NEUTRA.includes(nombre), false, nombre);
});

test('sobre una base clara, el error y la alerta conservan los colores de hoy, herede o no la escala de un predefinido', () => {
  const bases = [
    caso('principal claro').colores,
    caso('#123456').colores,
    {
      primary: '#1D4ED8',
      secondary: '#C2410C',
      background: '#FFFFFF',
      surface: '#F0F0F0',
      contrast: '#595959',
    },
  ];
  for (const colores of bases) {
    const tokens = tokensDelTema(colores, casos.predefinidos);
    for (const [nombre, valor] of Object.entries(AVISO_DE_HOY)) assert.equal(tokens[nombre], valor, nombre);
  }
});

test('sobre una base oscura, el error y la alerta pasan a su variante clara, con el fondo suave y la línea mezclados con la superficie', () => {
  const tokens = tokensDelTema(caso('base oscura').colores, casos.predefinidos);
  assert.equal(tokens['--ws-danger'], '#FDA29B');
  assert.equal(tokens['--ws-danger-soft'], 'color-mix(in srgb, #FDA29B 12%, #1B1E25)');
  assert.equal(tokens['--ws-danger-line'], 'color-mix(in srgb, #FDA29B 40%, #1B1E25)');
  assert.equal(tokens['--ws-warning'], '#FEC84B');
  assert.equal(tokens['--ws-warning-soft'], 'color-mix(in srgb, #FEC84B 12%, #1B1E25)');
});

test('los seis pares del error y la alerta van al final, piden 4.5:1 y solo avisan (PBI-0061)', () => {
  assert.deepEqual(
    PARES_DE_CONTRASTE.slice(21).map(({ par, texto, fondo, minimo, bloquea }) => [
      par,
      texto,
      fondo,
      minimo,
      bloquea,
    ]),
    [
      ['danger/background', '--ws-danger', '--ws-bg', 4.5, false],
      ['danger/surface', '--ws-danger', '--ws-surface', 4.5, false],
      ['danger/dangerSoft', '--ws-danger', '--ws-danger-soft', 4.5, false],
      ['warning/background', '--ws-warning', '--ws-bg', 4.5, false],
      ['warning/surface', '--ws-warning', '--ws-surface', 4.5, false],
      ['warning/warningSoft', '--ws-warning', '--ws-warning-soft', 4.5, false],
    ],
  );
});

test('sobre la superficie #1B1E25 de un tema oscuro, el error y la alerta pasan de 2.54:1 y 2.45:1 a 4.5:1 o más en sus seis pares', () => {
  const pares = medirPares(tokensDelTema(caso('base oscura').colores, casos.predefinidos));
  for (const { par } of PARES_DE_CONTRASTE.slice(21)) assert.ok(pares[par] >= 4.5, `${par}: ${pares[par]}`);
});

// Lote 03 (PBI-0062, ADR-0019): el texto sobre el principal, el más legible entre más candidatos.
test('con un principal muy claro sobre una base oscura, el texto sobre el principal es la superficie, no el blanco ni el contraste', () => {
  const tokens = tokensDelTema(
    { primary: '#FFFFBB', secondary: '#F97316', ...BASE_OSCURA },
    casos.predefinidos,
  );
  assert.equal(tokens['--ws-on-primary'], '#1B1E25');
  const pares = medirPares(tokens);
  for (const par of ['onPrimary/primary', 'onPrimary/primaryStrong', 'onTopbar/topbar'])
    assert.ok(pares[par] >= 4.5, `${par}: ${pares[par]}`);
});

test('en un tema propio, el texto sobre el principal es el más legible entre el blanco, el contraste y la superficie', () => {
  const principales = ['#1D4ED8', '#F2B705', '#FFFFBB', '#3B82F6', '#10B981', '#777777', '#E5E7EB'];
  const bases = [
    { background: '#F3F5F8', surface: '#FFFFFF', contrast: '#0F172A' },
    BASE_OSCURA,
    { background: '#FFFFFF', surface: '#F0F0F0', contrast: '#595959' },
  ];
  for (const primary of principales)
    for (const base of bases) {
      const tokens = tokensDelTema({ primary, secondary: '#C2410C', ...base }, casos.predefinidos);
      const mejor = Math.max(
        ...['#FFFFFF', base.contrast, base.surface].map((candidato) =>
          relacionDeContraste(primary, candidato),
        ),
      );
      const elegido = coloresCalculados(tokens)['--ws-on-primary'];
      assert.equal(relacionDeContraste(elegido, primary), mejor, `${primary} sobre ${base.surface}`);
    }
});

// Lote 02 (PBI-0152, nota de ADR-0019): el texto sobre el acento, como el texto sobre el principal.
test('sobre una base oscura, el texto sobre un acento claro es la superficie: el blanco y el contraste no se leen', () => {
  const tokens = tokensDelTema(
    { primary: '#3B82F6', secondary: '#F97316', ...BASE_OSCURA },
    casos.predefinidos,
  );
  assert.equal(tokens['--ws-on-accent'], '#1B1E25');
  assert.ok(medirPares(tokens)['onAccent/accent'] >= 4.5);
});

test('en un tema propio, el texto sobre el acento es el más legible entre el blanco, el contraste y la superficie', () => {
  const acentos = ['#C2410C', '#F2B705', '#F97316', '#10B981', '#777777', '#E5E7EB', '#FFFFBB', '#1D4ED8'];
  const bases = [
    { background: '#F3F5F8', surface: '#FFFFFF', contrast: '#0F172A' },
    BASE_OSCURA,
    { background: '#FFFFFF', surface: '#F0F0F0', contrast: '#595959' },
  ];
  for (const secondary of acentos)
    for (const base of bases) {
      const tokens = tokensDelTema({ primary: '#1D4ED8', secondary, ...base }, casos.predefinidos);
      const mejor = Math.max(
        ...['#FFFFFF', base.contrast, base.surface].map((candidato) =>
          relacionDeContraste(secondary, candidato),
        ),
      );
      const elegido = coloresCalculados(tokens)['--ws-on-accent'];
      assert.equal(relacionDeContraste(elegido, secondary), mejor, `${secondary} sobre ${base.surface}`);
    }
});

test('con una base clara el texto sobre el acento no cambia: el blanco o el contraste, como antes', () => {
  const base = { background: '#F3F5F8', surface: '#FFFFFF', contrast: '#0F172A' };
  const sobre = (secondary) =>
    tokensDelTema({ primary: '#1D4ED8', secondary, ...base }, casos.predefinidos)['--ws-on-accent'];
  assert.equal(sobre('#C2410C'), '#FFFFFF');
  assert.equal(sobre('#F2B705'), '#0F172A');
});
