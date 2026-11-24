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
    store: { state: { revision: 0, complaints, nonWorkingDates: [] }, save() {} },
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

// Lote 02 (PBI-0102): el registro completo y el plazo de respuesta con los feriados configurados.

const creacion = () => {
  const store = {
    // Lote 17 (PBI-0183): los días no laborables vienen del estado, no del arranque.
    state: { revision: 4, complaints: [], nonWorkingDates: [{ id: 'f', date: '2027-06-02', name: '' }] },
    guardados: 0,
    save() {
      this.guardados += 1;
    },
  };
  const reclamos = createReclamosUseCases({
    store,
    now: () => new Date('2027-06-01T15:00:00Z'),
  });
  return { store, reclamos };
};

test('el reclamo nace recibido, sin respuesta, con sus datos recortados y el correo normalizado', () => {
  const { reclamos } = creacion();
  const reclamo = reclamos.register(
    formulario({ name: '  Ana  ', email: ' ANA@Example.com ', detail: ' Detalle ', amount: '80.5' }),
  );
  assert.deepEqual(
    [reclamo.name, reclamo.email, reclamo.detail, reclamo.amount, reclamo.status, reclamo.providerResponse],
    ['Ana', 'ana@example.com', 'Detalle', 80.5, 'received', ''],
  );
  assert.equal(reclamo.createdAt, '2027-06-01T15:00:00.000Z');
  assert.equal(reclamo.updatedAt, reclamo.createdAt);
});

test('el plazo son 15 días hábiles contados desde la fecha de Lima, sin los feriados configurados', () => {
  const { reclamos } = creacion();
  // Martes 1 de junio de 2027; el 2 de junio es feriado: 15 días hábiles → miércoles 23 de junio.
  assert.equal(reclamos.register(formulario()).dueAt, '2027-06-24T04:59:59.999Z');
});

test('registrar guarda una vez, sube la revisión, pone el reclamo primero y deja su actividad', () => {
  const { store, reclamos } = creacion();
  const primero = reclamos.register(formulario());
  const segundo = reclamos.register(formulario({ name: 'Luis' }));
  assert.equal(store.guardados, 2);
  assert.equal(store.state.revision, 6);
  assert.deepEqual(
    store.state.complaints.map((item) => item.id),
    [segundo.id, primero.id],
  );
  assert.deepEqual([primero.id, segundo.id], ['REC-2027-00001', 'REC-2027-00002']);
  assert.equal(store.state.activity.length, 2);
  assert.match(store.state.activity[0].description, /REC-2027-00002/);
});

test('un reclamo con datos de más no los guarda, y uno incompleto, con tipo o correo inválido no crea nada', () => {
  const { store, reclamos } = creacion();
  assert.equal('isAdmin' in reclamos.register(formulario({ isAdmin: true, status: 'resolved' })), false);
  assert.equal(store.state.complaints[0].status, 'received');
  const antes = store.state.complaints.length;
  assert.throws(() => reclamos.register(formulario({ detail: ' ' })), {
    code: 'VALIDATION_ERROR',
    details: { fields: ['detail'] },
  });
  assert.throws(() => reclamos.register(formulario({ type: 'sugerencia' })), {
    code: 'INVALID_COMPLAINT_TYPE',
  });
  assert.throws(() => reclamos.register(formulario({ email: 'ana' })), { code: 'INVALID_EMAIL' });
  assert.equal(store.state.complaints.length, antes);
  assert.equal(store.guardados, 1);
});

test('tanto un reclamo como una queja se aceptan', () => {
  const { reclamos } = creacion();
  for (const type of ['reclamo', 'queja']) assert.equal(reclamos.register(formulario({ type })).type, type);
});
