/**
 * Personas en línea (lote 07b, ADR-0017, PBI-0027; provisional, por confirmar con Daniel): la tienda envía un latido
 * con un identificador aleatorio de pestaña; el BFF lo conserva solo en memoria y cuenta los de los últimos 5
 * minutos. No guarda IP, agente de usuario ni otro dato del visitante.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_VISITAS_EN_MEMORIA,
  VENTANA_EN_LINEA_MS,
  exigirIdDeVisita,
  personasEnLinea,
  registrarLatido,
} from '../../../../src/domain/visitas/visitas.rules.mjs';

const ID = 'a1b2c3d4e5f6a7b8c9d0';

test('PBI-0027: el identificador de la visita es un texto aleatorio de 16 a 128 caracteres seguros', () => {
  assert.equal(exigirIdDeVisita(ID), ID);
  for (const malo of [undefined, 12, 'corto', 'x'.repeat(129), 'con espacios 1234567', '<script>12345678']) {
    assert.throws(
      () => exigirIdDeVisita(malo),
      (error) => error.code === 'INVALID_VISIT_ID' && error.kind === 'validation',
    );
  }
});

test('PBI-0027: cada pestaña cuenta una vez y deja de contar a los 5 minutos de su último latido', () => {
  assert.equal(VENTANA_EN_LINEA_MS, 5 * 60 * 1000);
  const visitas = new Map();
  registrarLatido(visitas, ID, 0);
  registrarLatido(visitas, ID, 1000);
  registrarLatido(visitas, 'otra-pestana-123456', 2000);
  assert.equal(personasEnLinea(visitas, 3000), 2);
  assert.equal(personasEnLinea(visitas, 1000 + VENTANA_EN_LINEA_MS), 1, 'la primera vence; la otra sigue');
  assert.equal(personasEnLinea(visitas, 2001 + VENTANA_EN_LINEA_MS), 0);
  assert.equal(visitas.size, 0, 'las vencidas se olvidan');
});

test('PBI-0027: la memoria tiene un tope; lleno, una pestaña nueva no se cuenta hasta que vencen otras', () => {
  const visitas = new Map();
  for (let n = 0; n < MAX_VISITAS_EN_MEMORIA; n++)
    registrarLatido(visitas, `pestana-${String(n).padStart(12, '0')}`, 0);
  registrarLatido(visitas, 'pestana-nueva-0000000', 10);
  assert.equal(visitas.size, MAX_VISITAS_EN_MEMORIA);
  assert.equal(visitas.has('pestana-nueva-0000000'), false);
  registrarLatido(visitas, 'pestana-nueva-0000000', VENTANA_EN_LINEA_MS + 1);
  assert.equal(visitas.has('pestana-nueva-0000000'), true);
  assert.equal(personasEnLinea(visitas, VENTANA_EN_LINEA_MS + 1), 1);
});
