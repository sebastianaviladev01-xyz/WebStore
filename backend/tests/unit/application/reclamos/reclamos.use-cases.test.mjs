/**
 * Código del Libro de Reclamaciones (PBI-0097, lote 01, ADR-0017): único aunque falten reclamos anteriores, con
 * el año de Lima y no el de la zona del servidor, y un monto que no es un número se rechaza.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createReclamosUseCases } from '../../../../src/application/reclamos/reclamos.use-cases.mjs';

// El servidor en otra zona: a las 20:00 UTC del 31/12 ya es 1 de enero en Tokio y sigue siendo 31/12 en Lima.
process.env.TZ = 'Asia/Tokyo';

const formulario = (cambios = {}) => ({
  name: 'Ana Pérez',
  document: '12345678',
  email: 'ana@example.com',
  phone: '999999999',
  address: 'Av Demo 123',
  subject: 'Producto',
  amount: 100,
  type: 'reclamo',
  detail: 'Detalle del reclamo.',
  request: 'Solicito revisión.',
  ...cambios,
});

const crear = (complaints, now) =>
  createReclamosUseCases({
    store: { state: { revision: 0, complaints }, save() {} },
    nonWorkingDates: new Set(),
    now,
  });

test('el año del código es el de Lima, no el de la zona del servidor', () => {
  const reclamos = crear([], () => new Date('2027-12-31T20:00:00Z'));
  assert.match(reclamos.register(formulario()).id, /^REC-2027-\d{5}$/);
});

test('si falta un reclamo anterior, el siguiente código no repite uno ya emitido', () => {
  const existentes = [{ id: 'REC-2027-00003' }, { id: 'REC-2027-00001' }];
  const reclamos = crear(existentes, () => new Date('2027-06-01T15:00:00Z'));
  const nuevo = reclamos.register(formulario());
  assert.equal(nuevo.id, 'REC-2027-00004');
  assert.equal(new Set(existentes.map((item) => item.id)).size, 3);
});

test('el correlativo empieza de nuevo cada año', () => {
  const reclamos = crear([{ id: 'REC-2027-00009' }], () => new Date('2028-03-01T15:00:00Z'));
  assert.equal(reclamos.register(formulario()).id, 'REC-2028-00001');
});

test('un monto que no es un número, o negativo, responde INVALID_COMPLAINT_AMOUNT', () => {
  const reclamos = crear([], () => new Date('2027-06-01T15:00:00Z'));
  for (const amount of ['abc', -5, {}, [1, 2]])
    assert.throws(
      () => reclamos.register(formulario({ amount })),
      { code: 'INVALID_COMPLAINT_AMOUNT' },
      String(amount),
    );
});

test('sin monto, el reclamo se guarda con 0', () => {
  const reclamos = crear([], () => new Date('2027-06-01T15:00:00Z'));
  assert.equal(reclamos.register(formulario({ amount: undefined })).amount, 0);
  assert.equal(reclamos.register(formulario({ amount: null })).amount, 0);
  assert.equal(reclamos.register(formulario({ amount: 699.9 })).amount, 699.9);
});
