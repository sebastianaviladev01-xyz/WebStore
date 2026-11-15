/**
 * Actividad reciente del Resumen (lote 07b, ADR-0017, PBI-0028; provisional, por confirmar con Daniel): un evento al
 * crear un pedido, al cambiar su estado, al registrar una cuenta y al registrar un reclamo, con fecha, tipo y una
 * descripción sin más datos personales que el nombre que el Admin ya muestra. Se guardan los últimos 50.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_EVENTOS_DE_ACTIVIDAD,
  conEvento,
  eventoCuentaRegistrada,
  eventoEstadoDePedido,
  eventoPedidoCreado,
  eventoReclamoRegistrado,
  normalizarActividad,
} from '../../../../src/domain/admin/actividad.rules.mjs';

const marca = { id: 'e-1', at: '2026-11-15T10:00:00.000Z' };

test('PBI-0028: el pedido nuevo dice su código, el nombre del comprador y el total, sin correo ni dirección', () => {
  const evento = eventoPedidoCreado(marca, {
    id: 'WS-1',
    total: 3311,
    customer: { fullName: 'Ana Pérez', email: 'ana@example.com', phone: '999', document: '123' },
    shipping: { addressLine: 'Av. Siempre Viva 742', district: 'Miraflores' },
  });
  assert.deepEqual(evento, {
    id: 'e-1',
    at: '2026-11-15T10:00:00.000Z',
    type: 'order-created',
    description: 'Nuevo pedido WS-1 de Ana Pérez por S/ 3311.00.',
  });
  for (const dato of ['ana@example.com', '999', '123', 'Siempre Viva'])
    assert.ok(!evento.description.includes(dato), `sin ${dato}`);
});

test('PBI-0028: el cambio de estado dice quién lo hizo (el equipo o el cliente) sin nombrar a nadie', () => {
  assert.equal(
    eventoEstadoDePedido(marca, { id: 'WS-1' }, 'shipped', 'equipo').description,
    'El equipo pasó el pedido WS-1 a «Enviado».',
  );
  assert.equal(
    eventoEstadoDePedido(marca, { id: 'WS-2' }, 'cancelled', 'cliente').description,
    'El cliente canceló el pedido WS-2.',
  );
  assert.equal(
    eventoEstadoDePedido(marca, { id: 'WS-1' }, 'delivered', 'equipo').type,
    'order-status-changed',
  );
});

test('PBI-0028: la cuenta registrada no dice el nombre ni el correo (el Admin no muestra las cuentas)', () => {
  const evento = eventoCuentaRegistrada(marca, { fullName: 'Ana Pérez', email: 'ana@example.com' });
  assert.equal(evento.type, 'account-registered');
  assert.equal(evento.description, 'Se registró una cuenta nueva en la tienda.');
});

test('PBI-0028: el reclamo dice su tipo, su código y el nombre de quien reclama', () => {
  assert.equal(
    eventoReclamoRegistrado(marca, { id: 'REC-2026-00001', type: 'queja', name: 'Luis Soto' }).description,
    'Nueva queja REC-2026-00001 de Luis Soto.',
  );
  assert.equal(
    eventoReclamoRegistrado(marca, { id: 'REC-2026-00002', type: 'reclamo', name: 'Luis Soto' }).type,
    'complaint-registered',
  );
});

test('PBI-0028: el evento nuevo va primero y solo se guardan los últimos 50', () => {
  assert.equal(MAX_EVENTOS_DE_ACTIVIDAD, 50);
  let actividad = [];
  for (let n = 1; n <= 55; n++) actividad = conEvento(actividad, { id: `e-${n}` });
  assert.equal(actividad.length, 50);
  assert.equal(actividad[0].id, 'e-55');
  assert.equal(actividad.at(-1).id, 'e-6');
});

test('PBI-0028: al cargar, la actividad que no es una lista queda vacía y una lista larga se recorta a 50', () => {
  assert.deepEqual(normalizarActividad(undefined), []);
  assert.deepEqual(normalizarActividad({}), []);
  const larga = Array.from({ length: 60 }, (_, n) => ({
    id: `e-${n}`,
    at: 'x',
    type: 't',
    description: 'd',
  }));
  assert.equal(normalizarActividad(larga).length, 50);
  assert.equal(normalizarActividad([null, 3, { id: 'e-1', at: 'x', type: 't', description: 'd' }]).length, 1);
});
