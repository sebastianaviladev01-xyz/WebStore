/**
 * Normalización del estado en el lote 49 (ADR-0035, PBI-0241; decidido por Sebastián Avila el 2026-11-27), sin disco
 * ni red y sin cambiar `schemaVersion`: un estado guardado antes no tiene `whatsappNumber` ni `whatsappMessage` y los
 * recibe vacíos (la tienda no muestra el botón hasta que alguien escribe el número); uno con valores que no sirven,
 * escritos a mano, los pierde.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeState,
  SCHEMA_VERSION,
} from '../../../../src/infrastructure/persistencia/normalizar-estado.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

const demoPasswords = { superadmin: 'Prueba#1', admin: 'Prueba#2', vendedor: 'Prueba#3' };

/** Estado guardado antes del lote 49: versión 5, sin los campos de WhatsApp. */
function estadoAnterior(config = {}) {
  const base = structuredClone(seed);
  delete base.config.whatsappNumber;
  delete base.config.whatsappMessage;
  return {
    ...base,
    schemaVersion: 5,
    adminCredentials: base.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
    config: { ...base.config, ...config },
  };
}

const normalizar = (estado) =>
  normalizeState(estado, demoPasswords, () => {}, { ahora: '2026-11-27T20:00:00.000Z' });

test('sin los campos de WhatsApp, nacen vacíos y schemaVersion no cambia', () => {
  const estado = normalizar(estadoAnterior());
  assert.equal(estado.config.whatsappNumber, '');
  assert.equal(estado.config.whatsappMessage, '');
  assert.equal(estado.schemaVersion, SCHEMA_VERSION);
  assert.equal(SCHEMA_VERSION, 5);
});

test('un número guardado se conserva con sus dígitos; uno que no sirve queda vacío', () => {
  assert.equal(
    normalizar(estadoAnterior({ whatsappNumber: '51 987 654 321' })).config.whatsappNumber,
    '51987654321',
  );
  assert.equal(normalizar(estadoAnterior({ whatsappNumber: '987654321' })).config.whatsappNumber, '');
  assert.equal(normalizar(estadoAnterior({ whatsappNumber: { n: 1 } })).config.whatsappNumber, '');
});

test('un mensaje que no es texto queda vacío y uno largo se corta a 200 caracteres', () => {
  assert.equal(normalizar(estadoAnterior({ whatsappMessage: 12 })).config.whatsappMessage, '');
  assert.equal(
    normalizar(estadoAnterior({ whatsappMessage: 'z'.repeat(300) })).config.whatsappMessage.length,
    200,
  );
});
