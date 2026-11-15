/**
 * Aviso al arrancar de que faltan los feriados del año en curso (lote 02, PBI-0010; provisional, por confirmar con
 * Daniel): `WEBSTORE_NON_WORKING_DATES` es la fuente del calendario y hay que renovarla cada año.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { avisoDeFeriados, readConfig } from '../../../src/infrastructure/config.mjs';

const fechas = (texto) => readConfig({ WEBSTORE_NON_WORKING_DATES: texto }).nonWorkingDates;

test('con una fecha del año en curso no hay aviso', () => {
  assert.equal(avisoDeFeriados(fechas('2026-07-28,2026-12-25'), '2026'), null);
  assert.equal(avisoDeFeriados(fechas('2025-12-25, 2026-01-01'), '2026'), null);
});

test('sin ninguna fecha del año en curso, el aviso nombra la variable, el año y el formato', () => {
  for (const lista of ['', '2025-12-25,2027-01-01', '2026', '03/11/2026,2026-7-28'])
    assert.match(
      avisoDeFeriados(fechas(lista), '2026'),
      /WEBSTORE_NON_WORKING_DATES.*2026.*AAAA-MM-DD/,
      JSON.stringify(lista),
    );
});

test('el año se compara tal cual: una fecha de otro año con el mismo mes y día no cuenta', () => {
  assert.notEqual(avisoDeFeriados(fechas('2025-07-28'), '2026'), null);
  assert.equal(avisoDeFeriados(fechas('2025-07-28'), '2025'), null);
});
