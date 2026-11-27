import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017), PBI-0128: la vigencia de un banner es en hora de Lima, el fin no va antes del inicio y el tope
// de tres banners principales activos solo cuenta los que coinciden en fechas con el que se guarda. Lote 24 (ADR-0025,
// PBI-0221; confirmado por Sebastián Avila): la vigencia lleva fecha y hora. El formulario las muestra y las recibe en
// hora de Lima (`AAAA-MM-DDTHH:mm`, el valor de un `datetime-local`), y se guardan como instantes con `-05:00`: el
// inicio al empezar el minuto y el fin al terminarlo, así que 00:00 y 23:59 son el día completo de antes.
const source = await readFile(new URL('./banner.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  aHoraDeLima,
  inicioEnLima,
  finEnLima,
  instanteDeLaVigencia,
  vigenciaVisible,
  finAntesDelInicio,
  heroesQueCoinciden,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

test('PBI-0221: el inicio y el fin elegidos en hora de Lima se guardan con su zona, al empezar y al terminar el minuto', () => {
  assert.equal(inicioEnLima('2026-12-10T09:30'), '2026-12-10T09:30:00.000-05:00');
  assert.equal(finEnLima('2026-12-31T23:59'), '2026-12-31T23:59:59.999-05:00');
  // 09:30 en Lima son las 14:30 UTC, no las 09:30 UTC (cinco horas antes).
  assert.equal(new Date(inicioEnLima('2026-12-10T09:30')).toISOString(), '2026-12-10T14:30:00.000Z');
});

test('PBI-0221: un instante guardado se muestra en hora de Lima, sea cual sea su zona', () => {
  assert.equal(aHoraDeLima('2026-12-10T00:00:00.000-05:00'), '2026-12-10T00:00');
  assert.equal(aHoraDeLima('2026-12-31T23:59:59.999-05:00'), '2026-12-31T23:59');
  // Los banners de ejemplo se guardaron en UTC: empiezan a las 19:00 del día anterior en Lima.
  assert.equal(aHoraDeLima('2026-01-01T00:00:00.000Z'), '2025-12-31T19:00');
  assert.equal(aHoraDeLima('2027-12-31T23:59:59.000Z'), '2027-12-31T18:59');
  assert.equal(aHoraDeLima(''), '');
  assert.equal(aHoraDeLima('no es una fecha'), '');
});

test('PBI-0221: la vigencia de la lista de Banners se lee en hora de Lima', () => {
  assert.equal(
    vigenciaVisible('2026-12-10T09:30:00.000-05:00', '2026-12-31T23:59:59.999-05:00'),
    '10/12/2026 09:30 → 31/12/2026 23:59',
  );
});

test('PBI-0221: si no se cambió el minuto, se conserva el instante guardado (sus segundos y su zona)', () => {
  const guardado = '2027-12-31T23:59:59.000Z';
  assert.equal(instanteDeLaVigencia(guardado, '2027-12-31T18:59', 'fin'), guardado);
  assert.equal(instanteDeLaVigencia(guardado, '2027-12-31T20:00', 'fin'), '2027-12-31T20:00:59.999-05:00');
  assert.equal(
    instanteDeLaVigencia(undefined, '2026-12-01T08:00', 'inicio'),
    '2026-12-01T08:00:00.000-05:00',
  );
});

test('PBI-0221: el fin no puede ir antes del inicio; el mismo minuto sí vale', () => {
  assert.equal(finAntesDelInicio('2026-12-10T09:30', '2026-12-10T09:29'), true);
  assert.equal(finAntesDelInicio('2026-12-10T09:30', '2026-12-01T23:59'), true);
  assert.equal(finAntesDelInicio('2026-12-10T09:30', '2026-12-10T09:30'), false);
  assert.equal(finAntesDelInicio('2026-12-10T09:30', '2026-12-10T18:00'), false);
  assert.equal(finAntesDelInicio('', '2026-12-01T08:00'), false, 'sin inicio no hay comparación');
});

const banner = (id, startAt, endAt, cambios = {}) => ({
  id,
  placement: 'hero',
  active: true,
  startAt,
  endAt,
  ...cambios,
});

test('PBI-0128: el tope de banners principales no cuenta los vencidos, los inactivos ni otras ubicaciones', () => {
  const banners = [
    banner('b1', '2026-01-01T00:00:00.000Z', '2027-12-31T23:59:59.000Z'),
    banner('b2', '2026-01-01T00:00:00.000Z', '2026-06-30T23:59:59.000Z'),
    banner('b3', '2026-01-01T00:00:00.000Z', '2027-12-31T23:59:59.000Z', { active: false }),
    banner('b4', '2026-01-01T00:00:00.000Z', '2027-12-31T23:59:59.000Z', { placement: 'promotion' }),
    banner('b5', '2027-03-01T00:00:00.000-05:00', '2027-03-31T23:59:59.999-05:00'),
  ];
  const vigencia = (id, inicio, fin) => ({ id, startAt: inicio, endAt: fin });
  assert.equal(heroesQueCoinciden(banners, vigencia('nuevo', '2026-12-01T00:00', '2026-12-31T23:59')), 1);
  assert.equal(heroesQueCoinciden(banners, vigencia('nuevo', '2027-03-15T00:00', '2027-04-15T23:59')), 2);
  assert.equal(
    heroesQueCoinciden(banners, vigencia('b1', '2027-03-15T00:00', '2027-04-15T23:59')),
    1,
    'no se cuenta a sí mismo',
  );
});

test('PBI-0221: con hora, dos banners del mismo día que no se cruzan no cuentan juntos para el tope', () => {
  const banners = [banner('b1', '2026-12-10T08:00:00.000-05:00', '2026-12-10T11:59:59.999-05:00')];
  const tarde = { id: 'nuevo', startAt: '2026-12-10T12:00', endAt: '2026-12-10T18:00' };
  assert.equal(heroesQueCoinciden(banners, tarde), 0);
  assert.equal(heroesQueCoinciden(banners, { ...tarde, startAt: '2026-12-10T11:59' }), 1);
});

// Lote 12 (ADR-0021), PBI-0184 (confirmado por Sebastián Avila): cada botón del banner va completo (texto y enlace) o
// vacío, y el texto admite hasta 40 caracteres, como valida el BFF.
const { errorDeBoton, MAXIMO_TEXTO_DE_BOTON } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0184: un botón con texto y enlace, o sin ninguno de los dos, vale', () => {
  assert.equal(errorDeBoton('Ver ofertas', '/catalogo'), null);
  assert.equal(errorDeBoton('Escríbenos', 'mailto:ventas@example.com'), null);
  assert.equal(errorDeBoton('', ''), null);
  assert.equal(errorDeBoton('  ', ' '), null, 'los espacios no cuentan');
});

