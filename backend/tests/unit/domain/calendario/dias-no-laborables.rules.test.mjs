/**
 * Calendario de días no laborables (lote 17, ADR-0021, PBI-0183; provisional, por confirmar con Daniel): la lista vive
 * en el estado del BFF y la edita el superadministrador. `WEBSTORE_NON_WORKING_DATES` solo da el valor inicial cuando
 * el estado no tiene lista.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  diasNoLaborablesIniciales,
  esDiaHabil,
  esFechaDeCalendario,
  fechasNoLaborables,
  normalizarDiasNoLaborables,
  sumarDias,
} from '../../../../src/domain/calendario/dias-no-laborables.rules.mjs';
import { requireValidNonWorkingDates } from '../../../../src/domain/admin/colecciones.rules.mjs';

test('una fecha de calendario es AAAA-MM-DD y existe', () => {
  for (const fecha of ['2026-12-25', '2028-02-29', '2026-01-01'])
    assert.equal(esFechaDeCalendario(fecha), true);
  for (const fecha of ['2026-02-29', '2026-13-01', '26-12-25', '2026-12-25T00:00', '', null, 20261225])
    assert.equal(esFechaDeCalendario(fecha), false, String(fecha));
});

test('sumarDias cruza meses y años sin depender de la zona del servidor', () => {
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(sumarDias('2028-02-28', 1), '2028-02-29');
  assert.equal(sumarDias('2026-03-01', -1), '2026-02-28');
});

test('un día hábil no es sábado, domingo ni un día no laborable', () => {
  const feriados = new Set(['2026-12-08']);
  assert.equal(esDiaHabil('2026-12-07', feriados), true, 'lunes');
  assert.equal(esDiaHabil('2026-12-08', feriados), false, 'feriado');
  assert.equal(esDiaHabil('2026-12-05', feriados), false, 'sábado');
  assert.equal(esDiaHabil('2026-12-06', feriados), false, 'domingo');
});

test('los iniciales salen de WEBSTORE_NON_WORKING_DATES: solo fechas válidas, sin repetir y en orden', () => {
  const iniciales = diasNoLaborablesIniciales(
    new Set(['2026-12-25', '2026-07-28', 'no-es-fecha', '2026-02-30']),
  );
  assert.deepEqual(iniciales, [
    { id: '2026-07-28', date: '2026-07-28', name: '' },
    { id: '2026-12-25', date: '2026-12-25', name: '' },
  ]);
});

test('sin lista guardada, el estado toma los iniciales; con una lista, aunque esté vacía, la conserva', () => {
  const iniciales = [{ id: '2026-12-25', date: '2026-12-25', name: '' }];
  assert.deepEqual(normalizarDiasNoLaborables(undefined, iniciales), iniciales);
  assert.deepEqual(normalizarDiasNoLaborables('texto', iniciales), iniciales);
  assert.deepEqual(normalizarDiasNoLaborables([], iniciales), []);
});

test('al cargar se descartan los días mal formados o repetidos y se ordena por fecha', () => {
  const guardados = [
    { id: 'b', date: '2026-12-25', name: 'Navidad' },
    { id: 'a', date: '2026-01-01', name: ' Año Nuevo ' },
    { id: 'c', date: '2026-12-25', name: 'Repetido' },
    { id: 'd', date: '2026-02-30' },
    { date: '2026-05-01' },
    null,
  ];
  assert.deepEqual(normalizarDiasNoLaborables(guardados, []), [
    { id: 'a', date: '2026-01-01', name: 'Año Nuevo' },
    { id: 'b', date: '2026-12-25', name: 'Navidad' },
  ]);
});

test('fechasNoLaborables da el conjunto de fechas que usan los plazos', () => {
  const fechas = fechasNoLaborables([
    { id: 'a', date: '2026-01-01', name: '' },
    { id: 'b', date: '2026-12-25', name: 'Navidad' },
  ]);
  assert.deepEqual([...fechas], ['2026-01-01', '2026-12-25']);
});

// Guardado desde el Admin (`PUT /admin/snapshot`, colección `nonWorkingDates`).

test('el guardado acepta fechas válidas con un nombre opcional, recortado, y las ordena por fecha', () => {
  assert.deepEqual(
    requireValidNonWorkingDates([
      { id: 'x', date: '2026-12-25', name: '  Navidad ' },
      { id: 'y', date: '2026-07-28' },
    ]),
    [
      { id: 'y', date: '2026-07-28', name: '' },
      { id: 'x', date: '2026-12-25', name: 'Navidad' },
    ],
  );
});

test('una fecha inválida responde INVALID_COLLECTION con el campo date', () => {
  for (const date of ['2026-02-30', '25/12/2026', '', undefined, 20261225])
    assert.throws(
      () => requireValidNonWorkingDates([{ id: 'x', date }]),
      (error) =>
        error.code === 'INVALID_COLLECTION' &&
        error.details.collection === 'nonWorkingDates' &&
        error.details.field === 'date' &&
        /fecha/.test(error.message),
      String(date),
    );
});

test('una fecha repetida se rechaza y el mensaje la nombra', () => {
  assert.throws(
    () =>
      requireValidNonWorkingDates([
        { id: 'x', date: '2026-12-25', name: 'Navidad' },
        { id: 'y', date: '2026-12-25', name: 'Otra' },
      ]),
    (error) =>
      error.code === 'INVALID_COLLECTION' &&
      error.details.field === 'date' &&
      /25\/12\/2026/.test(error.message),
  );
});

test('un nombre que no es texto o de más de 60 caracteres se rechaza en el campo name', () => {
  for (const name of [3, 'x'.repeat(61)])
    assert.throws(
      () => requireValidNonWorkingDates([{ id: 'x', date: '2026-12-25', name }]),
      (error) => error.code === 'INVALID_COLLECTION' && error.details.field === 'name',
    );
  assert.equal(
    requireValidNonWorkingDates([{ id: 'x', date: '2026-12-25', name: 'x'.repeat(60) }]).length,
    1,
  );
});

test('se admiten hasta 400 días no laborables', () => {
  const dias = Array.from({ length: 401 }, (_, i) => ({ id: `d${i}`, date: sumarDias('2026-01-01', i) }));
  assert.throws(() => requireValidNonWorkingDates(dias), { code: 'INVALID_COLLECTION' });
  assert.equal(requireValidNonWorkingDates(dias.slice(0, 400)).length, 400);
});
