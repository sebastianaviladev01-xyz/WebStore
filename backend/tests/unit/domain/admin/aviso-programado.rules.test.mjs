/**
 * Avisos programados de la barra superior (lote 30, ADR-0027, PBI-0244; provisional, por confirmar con Daniel): cada
 * aviso lleva un «Desde» (`startAt`) y un «Hasta» (`endAt`) opcionales. La regla recibe el instante: no lee el reloj del
 * sistema (la lección de PBI-0245). Los extremos cuentan, como en los banners (PBI-0221). Un aviso sin fechas está
 * siempre vigente, como antes del lote.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { avisosVigentes, estadoDelAviso } from '../../../../src/domain/admin/aviso-programado.rules.mjs';

const desde = '2026-11-27T00:00:00.000-05:00';
const hasta = '2026-11-27T23:59:59.999-05:00';
const antes = Date.parse('2026-11-26T23:59:59.999-05:00');
const durante = Date.parse('2026-11-27T12:00:00.000-05:00');
const despues = Date.parse('2026-11-28T00:00:00.000-05:00');

test('PBI-0244: sin fechas, el aviso está vigente en cualquier instante', () => {
  for (const instante of [0, antes, durante, despues])
    assert.equal(estadoDelAviso({ text: 'Siempre', url: '' }, instante), 'vigente');
});

test('PBI-0244: con «Desde» y «Hasta», es programado antes, vigente durante y vencido después', () => {
  const aviso = { text: 'Black Friday', url: '', startAt: desde, endAt: hasta };
  assert.equal(estadoDelAviso(aviso, antes), 'programado');
  assert.equal(estadoDelAviso(aviso, durante), 'vigente');
  assert.equal(estadoDelAviso(aviso, despues), 'vencido');
});

test('PBI-0244: los extremos cuentan como vigentes', () => {
  const aviso = { text: 'Hoy', url: '', startAt: desde, endAt: hasta };
  assert.equal(estadoDelAviso(aviso, Date.parse(desde)), 'vigente');
  assert.equal(estadoDelAviso(aviso, Date.parse(hasta)), 'vigente');
});

test('PBI-0244: solo «Desde» queda vigente sin final; solo «Hasta», vigente desde ya', () => {
  assert.equal(estadoDelAviso({ text: 'Novedades', url: '', startAt: desde }, antes), 'programado');
  assert.equal(estadoDelAviso({ text: 'Novedades', url: '', startAt: desde }, despues), 'vigente');
  assert.equal(estadoDelAviso({ text: 'Cierre', url: '', endAt: hasta }, antes), 'vigente');
  assert.equal(estadoDelAviso({ text: 'Cierre', url: '', endAt: hasta }, despues), 'vencido');
});

test('PBI-0244: el instante puede llegar como Date, como número o como texto ISO', () => {
  const aviso = { text: 'Hoy', url: '', startAt: desde, endAt: hasta };
  assert.equal(estadoDelAviso(aviso, new Date(durante)), 'vigente');
  assert.equal(estadoDelAviso(aviso, new Date(durante).toISOString()), 'vigente');
});

test('PBI-0244: sin instante válido, la regla no lee el reloj del sistema y lo rechaza', () => {
  assert.throws(() => estadoDelAviso({ text: 'x', url: '' }), /instante/);
  assert.throws(() => avisosVigentes([], 'no es una fecha'), /instante/);
});

test('PBI-0244: una fecha guardada que no se puede leer no oculta el aviso', () => {
  // Datos viejos o editados a mano: mejor mostrar el aviso que perderlo sin aviso.
  assert.equal(estadoDelAviso({ text: 'x', url: '', startAt: 'mañana', endAt: '' }, antes), 'vigente');
});

test('PBI-0244: los vigentes conservan su orden y quitan los programados y los vencidos', () => {
  const avisos = [
    { text: 'Fijo', url: '' },
    { text: 'Futuro', url: '', startAt: '2026-12-01T00:00:00.000-05:00' },
    { text: 'Hoy', url: '/catalogo', startAt: desde, endAt: hasta },
    { text: 'Pasado', url: '', endAt: '2026-11-01T23:59:59.999-05:00' },
  ];
  assert.deepEqual(
    avisosVigentes(avisos, durante).map((aviso) => aviso.text),
    ['Fijo', 'Hoy'],
  );
  assert.deepEqual(avisosVigentes(undefined, durante), []);
});
