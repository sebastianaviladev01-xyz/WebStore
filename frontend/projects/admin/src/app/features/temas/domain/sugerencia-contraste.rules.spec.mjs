/**
 * Lote 47 (ADR-0033, PBI-0267): «Revisión de contraste» dice dónde se ve cada par que no llega y sugiere el color más
 * cercano que cumple. Como los demás `*.spec.mjs`, transpila el `.ts` y borra sus líneas `import`; la réplica de las
 * reglas de temas se antepone porque la sugerencia mide con ella.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const fuente = await readFile(new URL('./sugerencia-contraste.rules.ts', import.meta.url), 'utf8');
const source = [await readFile(new URL('./tema.rules.ts', import.meta.url), 'utf8'), fuente].join('\n');
const modulo = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  CAMPO_DEL_PAR,
  DONDE_SE_VE_EL_PAR,
  PARES_DE_CONTRASTE,
  revisarContraste,
  sugerirColor,
  sugerirColores,
} = await import(`data:text/javascript;base64,${Buffer.from(modulo).toString('base64')}`);

/** Los colores de B, de los que parte «Nuevo tema». */
const B = {
  primary: '#1D4ED8',
  secondary: '#C2410C',
  background: '#F3F5F8',
  surface: '#FFFFFF',
  contrast: '#16202E',
};
/** Una base oscura con un contraste gris: el texto se lee, el texto secundario no. */
const OSCURO = {
  primary: '#60A5FA',
  secondary: '#F59E0B',
  background: '#121212',
  surface: '#1E1E1E',
  contrast: '#8A8F98',
};

const CAMPOS = ['primary', 'secondary', 'background', 'surface', 'contrast'];
const medida = (colores, par) => revisarContraste(colores).find((p) => p.par === par);
const bloqueos = (colores) =>
  revisarContraste(colores)
    .filter(({ bloquea, relacion, minimo }) => bloquea && relacion < minimo)
    .map(({ par }) => par);

/** Tono (0–360), saturación y luminosidad HSL de `#RRGGBB`, calculados aquí para no copiar la implementación. */
function hsl(color) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return { h, s, l };
}

test('PBI-0267: cada uno de los 29 pares dice dónde se ve, en minúsculas para seguir a «Se ve en», sin repetirse', () => {
  const pares = PARES_DE_CONTRASTE.map(({ par }) => par);
  assert.deepEqual(Object.keys(DONDE_SE_VE_EL_PAR).sort(), [...pares].sort());
  const textos = Object.values(DONDE_SE_VE_EL_PAR);
  assert.equal(new Set(textos).size, textos.length);
  for (const texto of textos) {
    assert.match(texto, /^[a-záéíóúñ]/, texto);
    assert.doesNotMatch(texto, /[.:]$/, texto);
  }
  assert.equal(DONDE_SE_VE_EL_PAR['onPrimary/primary'], 'el texto de los botones principales');
  assert.equal(DONDE_SE_VE_EL_PAR['borderStrong/surface'], 'el borde de los campos');
});

test('PBI-0267: cada par se corrige en el color editable del que sale', () => {
  const pares = PARES_DE_CONTRASTE.map(({ par }) => par);
  assert.deepEqual(Object.keys(CAMPO_DEL_PAR).sort(), [...pares].sort());
  for (const campo of Object.values(CAMPO_DEL_PAR)) assert.ok(CAMPOS.includes(campo), campo);
  // El texto es el contraste; los tokens derivados, su color base.
  assert.equal(CAMPO_DEL_PAR['contrast/background'], 'contrast');
  assert.equal(CAMPO_DEL_PAR['muted/surface'], 'contrast');
  assert.equal(CAMPO_DEL_PAR['borderStrong/surface'], 'contrast');
  // El texto sobre un color de relleno se elige solo: se corrige el relleno.
  assert.equal(CAMPO_DEL_PAR['onPrimary/primary'], 'primary');
  assert.equal(CAMPO_DEL_PAR['onTopbar/topbar'], 'primary');
  assert.equal(CAMPO_DEL_PAR['onAccent/accent'], 'secondary');
  assert.equal(CAMPO_DEL_PAR['contrast/accentSoft'], 'secondary');
  // El error y la alerta tienen colores fijos: se corrige el fondo sobre el que se escriben.
  assert.equal(CAMPO_DEL_PAR['danger/background'], 'background');
  assert.equal(CAMPO_DEL_PAR['warning/surface'], 'surface');
});

test('PBI-0267: un par que llega no lleva sugerencia, y sugerirColores solo trae los que no llegan', () => {
  assert.equal(sugerirColor(B, 'contrast/background'), null);
  for (const colores of [B, { ...B, contrast: '#5F6B7A' }]) {
    const noLlegan = revisarContraste(colores)
      .filter(({ relacion, minimo }) => relacion < minimo)
      .map(({ par }) => par);
    assert.deepEqual(Object.keys(sugerirColores(colores)).sort(), [...noLlegan].sort());
  }
  assert.ok(Object.keys(sugerirColores({ ...B, contrast: '#5F6B7A' })).length > 1);
});

