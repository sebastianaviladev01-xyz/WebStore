/**
 * Primera fecha de entrega (lote 17, ADR-0021, PBI-0178; confirmado por Sebastián Avila): la tienda elige el
 * mismo día, el día calendario siguiente o el siguiente día hábil, con una hora de corte opcional en hora de Lima. Por
 * defecto, el día calendario siguiente sin hora de corte. Los instantes se fijan en UTC: Lima es UTC−5 todo el año.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ENTREGA_POR_DEFECTO,
  esHoraDeCorte,
  esReglaDePrimeraEntrega,
  primeraFechaDeEntrega,
} from '../../../../src/domain/pedidos/primera-fecha-de-entrega.rules.mjs';

/** Instante de una hora de Lima (`AAAA-MM-DDTHH:MM:SS`). */
const lima = (local) => new Date(`${local}-05:00`);

const primera = (local, entrega = {}, feriados = []) =>
  primeraFechaDeEntrega(lima(local), { ...ENTREGA_POR_DEFECTO, ...entrega }, new Set(feriados));

test('por defecto, el día calendario siguiente sin hora de corte', () => {
  assert.deepEqual(ENTREGA_POR_DEFECTO, { firstDeliveryDay: 'next-calendar-day', deliveryCutoffTime: '' });
  assert.equal(primera('2026-11-23T10:00:00'), '2026-11-24');
  assert.equal(primera('2026-11-23T23:59:59'), '2026-11-24');
  assert.equal(primera('2026-11-28T10:00:00'), '2026-11-29', 'el sábado, el domingo: es día calendario');
});

test('la fecha es la de Lima: a medianoche de Lima ya es el día siguiente, aunque en UTC no', () => {
  // 2026-11-24 04:59:59 UTC son las 23:59:59 del 23 en Lima; 05:00 UTC, las 00:00 del 24.
  assert.equal(
    primeraFechaDeEntrega(new Date('2026-11-24T04:59:59.999Z'), ENTREGA_POR_DEFECTO, new Set()),
    '2026-11-24',
  );
  assert.equal(
    primeraFechaDeEntrega(new Date('2026-11-24T05:00:00.000Z'), ENTREGA_POR_DEFECTO, new Set()),
    '2026-11-25',
  );
});

test('el mismo día: hoy en Lima, también un domingo o un feriado', () => {
  const mismoDia = { firstDeliveryDay: 'same-day' };
  assert.equal(primera('2026-11-23T23:59:59', mismoDia), '2026-11-23');
  assert.equal(primera('2026-12-08T09:00:00', mismoDia, ['2026-12-08']), '2026-12-08');
});

test('la hora de corte exacta ya cuenta como pasada: suma un día del tipo elegido', () => {
  const mismoDia = { firstDeliveryDay: 'same-day', deliveryCutoffTime: '14:00' };
  assert.equal(primera('2026-11-23T13:59:59', mismoDia), '2026-11-23');
  assert.equal(primera('2026-11-23T14:00:00', mismoDia), '2026-11-24');
  const siguiente = { firstDeliveryDay: 'next-calendar-day', deliveryCutoffTime: '14:00' };
  assert.equal(primera('2026-11-23T13:59:59', siguiente), '2026-11-24');
  assert.equal(primera('2026-11-23T14:00:00', siguiente), '2026-11-25');
});

test('una hora de corte a medianoche (00:00) pasa siempre: suma un día', () => {
  assert.equal(primera('2026-11-23T00:00:00', { deliveryCutoffTime: '00:00' }), '2026-11-25');
});

test('el siguiente día hábil salta sábados, domingos y feriados', () => {
  const habil = { firstDeliveryDay: 'next-business-day' };
  assert.equal(primera('2026-11-23T10:00:00', habil), '2026-11-24', 'lunes → martes');
  assert.equal(primera('2026-11-27T10:00:00', habil), '2026-11-30', 'viernes → lunes');
  assert.equal(primera('2026-11-28T10:00:00', habil), '2026-11-30', 'sábado → lunes');
  assert.equal(primera('2026-11-29T10:00:00', habil), '2026-11-30', 'domingo → lunes');
});

test('feriados seguidos: Fiestas Patrias (28 y 29 de julio de 2026, martes y miércoles)', () => {
  const habil = { firstDeliveryDay: 'next-business-day' };
  assert.equal(primera('2026-07-27T10:00:00', habil, ['2026-07-28', '2026-07-29']), '2026-07-30');
});

test('fin de semana largo: un viernes con el lunes feriado entrega el martes', () => {
  const habil = { firstDeliveryDay: 'next-business-day' };
  assert.equal(primera('2026-11-27T10:00:00', habil, ['2026-11-30']), '2026-12-01');
  // Navidad cae viernes en 2026: el jueves 24 entrega el lunes 28.
  assert.equal(primera('2026-12-24T10:00:00', habil, ['2026-12-25']), '2026-12-28');
});

test('con el siguiente día hábil, pasada la hora de corte de un día hábil se suma otro día hábil', () => {
  const habil = { firstDeliveryDay: 'next-business-day', deliveryCutoffTime: '14:00' };
  assert.equal(primera('2026-11-27T13:59:59', habil), '2026-11-30', 'viernes antes del corte → lunes');
  assert.equal(primera('2026-11-27T14:00:00', habil), '2026-12-01', 'viernes después del corte → martes');
  assert.equal(
    primera('2026-11-27T14:00:00', habil, ['2026-11-30']),
    '2026-12-02',
    'y salta el lunes feriado',
  );
});

test('la hora de corte solo cuenta en un día hábil: un sábado, un domingo o un feriado no se atiende', () => {
  const habil = { firstDeliveryDay: 'next-business-day', deliveryCutoffTime: '14:00' };
  assert.equal(primera('2026-11-28T15:00:00', habil), '2026-11-30', 'sábado después del corte → lunes');
  assert.equal(
    primera('2026-12-08T15:00:00', habil, ['2026-12-08']),
    '2026-12-09',
    'feriado después del corte',
  );
});

test('una regla o una hora desconocidas se leen como las de por defecto', () => {
  assert.equal(
    primera('2026-11-23T15:00:00', { firstDeliveryDay: 'otra', deliveryCutoffTime: '25:00' }),
    '2026-11-24',
  );
});

test('reglas y horas de corte válidas', () => {
  for (const regla of ['same-day', 'next-calendar-day', 'next-business-day'])
    assert.equal(esReglaDePrimeraEntrega(regla), true);
  for (const regla of ['', 'tomorrow', null]) assert.equal(esReglaDePrimeraEntrega(regla), false);
  for (const hora of ['', '00:00', '09:30', '23:59']) assert.equal(esHoraDeCorte(hora), true, hora);
  for (const hora of ['24:00', '9:30', '12:60', '12:00:00', null, 1400])
    assert.equal(esHoraDeCorte(hora), false, String(hora));
});
