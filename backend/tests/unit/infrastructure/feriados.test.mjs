/**
 * Aviso de que faltan los feriados del año en curso (lote 02, PBI-0010; PBI-0163). Desde el lote 17 (ADR-0021,
 * PBI-0183; provisional) el calendario de días no laborables se mantiene desde el Admin y vive en el estado del BFF:
 * el aviso mira esa lista y dice dónde completarla. `WEBSTORE_NON_WORKING_DATES` solo da el valor inicial.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { avisoDeFeriados, crearVigiaDeFeriados, readConfig } from '../../../src/infrastructure/config.mjs';

const fechas = (texto) =>
  new Set(
    texto
      .split(',')
      .map((fecha) => fecha.trim())
      .filter(Boolean),
  );

test('WEBSTORE_NON_WORKING_DATES se sigue leyendo, como el valor inicial del calendario', () => {
  assert.deepEqual(
    [...readConfig({ WEBSTORE_NON_WORKING_DATES: '2026-07-28, 2026-12-25' }).nonWorkingDates],
    ['2026-07-28', '2026-12-25'],
  );
});

test('con una fecha del año en curso no hay aviso', () => {
  assert.equal(avisoDeFeriados(fechas('2026-07-28,2026-12-25'), '2026'), null);
  assert.equal(avisoDeFeriados(fechas('2025-12-25, 2026-01-01'), '2026'), null);
});

test('sin ninguna fecha del año en curso, el aviso nombra el año y dónde agregarlas en el Admin', () => {
  for (const lista of ['', '2025-12-25,2027-01-01', '2026', '03/11/2026,2026-7-28']) {
    const aviso = avisoDeFeriados(fechas(lista), '2026');
    assert.match(aviso, /días no laborables.*2026/, JSON.stringify(lista));
    assert.match(aviso, /Entregas y feriados/, JSON.stringify(lista));
    assert.doesNotMatch(aviso, /WEBSTORE_NON_WORKING_DATES/, 'la variable ya no es la fuente');
  }
});

test('el año se compara tal cual: una fecha de otro año con el mismo mes y día no cuenta', () => {
  assert.notEqual(avisoDeFeriados(fechas('2025-07-28'), '2026'), null);
  assert.equal(avisoDeFeriados(fechas('2025-07-28'), '2025'), null);
});

// Lote 08, PBI-0163: el aviso también se repite cuando el año de Lima cambia con el BFF en marcha.
test('la vigía avisa al empezar y otra vez cuando cambia el año de Lima, no antes', () => {
  let hoy = '2026-12-31';
  const avisos = [];
  const vigia = crearVigiaDeFeriados({
    fechasNoLaborables: () => fechas('2026-12-25'),
    hoy: () => hoy,
    avisar: (texto) => avisos.push(texto),
  });
  vigia.comprobar();
  assert.deepEqual(avisos, [], 'con feriados de 2026 y en 2026 no hay aviso');
  vigia.comprobar();
  assert.deepEqual(avisos, [], 'sin cambio de año no se repite nada');
  hoy = '2027-01-01';
  vigia.comprobar();
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /días no laborables.*2027/);
  hoy = '2027-01-02';
  vigia.comprobar();
  assert.equal(avisos.length, 1, 'el mismo año no se avisa dos veces');
  hoy = '2028-01-01';
  vigia.comprobar();
  assert.equal(avisos.length, 2, 'cada año nuevo sin feriados avisa');
  assert.match(avisos[1], /2028/);
});

test('la vigía lee el calendario vigente cada vez: lo que se agrega desde el Admin cuenta', () => {
  let calendario = fechas('');
  let hoy = '2026-12-31';
  const avisos = [];
  const vigia = crearVigiaDeFeriados({
    fechasNoLaborables: () => calendario,
    hoy: () => hoy,
    avisar: (texto) => avisos.push(texto),
  });
  vigia.comprobar();
  assert.equal(avisos.length, 1);
  calendario = fechas('2027-01-01');
  hoy = '2027-01-01';
  vigia.comprobar();
  assert.equal(avisos.length, 1, 'el año nuevo ya tiene feriados');
});

test('la vigía avisa al empezar si ya faltan los feriados del año en curso', () => {
  const avisos = [];
  crearVigiaDeFeriados({
    fechasNoLaborables: () => fechas(''),
    hoy: () => '2026-03-01',
    avisar: (texto) => avisos.push(texto),
  }).comprobar();
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /2026/);
});

test('la vigía programa su revisión sin mantener vivo el proceso y se puede detener', () => {
  const programadas = [];
  const vigia = crearVigiaDeFeriados({
    fechasNoLaborables: () => fechas(''),
    hoy: () => '2026-03-01',
    avisar: () => {},
    cada: 1234,
    programar: (funcion, ms) => {
      const temporizador = { funcion, ms, unrefLlamado: false, limpiado: false };
      temporizador.unref = () => (temporizador.unrefLlamado = true);
      programadas.push(temporizador);
      return temporizador;
    },
    cancelar: (temporizador) => (temporizador.limpiado = true),
  });
  vigia.iniciar();
  assert.equal(programadas.length, 1);
  assert.equal(programadas[0].ms, 1234);
  assert.equal(programadas[0].unrefLlamado, true, 'un temporizador vivo impediría cerrar el BFF');
  vigia.detener();
  assert.equal(programadas[0].limpiado, true);
});
