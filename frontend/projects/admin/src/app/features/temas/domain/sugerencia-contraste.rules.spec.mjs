/**
 * Lote 47 (ADR-0033, PBI-0267): «Revisión de contraste» dice dónde se ve cada par que no llega y, por cada color
 * editable, sugiere el color más cercano que hace llegar sus pares. Como los demás `*.spec.mjs`, transpila el `.ts` y borra sus líneas `import`; la réplica de las
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
  contrast: '#0F172A',
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
/** Canales (0–255) de un color HSL, con la conversión de CSS Color 4, para comprobar el tono sin copiar la implementación. */
function canalesDesdeHsl(h, s, l) {
  const t2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
  const t1 = l * 2 - t2;
  const tono = (t) => {
    const x = ((t % 360) + 360) % 360;
    if (x < 60) return t1 + ((t2 - t1) * x) / 60;
    if (x < 180) return t2;
    if (x < 240) return t1 + ((t2 - t1) * (240 - x)) / 60;
    return t1;
  };
  return [tono(h + 120), tono(h), tono(h - 120)].map((v) => Math.round(v * 255));
}

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
  // Sobre el secundario suave se escribe con el contraste, que no se elige solo: se corrige el contraste, no el
  // secundario, que es un color de marca.
  assert.equal(CAMPO_DEL_PAR['contrast/accentSoft'], 'contrast');
  assert.equal(CAMPO_DEL_PAR['muted/accentSoft'], 'contrast');
  // El error y la alerta tienen colores fijos: se corrige el fondo sobre el que se escriben.
  assert.equal(CAMPO_DEL_PAR['danger/background'], 'background');
  assert.equal(CAMPO_DEL_PAR['warning/surface'], 'surface');
});

/** Pares que no llegan y se corrigen con `campo`, en el orden de la revisión. */
const noLlegan = (colores, campo) =>
  revisarContraste(colores)
    .filter(({ par, relacion, minimo }) => relacion < minimo && CAMPO_DEL_PAR[par] === campo)
    .map(({ par }) => par);
const sugerenciaDe = (colores, campo) => sugerirColor(colores, campo);
/** Todos los pares que no llegan, de cualquier color. */
const todosLosQueNoLlegan = (colores) =>
  revisarContraste(colores)
    .filter(({ relacion, minimo }) => relacion < minimo)
    .map(({ par }) => par);

test('PBI-0267: sin pares que no lleguen no hay sugerencias; un color sin pares que no lleguen no lleva sugerencia', () => {
  assert.deepEqual(sugerirColores(B), []);
  assert.equal(sugerirColor(B, 'contrast'), null);
  assert.ok(Object.isFrozen(sugerirColores({ ...B, contrast: '#5F6B7A' })));
});

test('PBI-0267: la cadena empieza por el color que hace llegar más pares y sigue con los anteriores aplicados', () => {
  // Con el contraste en #5F6B7A no llegan ocho pares, todos del contraste: también el texto y el texto secundario sobre
  // el secundario suave, que se corrigen con el contraste y no con el secundario, un color de marca. La cadena solo trae
  // el contraste, y aplicarlo los hace llegar todos.
  const colores = { ...B, contrast: '#5F6B7A' };
  assert.equal(noLlegan(colores, 'contrast').length, 8);
  assert.ok(noLlegan(colores, 'contrast').includes('muted/accentSoft'));
  assert.deepEqual(noLlegan(colores, 'secondary'), []);
  const cadena = sugerirColores(colores);
  assert.deepEqual(
    cadena.map(({ campo }) => campo),
    ['contrast'],
  );
  assert.equal(cadena[0].tipo, 'color');
  assert.deepEqual(cadena[0].corrige, cadena[0].pares);
  assert.deepEqual(todosLosQueNoLlegan({ ...colores, contrast: cadena[0].color }), []);

  // Con varios colores: cada paso es el que más pares arregla (de cualquier color, `arregla`) entre los que quedan, con
  // los anteriores aplicados, y sus pares son los que le quedan.
  const varios = { ...B, background: '#FFFFFF', surface: '#A0A0A0', contrast: '#303030' };
  const enCadena = sugerirColores(varios);
  assert.ok(enCadena.length > 1);
  let actual = varios;
  const aplicados = new Set();
  for (const paso of enCadena) {
    assert.deepEqual(paso.pares, noLlegan(actual, paso.campo));
    if (paso.tipo !== 'color') continue;
    for (const campo of CAMPOS.filter((c) => !aplicados.has(c))) {
      const otra = sugerirColor(actual, campo);
      if (otra?.tipo === 'color') assert.ok(otra.arregla.length <= paso.arregla.length, campo);
    }
    aplicados.add(paso.campo);
    actual = { ...actual, [paso.campo]: paso.color };
  }
});