test('PBI-0184: un botón a medias dice qué le falta', () => {
  assert.equal(errorDeBoton('Ver ofertas', ''), 'sinEnlace');
  assert.equal(errorDeBoton('Ver ofertas', '   '), 'sinEnlace');
  assert.equal(errorDeBoton('', 'https://example.com'), 'sinTexto');
});

test('PBI-0184: el texto del botón admite los mismos 40 caracteres que el BFF', async () => {
  const bff = await import(
    new URL('../../../../../../../../backend/src/domain/admin/colecciones.rules.mjs', import.meta.url)
  );
  assert.equal(MAXIMO_TEXTO_DE_BOTON, 40);
  assert.equal(MAXIMO_TEXTO_DE_BOTON, bff.MAXIMO_TEXTO_DE_BOTON);
});

// Lote 46 (ADR-0033, PBI-0266): cada botón del banner elige su estilo entre los cuatro del tema, sin color libre. Por
// omisión, el primero es «Principal» y el segundo «Secundario», como desde el lote 12: los banners guardados no cambian.
const { ESTILOS_DE_BOTON, ESTILO_POR_OMISION, estiloDeBoton } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0266: los cuatro estilos del tema, en este orden y con su nombre', () => {
  assert.deepEqual(
    ESTILOS_DE_BOTON.map(({ valor, nombre }) => [valor, nombre]),
    [
      ['primary', 'Principal'],
      ['accent', 'Secundario'],
      ['contrast', 'Contraste'],
      ['outline', 'Con borde'],
    ],
  );
});

test('PBI-0266: por omisión, el primero es el principal y el segundo el secundario', () => {
  assert.deepEqual(ESTILO_POR_OMISION, { ctaStyle: 'primary', secondaryCtaStyle: 'accent' });
});

test('PBI-0266: el estilo guardado se conserva; uno que falta o no existe pasa al de por omisión', () => {
  for (const { valor } of ESTILOS_DE_BOTON) assert.equal(estiloDeBoton(valor, 'accent'), valor);
  assert.equal(estiloDeBoton(undefined, 'primary'), 'primary');
  assert.equal(estiloDeBoton(undefined, 'accent'), 'accent');
  for (const desconocido of ['', 'rojo', '#FF0000', null, 3])
    assert.equal(estiloDeBoton(desconocido, 'accent'), 'accent');
});
