/**
 * Reglas del Libro de reclamaciones (lote 02, PBI-0102): el plazo de respuesta en días hábiles de Perú, el código
 * correlativo y el monto reclamado. Lima es UTC−5 todo el año; el servidor está en otra zona a propósito.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  addPeruBusinessDays,
  COMPLAINT_DUE_BUSINESS_DAYS,
  nextComplaintCode,
  requireComplaintAmount,
} from '../../../../src/domain/reclamos/reclamo.rules.mjs';

process.env.TZ = 'Asia/Tokyo';

const sinFeriados = new Set();
/** Fin del día de Lima (23:59:59.999) de la fecha dada, como instante UTC. */
const finDelDia = (fecha) => {
  const siguiente = new Date(`${fecha}T00:00:00Z`);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  return `${siguiente.toISOString().slice(0, 10)}T04:59:59.999Z`;
};

test('el plazo del Libro de reclamaciones es de 15 días hábiles', () => {
  assert.equal(COMPLAINT_DUE_BUSINESS_DAYS, 15);
});

test('15 días hábiles desde un lunes caen en el lunes de tres semanas después, al final del día de Lima', () => {
  // 2026-11-02 es lunes (10:00 en Lima).
  const vence = addPeruBusinessDays('2026-11-02T15:00:00.000Z', 15, sinFeriados);
  assert.equal(vence, '2026-11-24T04:59:59.999Z');
  assert.equal(vence, finDelDia('2026-11-23'));
});

test('los sábados y los domingos no cuentan: desde un viernes, un día hábil es el lunes', () => {
  assert.equal(addPeruBusinessDays('2026-11-06T15:00:00.000Z', 1, sinFeriados), finDelDia('2026-11-09'));
});

test('un reclamo del fin de semana cuenta desde el lunes siguiente', () => {
  // Sábado 7 y domingo 8 de noviembre de 2026.
  for (const inicio of ['2026-11-07T15:00:00.000Z', '2026-11-08T15:00:00.000Z'])
    assert.equal(addPeruBusinessDays(inicio, 1, sinFeriados), finDelDia('2026-11-09'), inicio);
  assert.equal(addPeruBusinessDays('2026-11-07T15:00:00.000Z', 5, sinFeriados), finDelDia('2026-11-13'));
});

test('un feriado configurado no cuenta como día hábil', () => {
  assert.equal(
    addPeruBusinessDays('2026-11-02T15:00:00.000Z', 1, new Set(['2026-11-03'])),
    finDelDia('2026-11-04'),
  );
  // Un feriado el viernes, antes del fin de semana: el día hábil siguiente es el lunes.
  assert.equal(
    addPeruBusinessDays('2026-11-05T15:00:00.000Z', 1, new Set(['2026-11-06'])),
    finDelDia('2026-11-09'),
  );
});

test('un feriado en fin de semana no alarga el plazo', () => {
  assert.equal(
    addPeruBusinessDays('2026-11-06T15:00:00.000Z', 1, new Set(['2026-11-07', '2026-11-08'])),
    finDelDia('2026-11-09'),
  );
});

test('una fecha escrita de otra forma, o de otro año, no es un feriado', () => {
  const vence = addPeruBusinessDays('2026-11-02T15:00:00.000Z', 1, new Set(['2025-11-03', '03/11/2026']));
  assert.equal(vence, finDelDia('2026-11-03'));
});

test('se cuenta desde la fecha de Lima, no desde la de UTC o la del servidor', () => {
  // 22:30 del lunes 2 en Lima ya es martes 3 en UTC: un día hábil después es el martes, no el miércoles.
  assert.equal(addPeruBusinessDays('2026-11-03T03:30:00.000Z', 1, sinFeriados), finDelDia('2026-11-03'));
  // 19:30 del viernes 6 en Lima es sábado en UTC y ya domingo en Tokio: sigue siendo viernes.
  assert.equal(addPeruBusinessDays('2026-11-07T00:30:00.000Z', 1, sinFeriados), finDelDia('2026-11-09'));
});

test('el plazo cruza el fin de año y respeta el feriado del 1 de enero', () => {
  // Miércoles 30 de diciembre de 2026: jueves 31 (1), viernes 1 de enero (2), lunes 4 (3).
  assert.equal(addPeruBusinessDays('2026-12-30T15:00:00.000Z', 3, sinFeriados), finDelDia('2027-01-04'));
  assert.equal(
    addPeruBusinessDays('2026-12-30T15:00:00.000Z', 3, new Set(['2027-01-01'])),
    finDelDia('2027-01-05'),
  );
});

test('sin días que sumar, el plazo vence al final del mismo día de Lima', () => {
  assert.equal(addPeruBusinessDays('2026-11-02T15:00:00.000Z', 0, sinFeriados), finDelDia('2026-11-02'));
});

test('el año bisiesto: 29 de febrero de 2028 es un día de calendario más', () => {
  // Lunes 28 de febrero de 2028: martes 29 (1), miércoles 1 de marzo (2).
  assert.equal(addPeruBusinessDays('2028-02-28T15:00:00.000Z', 2, sinFeriados), finDelDia('2028-03-01'));
});

test('el código REC-AAAA-NNNNN sigue al mayor emitido del año, con cinco dígitos', () => {
  assert.equal(nextComplaintCode([], '2027'), 'REC-2027-00001');
  assert.equal(nextComplaintCode(['REC-2027-00001', 'REC-2027-00007'], '2027'), 'REC-2027-00008');
  assert.equal(nextComplaintCode(['REC-2027-99999'], '2027'), 'REC-2027-100000');
});

test('el código ignora otros años, los identificadores que no son códigos y los correlativos rotos', () => {
  const existentes = ['REC-2026-00040', 'REC-2027-abc', 'REC-2027-1.5', 'REC-2027', null, undefined, 7, {}];
  assert.equal(nextComplaintCode(existentes, '2027'), 'REC-2027-00001');
  assert.equal(nextComplaintCode(['REC-2027-00002', ...existentes], '2027'), 'REC-2027-00003');
});

test('el monto sin valor es 0 y un número o un texto numérico se conserva', () => {
  for (const vacio of [undefined, null, '']) assert.equal(requireComplaintAmount(vacio), 0, String(vacio));
  assert.equal(requireComplaintAmount(0), 0);
  assert.equal(requireComplaintAmount(125.5), 125.5);
  assert.equal(requireComplaintAmount('80.25'), 80.25);
});

test('un monto negativo, infinito, no numérico o de otro tipo responde INVALID_COMPLAINT_AMOUNT', () => {
  for (const monto of [-0.01, '-5', Infinity, Number.NaN, 'abc', true, {}, [], [3]])
    assert.throws(
      () => requireComplaintAmount(monto),
      { code: 'INVALID_COMPLAINT_AMOUNT', kind: 'validation' },
      String(monto),
    );
});