test('PBI-0267: sobre un fondo claro, oscurece el contraste hasta el color más cercano que llega a 4.5:1, con su tono', () => {
  const colores = { ...B, contrast: '#5F6B7A' };
  assert.ok(medida(colores, 'muted/background').relacion < 4.5);
  const sugerencia = sugerirColor(colores, 'muted/background');
  assert.equal(sugerencia.tipo, 'color');
  assert.equal(sugerencia.campo, 'contrast');
  assert.equal(sugerencia.sentido, 'oscurecer');
  assert.match(sugerencia.color, /^#[0-9A-F]{6}$/);
  // Llega exactamente al mínimo con el redondeo de la cifra: el más cercano no lo pasa de largo.
  assert.equal(medida({ ...colores, contrast: sugerencia.color }, 'muted/background').relacion, 4.5);
  const antes = hsl(colores.contrast);
  const despues = hsl(sugerencia.color);
  assert.ok(despues.l < antes.l);
  assert.ok(Math.abs(despues.h - antes.h) < 2, `tono ${antes.h} → ${despues.h}`);
  assert.ok(Math.abs(despues.s - antes.s) < 0.05, `saturación ${antes.s} → ${despues.s}`);
});

test('PBI-0267: sobre un fondo oscuro, aclara el contraste hasta el color más cercano que llega', () => {
  assert.deepEqual(bloqueos(OSCURO), []);
  assert.ok(medida(OSCURO, 'muted/background').relacion < 4.5);
  const sugerencia = sugerirColor(OSCURO, 'muted/background');
  assert.equal(sugerencia.tipo, 'color');
  assert.equal(sugerencia.campo, 'contrast');
  assert.equal(sugerencia.sentido, 'aclarar');
  assert.equal(medida({ ...OSCURO, contrast: sugerencia.color }, 'muted/background').relacion, 4.5);
  assert.ok(hsl(sugerencia.color).l > hsl(OSCURO.contrast).l);
});

test('PBI-0267: un borde o un control llega a su mínimo de 3:1, no al del texto', () => {
  const colores = { ...B, contrast: '#5F6B7A' };
  assert.ok(medida(colores, 'borderStrong/surface').relacion < 3);
  const sugerencia = sugerirColor(colores, 'borderStrong/surface');
  assert.equal(sugerencia.tipo, 'color');
  assert.equal(medida({ ...colores, contrast: sugerencia.color }, 'borderStrong/surface').relacion, 3);
});

test('PBI-0267: si aclarar u oscurecer el color no alcanza el mínimo, lo dice en lugar de sugerir', () => {
  // Con un fondo secundario gris medio, el texto deshabilitado y su fondo salen los dos del contraste y de ese gris:
  // ni con el negro ni con el blanco llegan a 4.5:1.
  const colores = { ...B, background: '#FFFFFF', surface: '#808080', contrast: '#000000' };
  assert.deepEqual(bloqueos(colores), []);
  assert.ok(medida(colores, 'disabledText/disabled').relacion < 4.5);
  assert.deepEqual(sugerirColor(colores, 'disabledText/disabled'), {
    tipo: 'imposible',
    campo: 'contrast',
  });
});

test('PBI-0267: una sugerencia nunca crea un bloqueo nuevo; si todas lo crearían, lo dice', () => {
  // Recorre temas al azar (con semilla fija) y comprueba cada sugerencia: el par llega y no aparece ningún bloqueo.
  let semilla = 47;
  const azar = () => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    return semilla / 2147483648;
  };
  const colorAlAzar = () =>
    `#${[0, 0, 0]
      .map(() =>
        Math.floor(azar() * 256)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`.toUpperCase();
  let sugeridos = 0;
  let bloquearian = 0;
  for (let i = 0; i < 40; i++) {
    const tema = Object.fromEntries(CAMPOS.map((campo) => [campo, colorAlAzar()]));
    const antes = new Set(bloqueos(tema));
    for (const [par, sugerencia] of Object.entries(sugerirColores(tema))) {
      assert.equal(sugerencia.campo, CAMPO_DEL_PAR[par]);
      if (sugerencia.tipo === 'bloquearia') bloquearian++;
      if (sugerencia.tipo !== 'color') continue;
      sugeridos++;
      const aplicado = { ...tema, [sugerencia.campo]: sugerencia.color };
      const p = medida(aplicado, par);
      assert.ok(p.relacion >= p.minimo, `${par} en ${JSON.stringify(tema)} con ${sugerencia.color}`);
      for (const nuevo of bloqueos(aplicado)) assert.ok(antes.has(nuevo), `${par} crea el bloqueo ${nuevo}`);
    }
  }
  assert.ok(sugeridos > 30, `sugeridos: ${sugeridos}`);
  assert.ok(bloquearian > 0, 'algún tema al azar debería tener un par que solo se corrige bloqueando');
});

test('PBI-0267: el caso en que corregir el par bloquearía se informa como tal', () => {
  // Un fondo principal blanco y un fondo secundario casi negro: el contraste negro se lee sobre el blanco y bloquea sobre
  // el casi negro. Aclararlo lo haría leerse sobre el fondo secundario, pero dejaría de leerse sobre el blanco: crearía
  // otro bloqueo.
  const colores = { ...B, background: '#FFFFFF', surface: '#2B2B2B', contrast: '#000000' };
  assert.deepEqual(bloqueos(colores), ['contrast/surface']);
  assert.deepEqual(sugerirColor(colores, 'contrast/surface'), { tipo: 'bloquearia', campo: 'contrast' });
});

test('PBI-0267: las líneas import de sugerencia-contraste.rules.ts traen tipos o la réplica de tema.rules', () => {
  const imports = fuente.split('\n').filter((linea) => /^\s*import\b/.test(linea));
  for (const linea of imports)
    assert.match(linea, /^import (type )?\{[^}]*\} from '\.\/tema\.(rules|model)';$/);
});