test('PBI-0267: un color cuyos pares arregla una sugerencia anterior de la cadena no lleva línea', () => {
  // Con el fondo secundario negro sobre la base de B no llegan pares de cuatro colores, también uno del principal (el
  // texto sobre su tinte, que se mezcla con el fondo secundario). Al aclarar el fondo secundario, que es lo que más
  // arregla, el del principal llega solo: la cadena no pide cambiar el principal.
  const colores = { ...B, surface: '#000000' };
  assert.ok(noLlegan(colores, 'primary').length > 0);
  const cadena = sugerirColores(colores);
  assert.equal(cadena[0].campo, 'surface');
  assert.ok(!cadena.some(({ campo }) => campo === 'primary'));
  assert.ok(cadena[0].arregla.some((par) => CAMPO_DEL_PAR[par] === 'primary'));
  let actual = colores;
  for (const paso of cadena) if (paso.tipo === 'color') actual = { ...actual, [paso.campo]: paso.color };
  assert.deepEqual(noLlegan(actual, 'primary'), []);
});

test('PBI-0267: un mismo color con varios pares da una sola sugerencia, el color más cercano que los hace llegar todos', () => {
  const colores = { ...B, contrast: '#5F6B7A' };
  const pares = noLlegan(colores, 'contrast');
  assert.equal(pares.length, 8);
  const sugerencia = sugerenciaDe(colores, 'contrast');
  assert.equal(sugerencia.tipo, 'color');
  assert.equal(sugerencia.sentido, 'oscurecer');
  assert.match(sugerencia.color, /^#[0-9A-F]{6}$/);
  assert.deepEqual(sugerencia.pares, pares);
  assert.deepEqual(sugerencia.corrige, pares);
  const aplicado = { ...colores, contrast: sugerencia.color };
  assert.deepEqual(noLlegan(aplicado, 'contrast'), []);
  assert.deepEqual(bloqueos(aplicado), []);
  // El más cercano: el par más exigente queda justo en su mínimo con el redondeo de la cifra.
  assert.ok(
    pares.some((par) => medida(aplicado, par).relacion === medida(aplicado, par).minimo),
    pares.map((par) => `${par} ${medida(aplicado, par).relacion}`).join(', '),
  );
  // El borde de los campos se mide con su mínimo de 3:1, no con el del texto.
  assert.ok(medida(aplicado, 'borderStrong/surface').relacion >= 3);
  const antes = hsl(colores.contrast);
  const despues = hsl(sugerencia.color);
  assert.ok(despues.l < antes.l);
  // Mismo tono y saturación: el color con el tono y la saturación de partida y la luminosidad sugerida es el sugerido,
  // salvo el redondeo a #RRGGBB (en un color oscuro, ese redondeo mueve el tono medido varios grados).
  const reconstruido = canalesDesdeHsl(antes.h, antes.s, despues.l);
  const sugeridos = [1, 3, 5].map((i) => parseInt(sugerencia.color.slice(i, i + 2), 16));
  for (const [i, canal] of sugeridos.entries())
    assert.ok(Math.abs(canal - reconstruido[i]) <= 1, `${sugerencia.color} frente a ${reconstruido}`);
});

test('PBI-0267: sobre un fondo oscuro, aclara el contraste hasta que todos sus pares llegan', () => {
  assert.deepEqual(bloqueos(OSCURO), []);
  const pares = noLlegan(OSCURO, 'contrast');
  assert.ok(pares.length > 1);
  const sugerencia = sugerenciaDe(OSCURO, 'contrast');
  assert.equal(sugerencia.tipo, 'color');
  assert.equal(sugerencia.sentido, 'aclarar');
  assert.deepEqual(sugerencia.corrige, pares);
  const aplicado = { ...OSCURO, contrast: sugerencia.color };
  assert.deepEqual(noLlegan(aplicado, 'contrast'), []);
  assert.ok(pares.some((par) => medida(aplicado, par).relacion === medida(aplicado, par).minimo));
  assert.ok(hsl(sugerencia.color).l > hsl(OSCURO.contrast).l);
});

test('PBI-0267: si ningún color los hace llegar todos, el que hace llegar más, con su recuento', () => {
  // Con un fondo secundario gris claro, ni el texto deshabilitado ni el texto secundario sobre el secundario suave
  // llegan con ningún contraste; los otros cuatro pares sí, oscureciéndolo.
  const colores = { ...B, background: '#FFFFFF', surface: '#A0A0A0', contrast: '#303030' };
  assert.deepEqual(bloqueos(colores), []);
  const pares = noLlegan(colores, 'contrast');
  assert.deepEqual(pares, [
    'muted/surface',
    'footerText/footer',
    'disabledText/disabled',
    'borderStrong/surface',
    'contrast/accentSoft',
    'muted/accentSoft',
  ]);
  const sugerencia = sugerenciaDe(colores, 'contrast');
  assert.equal(sugerencia.tipo, 'color');
  assert.equal(sugerencia.sentido, 'oscurecer');
  assert.deepEqual(sugerencia.pares, pares);
  assert.deepEqual(
    sugerencia.corrige,
    pares.filter((par) => par !== 'disabledText/disabled' && par !== 'muted/accentSoft'),
  );
  const aplicado = { ...colores, contrast: sugerencia.color };
  assert.deepEqual(noLlegan(aplicado, 'contrast'), ['disabledText/disabled', 'muted/accentSoft']);
  assert.deepEqual(bloqueos(aplicado), []);
  assert.ok(
    sugerencia.corrige.some((par) => medida(aplicado, par).relacion === medida(aplicado, par).minimo),
  );
});

test('PBI-0267: si aclarar u oscurecer el color no hace llegar ningún par, lo dice una vez en lugar de sugerir', () => {
  // Con un fondo secundario gris claro, el texto deshabilitado y su fondo salen los dos del contraste y de ese gris: ni
  // con el negro ni con el blanco llegan a 4.5:1. Tampoco el texto secundario sobre el secundario suave.
  const colores = { ...B, background: '#FFFFFF', surface: '#A0A0A0', contrast: '#000000' };
  assert.deepEqual(bloqueos(colores), []);
  assert.deepEqual(sugerenciaDe(colores, 'contrast'), {
    tipo: 'imposible',
    campo: 'contrast',
    pares: ['disabledText/disabled', 'muted/accentSoft'],
  });
});

test('PBI-0267: si los colores que los hacen llegar impedirían guardar, lo dice una vez en lugar de sugerir', () => {
  // Un fondo principal blanco y un fondo secundario gris oscuro: el contraste negro se lee sobre el blanco y bloquea sobre
  // el gris. Aclararlo haría llegar sus pares sobre el fondo secundario, pero dejaría de leerse sobre el blanco: crearía
  // otro bloqueo.
  const colores = { ...B, background: '#FFFFFF', surface: '#333333', contrast: '#000000' };
  assert.deepEqual(bloqueos(colores), ['contrast/surface']);
  const sugerencia = sugerenciaDe(colores, 'contrast');
  assert.deepEqual(sugerencia, {
    tipo: 'bloquearia',
    campo: 'contrast',
    pares: noLlegan(colores, 'contrast'),
  });
  assert.ok(sugerencia.pares.includes('contrast/surface'));
});

test('PBI-0267: en temas al azar, ni una sugerencia ni la cadena crean bloqueos ni dejan sin llegar un par que llegaba', () => {
  // Recorre 40 temas al azar (con semilla fija). Cada sugerencia por color hace llegar los pares que dice y no crea
  // bloqueos ni pares que no lleguen. La cadena, aplicada en orden, recalcula los pares de cada color con las anteriores
  // aplicadas, nunca crea un bloqueo y al final no deja más pares sin llegar que antes.
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
  let parciales = 0;
  let bloquearian = 0;
  let encadenados = 0;
  for (let i = 0; i < 40; i++) {
    const tema = Object.fromEntries(CAMPOS.map((campo) => [campo, colorAlAzar()]));
    const bloqueosAntes = new Set(bloqueos(tema));
    const noLleganAntes = todosLosQueNoLlegan(tema);
    for (const campo of CAMPOS) {
      const sugerencia = sugerirColor(tema, campo);
      if (!noLlegan(tema, campo).length) {
        assert.equal(sugerencia, null);
        continue;
      }
      assert.deepEqual(sugerencia.pares, noLlegan(tema, campo));
      if (sugerencia.tipo === 'bloquearia') bloquearian++;
      if (sugerencia.tipo !== 'color') continue;
      sugeridos++;
      assert.ok(sugerencia.corrige.length > 0);
      if (sugerencia.corrige.length < sugerencia.pares.length) parciales++;
      const aplicado = { ...tema, [campo]: sugerencia.color };
      const siguen = noLlegan(aplicado, campo);
      for (const par of sugerencia.corrige)
        assert.ok(!siguen.includes(par), `${par} en ${JSON.stringify(tema)} con ${sugerencia.color}`);
      for (const nuevo of bloqueos(aplicado))
        assert.ok(bloqueosAntes.has(nuevo), `${campo} crea el bloqueo ${nuevo}`);
      for (const par of todosLosQueNoLlegan(aplicado))
        assert.ok(noLleganAntes.includes(par), `${campo} deja sin llegar ${par}`);
    }

    // La cadena, aplicada en orden.
    const cadena = sugerirColores(tema);
    assert.equal(new Set(cadena.map(({ campo }) => campo)).size, cadena.length);
    let actual = tema;
    for (const paso of cadena) {
      assert.deepEqual(paso.pares, noLlegan(actual, paso.campo), JSON.stringify(tema));
      if (paso.tipo !== 'color') continue;
      encadenados++;
      actual = { ...actual, [paso.campo]: paso.color };
      for (const nuevo of bloqueos(actual)) assert.ok(bloqueosAntes.has(nuevo), `la cadena crea ${nuevo}`);
    }
    const despues = todosLosQueNoLlegan(actual);
    assert.ok(despues.length <= noLleganAntes.length, `${JSON.stringify(tema)}: ${despues.length}`);
    if (cadena.some(({ tipo }) => tipo === 'color')) assert.ok(despues.length < noLleganAntes.length);
  }
  assert.ok(sugeridos > 20, `sugeridos: ${sugeridos}`);
  assert.ok(encadenados > 20, `encadenados: ${encadenados}`);
  assert.ok(parciales > 0, 'algún tema al azar debería tener una sugerencia parcial');
  assert.ok(bloquearian > 0, 'algún tema al azar debería tener un color que solo corrige bloqueando');
});

test('PBI-0267: las líneas import de sugerencia-contraste.rules.ts traen tipos o la réplica de tema.rules', () => {
  const imports = fuente.split('\n').filter((linea) => /^\s*import\b/.test(linea));
  for (const linea of imports)
    assert.match(linea, /^import (type )?\{[^}]*\} from '\.\/tema\.(rules|model)';$/);
});
