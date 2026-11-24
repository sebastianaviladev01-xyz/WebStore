/**
 * Normalización del estado en el lote 17 (ADR-0021; provisional, por confirmar con Daniel), sin disco ni red y sin
 * cambiar `schemaVersion`:
 *
 * - PBI-0183: sin `nonWorkingDates`, el estado toma las fechas de `WEBSTORE_NON_WORKING_DATES` como valor inicial; con
 *   una lista, aunque esté vacía, la conserva y la variable ya no cuenta.
 * - PBI-0177: sin `termsVersions`, los términos vigentes son la versión 1, sin fecha.
 * - PBI-0178: sin la primera fecha de entrega o con un valor desconocido, la de por defecto.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeState,
  SCHEMA_VERSION,
} from '../../../../src/infrastructure/persistencia/normalizar-estado.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

const demoPasswords = { superadmin: 'Prueba#1', admin: 'Prueba#2', vendedor: 'Prueba#3' };
const opciones = {
  fechasNoLaborablesIniciales: new Set(['2026-12-25', '2026-07-28']),
  ahora: '2026-11-23T20:00:00.000Z',
};

/** Estado guardado antes del lote 17: versión 4, sin calendario ni versiones de los términos. */
function estadoAnterior(config = {}) {
  const base = structuredClone(seed);
  delete base.nonWorkingDates;
  delete base.termsVersions;
  delete base.config.firstDeliveryDay;
  delete base.config.deliveryCutoffTime;
  return {
    ...base,
    schemaVersion: 4,
    adminCredentials: base.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
    config: { ...base.config, ...config },
  };
}

const normalizar = (estado, extra = {}) =>
  normalizeState(estado, demoPasswords, () => {}, { ...opciones, ...extra });

test('no cambia schemaVersion: las listas nuevas se completan sin migración', () => {
  // El lote no sube la versión: la 5 es la del lote 22 (productos destacados configurables).
  assert.equal(SCHEMA_VERSION, 5);
  assert.equal(normalizar(estadoAnterior()).schemaVersion, SCHEMA_VERSION);
});

test('sin días no laborables guardados, los iniciales salen de WEBSTORE_NON_WORKING_DATES', () => {
  assert.deepEqual(normalizar(estadoAnterior()).nonWorkingDates, [
    { id: '2026-07-28', date: '2026-07-28', name: '' },
    { id: '2026-12-25', date: '2026-12-25', name: '' },
  ]);
  assert.deepEqual(
    normalizar(estadoAnterior(), { fechasNoLaborablesIniciales: new Set() }).nonWorkingDates,
    [],
  );
});

test('con una lista guardada, aunque esté vacía, la variable ya no cuenta', () => {
  const guardada = [{ id: 'x', date: '2027-01-01', name: 'Año Nuevo' }];
  assert.deepEqual(normalizar({ ...estadoAnterior(), nonWorkingDates: guardada }).nonWorkingDates, guardada);
  assert.deepEqual(normalizar({ ...estadoAnterior(), nonWorkingDates: [] }).nonWorkingDates, []);
});

test('sin versiones de los términos, el texto vigente es la versión 1, sin fecha registrada', () => {
  const estado = normalizar(estadoAnterior({ termsContent: 'Mis términos' }));
  assert.deepEqual(estado.termsVersions, [{ version: 1, publishedAt: null, content: 'Mis términos' }]);
});

test('si el texto vigente cambió fuera del registro, se publica como versión nueva con la fecha de la carga', () => {
  const estado = normalizar({
    ...estadoAnterior({ termsContent: 'Cambiado' }),
    termsVersions: [{ version: 1, publishedAt: null, content: 'Original' }],
  });
  assert.deepEqual(estado.termsVersions.at(-1), {
    version: 2,
    publishedAt: '2026-11-23T20:00:00.000Z',
    content: 'Cambiado',
  });
});

test('sin la primera fecha de entrega, o con un valor desconocido, la de por defecto', () => {
  const sinCampos = normalizar(estadoAnterior()).config;
  assert.equal(sinCampos.firstDeliveryDay, 'next-calendar-day');
  assert.equal(sinCampos.deliveryCutoffTime, '');
  const desconocidos = normalizar(
    estadoAnterior({ firstDeliveryDay: 'otro', deliveryCutoffTime: '25:99' }),
  ).config;
  assert.equal(desconocidos.firstDeliveryDay, 'next-calendar-day');
  assert.equal(desconocidos.deliveryCutoffTime, '');
  const validos = normalizar(
    estadoAnterior({ firstDeliveryDay: 'same-day', deliveryCutoffTime: '13:00' }),
  ).config;
  assert.equal(validos.firstDeliveryDay, 'same-day');
  assert.equal(validos.deliveryCutoffTime, '13:00');
});

test('sin opciones (por ejemplo, el reinicio de la demo), el estado carga sin días no laborables', () => {
  const estado = normalizeState(estadoAnterior(), demoPasswords);
  assert.deepEqual(estado.nonWorkingDates, []);
  assert.equal(estado.termsVersions.length, 1);
});
