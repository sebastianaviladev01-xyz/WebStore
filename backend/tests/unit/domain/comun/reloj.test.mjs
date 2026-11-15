/**
 * Reloj de Lima (lote 02, PBI-0103): la fecha de calendario de Lima y el final de su día, sin depender de la zona del
 * servidor ni de un desfase escrito en cada regla.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { finDelDiaDeLima, limaDate } from '../../../../src/domain/comun/reloj.mjs';

process.env.TZ = 'Asia/Tokyo';

test('la fecha de Lima cambia a las 05:00 UTC, no a medianoche UTC ni a la del servidor', () => {
  assert.equal(limaDate('2026-11-03T04:59:59.999Z'), '2026-11-02');
  assert.equal(limaDate('2026-11-03T05:00:00.000Z'), '2026-11-03');
  assert.equal(limaDate('2026-12-31T23:30:00.000Z'), '2026-12-31');
  assert.equal(limaDate('2027-01-01T04:59:00.000Z'), '2026-12-31');
});

test('el final del día de Lima es el último milisegundo de esa fecha', () => {
  assert.equal(finDelDiaDeLima('2026-11-02'), '2026-11-03T04:59:59.999Z');
  assert.equal(finDelDiaDeLima('2026-12-31'), '2027-01-01T04:59:59.999Z');
  assert.equal(finDelDiaDeLima('2028-02-29'), '2028-03-01T04:59:59.999Z');
});

test('el final del día sigue en su fecha de Lima y un milisegundo después ya es la siguiente', () => {
  for (const fecha of ['2026-11-02', '2026-12-31', '2028-02-29', '2027-01-01']) {
    const fin = new Date(finDelDiaDeLima(fecha));
    assert.equal(limaDate(fin), fecha);
    assert.notEqual(limaDate(new Date(fin.getTime() + 1)), fecha);
  }
});
