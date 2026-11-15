/**
 * TEST-14: la réplica del Admin de las reglas de temas recorre los mismos casos que el BFF.
 * `casos-tema.json` se lee solo como datos: aquí no se importa código del BFF. Como los demás
 * `*.spec.mjs` del Admin, transpila el `.ts` y borra sus líneas `import` (por eso `tema.rules.ts` solo
 * importa tipos).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const fuente = await readFile(new URL('./tema.rules.ts', import.meta.url), 'utf8');
const modulo = ts.transpileModule(fuente.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  PARES_DE_CONTRASTE,
  TOKENS_DEL_TEMA,
  coloresCalculados,
  medirPares,
  mezclarSrgb,
  relacionDeContraste,
  revisarContraste,
  textoMasLegible,
  tokensDelTema,
  validarNombreTema,
} = await import(`data:text/javascript;base64,${Buffer.from(modulo).toString('base64')}`);

const casos = JSON.parse(
  await readFile(
    new URL('../../../../../../../../backend/tests/unit/domain/temas/casos-tema.json', import.meta.url),
    'utf8',
  ),
);
const centesimas = (pares) =>
  Object.fromEntries(Object.entries(pares).map(([par, valor]) => [par, Math.round(valor * 100) / 100]));

test('contraste: la relación WCAG coincide con los casos, también en orden inverso', () => {
  for (const { a, b, relacion, decimales } of casos.contraste) {
    const factor = 10 ** decimales;
    assert.equal(Math.round(relacionDeContraste(a, b) * factor) / factor, relacion, `${a} sobre ${b}`);
  }
});

test('mezcla: coincide con color-mix y devuelve mayúsculas', () => {
  for (const { a, peso, b, resultado } of casos.mezcla)
    assert.equal(mezclarSrgb(a, peso, b), resultado, `mezcla de ${a} al ${peso} con ${b}`);
});

test('textoMasLegible: elige el mayor contraste, el primero en empate y tal como llegó', () => {
  for (const { fondo, candidatos, resultado } of casos.textoMasLegible)
    assert.equal(textoMasLegible(fondo, candidatos), resultado, `texto sobre ${fondo}`);
});

test('un valor que no sea #RRGGBB es un error de programación', () => {
  assert.throws(() => relacionDeContraste('azul', '#FFFFFF'), Error);
  assert.throws(() => mezclarSrgb('#FFF', 0.5, '#000000'), Error);
  assert.throws(() => textoMasLegible('#12345G', ['#FFFFFF']), Error);
});

test('predefinidos: mapa completo de tokens en orden y pares de contraste en centésimas', () => {
  for (const { id, tokens } of casos.predefinidos) {
    assert.deepEqual(Object.keys(tokens), [...TOKENS_DEL_TEMA], id);
    assert.deepEqual(centesimas(medirPares(tokens)), casos.paresPredefinidos[id], id);
  }
});

test('TOKENS_DEL_TEMA y PARES_DE_CONTRASTE: 37 tokens, 27 pares y solo dos bloquean', () => {
  assert.equal(TOKENS_DEL_TEMA.length, 37);
  assert.equal(TOKENS_DEL_TEMA.indexOf('--ws-store-bg'), TOKENS_DEL_TEMA.indexOf('--ws-bg') - 1);
  assert.ok(Object.isFrozen(TOKENS_DEL_TEMA) && Object.isFrozen(PARES_DE_CONTRASTE));
  assert.equal(PARES_DE_CONTRASTE.length, 27);
  assert.deepEqual(
    PARES_DE_CONTRASTE.filter(({ bloquea }) => bloquea).map(({ par }) => par),
    ['contrast/background', 'contrast/surface'],
  );
  for (const { par, minimo } of PARES_DE_CONTRASTE)
    assert.equal(minimo, par.startsWith('focusRing/') || par.startsWith('borderStrong/') ? 3 : 4.5, par);
});

test('el texto sobre el enlace va justo después del enlace, fuera de la escala neutra, y su par sigue al del contorno (ADR-0014)', () => {
  const indice = TOKENS_DEL_TEMA.indexOf('--ws-on-link');
  assert.equal(TOKENS_DEL_TEMA[indice - 1], '--ws-link');
  assert.ok(indice < TOKENS_DEL_TEMA.indexOf('--ws-bg'), 'antes de la escala neutra');
  assert.deepEqual(PARES_DE_CONTRASTE[20], {
    par: 'onLink/link',
    texto: '--ws-on-link',
    fondo: '--ws-link',
    minimo: 4.5,
    bloquea: false,
  });
});

for (const { nombre, colores, tokens, pares } of casos.tokensDelTema) {
  test(`tokensDelTema: ${nombre}`, () => {
    const calculados = tokensDelTema(colores, casos.predefinidos);
    assert.deepEqual(Object.keys(calculados), [...TOKENS_DEL_TEMA], 'todos los tokens, en orden');
    assert.deepEqual({ ...calculados }, tokens);
    assert.ok(Object.isFrozen(calculados));
    assert.deepEqual(centesimas(medirPares(calculados)), pares);
  });
}

test('tokensDelTema escribe los colores en mayúsculas y sin predefinidos no hereda base', () => {
  const { colores } = casos.tokensDelTema[0];
  const minusculas = Object.fromEntries(Object.entries(colores).map(([k, v]) => [k, v.toLowerCase()]));
  assert.deepEqual(
    { ...tokensDelTema(minusculas, casos.predefinidos) },
    { ...tokensDelTema(colores, casos.predefinidos) },
  );
  assert.equal(tokensDelTema(colores)['--ws-text'], colores.contrast.toUpperCase());
});

test('coloresCalculados resuelve var() y color-mix() como el navegador', () => {
  const calculados = coloresCalculados(casos.predefinidos.find(({ id }) => id === 'b').tokens);
  assert.equal(calculados['--ws-primary'], '#1D4ED8');
  assert.equal(calculados['--ws-primary-strong'], '#183996');
  assert.equal(calculados['--ws-link'], '#1D4ED8');
});

test('coloresCalculados rechaza un valor que no sabe calcular', () => {
  assert.throws(() => coloresCalculados({ '--ws-primary': 'red' }));
  assert.throws(() => coloresCalculados({ '--ws-link': 'var(--ws-primary)' }));
  assert.throws(() => coloresCalculados({ '--ws-link': 'var(--ws-link)' }));
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

test('revisarContraste devuelve los 27 pares, en el orden de PARES_DE_CONTRASTE, congelados y con bloqueo solo en contraste', () => {
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
      assert.equal(par.bloquea, par.par === 'contrast/background' || par.par === 'contrast/surface', par.par);
    }
  }
});

test('revisarContraste redondea la relación hacia abajo: 4.47 se informa como 4.4', () => {
  const { colores } = casos.revisarContraste.find(({ nombre }) => nombre.startsWith('redondeo'));
  const exacta = medirPares(tokensDelTema(colores, casos.predefinidos))['contrast/background'];
  assert.ok(exacta > 4.45 && exacta < 4.5, 'el redondeo al más cercano lo mostraría como 4.5');
  const par = revisarContraste(colores, casos.predefinidos).find((p) => p.par === 'contrast/background');
  assert.equal(par.relacion, 4.4);
  assert.ok(par.relacion < par.minimo);
});

const nombresPredefinidos = casos.predefinidos.map(({ name }) => name);
for (const { nombre, existentes, resultado, error } of casos.nombresDeTema) {
  test(`validarNombreTema: ${JSON.stringify(nombre)} frente a ${JSON.stringify(existentes)}`, () => {
    const veredicto = validarNombreTema(nombre, [...nombresPredefinidos, ...existentes]);
    if (error) {
      assert.equal(veredicto.valido, false);
      assert.equal(veredicto.codigo, error);
    } else {
      assert.equal(veredicto.valido, true);
      assert.equal(veredicto.nombre, resultado);
    }
  });
}

test('validarNombreTema devuelve los mismos mensajes que el BFF', () => {
  assert.deepEqual(validarNombreTema('   ', []), {
    valido: false,
    codigo: 'INVALID_THEME_NAME',
    mensaje: 'El nombre del tema debe tener entre 1 y 40 caracteres.',
  });
  assert.deepEqual(validarNombreTema('Mi TEMA', ['mi tema']), {
    valido: false,
    codigo: 'THEME_NAME_TAKEN',
    mensaje: 'Ya existe un tema con ese nombre.',
  });
  assert.deepEqual(validarNombreTema('  Nuevo  ', ['Otro']), { valido: true, nombre: 'Nuevo' });
  // PBI-0069: el mismo mensaje que el BFF para un nombre con caracteres invisibles.
  assert.deepEqual(validarNombreTema('Mi​tema', []), {
    valido: false,
    codigo: 'INVALID_THEME_NAME',
    mensaje: 'El nombre del tema no puede llevar caracteres invisibles.',
  });
});

// Lote 03 (PBI-0061 y PBI-0062, ADR-0019): la réplica calcula el error, la alerta y el texto sobre el principal como el
// BFF; los casos de `tokensDelTema` lo comprueban valor por valor y aquí, el orden y los pares nuevos.
test('el error y la alerta van justo después de la franja superior y sus seis pares, al final, solo avisan', () => {
  const inicio = TOKENS_DEL_TEMA.indexOf('--ws-on-topbar') + 1;
  assert.deepEqual(TOKENS_DEL_TEMA.slice(inicio, inicio + 5), [
    '--ws-danger',
    '--ws-danger-soft',
    '--ws-danger-line',
    '--ws-warning',
    '--ws-warning-soft',
  ]);
  assert.deepEqual(
    PARES_DE_CONTRASTE.slice(21).map(({ par, bloquea, minimo }) => [par, bloquea, minimo]),
    [
      ['danger/background', false, 4.5],
      ['danger/surface', false, 4.5],
      ['danger/dangerSoft', false, 4.5],
      ['warning/background', false, 4.5],
      ['warning/surface', false, 4.5],
      ['warning/warningSoft', false, 4.5],
    ],
  );
});

test('todas las líneas import de tema.rules.ts son import type (el spec las borra al transpilar)', () => {
  const imports = fuente.split('\n').filter((linea) => /^\s*import\b/.test(linea));
  assert.ok(imports.length > 0);
  for (const linea of imports) assert.match(linea, /^import type \{.*\} from '\.\/tema\.model';$/);
});
