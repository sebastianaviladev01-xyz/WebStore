/**
 * Guardado y lectura del snapshot del Admin en el lote 17 (ADR-0021; confirmado por Sebastián Avila), con un
 * almacén en memoria y el reloj fijo:
 *
 * - PBI-0177: guardar un texto nuevo de los términos publica la versión siguiente; el Admin ve la vigente en la
 *   configuración y la aceptada en cada pedido. El número no lo puede escribir el Admin.
 * - PBI-0178: la configuración guarda la primera fecha de entrega y la hora de corte, validadas.
 * - PBI-0183: los días no laborables son una colección que solo ve y cambia el superadministrador.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminSnapshot } from '../../../../src/application/admin/admin.views.mjs';
import { createSnapshotUseCases } from '../../../../src/application/admin/snapshot.use-cases.mjs';
import { createContenidoQueries } from '../../../../src/application/contenido/contenido.queries.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

const security = { hashPassword: (password) => ({ salt: 's', hash: `h:${password}` }) };
const AHORA = new Date('2026-11-23T15:04:09.000Z');

function crearAlmacen() {
  const state = {
    ...structuredClone(seed),
    revision: 5,
    adminCredentials: seed.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
    adminSessions: [],
    complaints: [],
    orders: [],
    nonWorkingDates: [{ id: 'nwd-1', date: '2026-12-25', name: 'Navidad' }],
    termsVersions: [{ version: 1, publishedAt: null, content: seed.config.termsContent }],
  };
  return { state, save() {} };
}

const superadmin = { id: 'u-1', role: 'superadmin' };
const admin = { id: 'u-3', role: 'admin' };

function guardar(usuario, cambios, store = crearAlmacen()) {
  const casos = createSnapshotUseCases({ store, security, now: () => AHORA });
  return casos.save(usuario, { revision: store.state.revision, ...cambios });
}

test('la semilla trae la primera fecha de entrega por defecto: el día calendario siguiente, sin hora de corte', () => {
  assert.equal(seed.config.firstDeliveryDay, 'next-calendar-day');
  assert.equal(seed.config.deliveryCutoffTime, '');
});

test('la configuración guarda la primera fecha de entrega y la hora de corte', () => {
  const store = crearAlmacen();
  const vista = guardar(
    superadmin,
    { config: { firstDeliveryDay: 'next-business-day', deliveryCutoffTime: '14:30' } },
    store,
  );
  assert.equal(vista.config.firstDeliveryDay, 'next-business-day');
  assert.equal(vista.config.deliveryCutoffTime, '14:30');
  assert.equal(store.state.config.firstDeliveryDay, 'next-business-day');
});

test('una regla o una hora de corte desconocidas responden INVALID_COLLECTION en su campo', () => {
  for (const [field, valor] of [
    ['firstDeliveryDay', 'tomorrow'],
    ['deliveryCutoffTime', '24:00'],
    ['deliveryCutoffTime', '2 pm'],
  ])
    assert.throws(
      () => guardar(superadmin, { config: { [field]: valor } }),
      (error) =>
        error.code === 'INVALID_COLLECTION' &&
        error.details.collection === 'config' &&
        error.details.field === field,
      `${field}=${valor}`,
    );
});

test('cambiar el texto de los términos publica la versión siguiente con la fecha y hora del guardado', () => {
  const store = crearAlmacen();
  const vista = guardar(superadmin, { config: { termsContent: 'Términos nuevos.' } }, store);
  assert.deepEqual(store.state.termsVersions.at(-1), {
    version: 2,
    publishedAt: '2026-11-23T15:04:09.000Z',
    content: 'Términos nuevos.',
  });
  assert.equal(vista.config.termsVersion, 2);
  assert.equal(vista.config.termsPublishedAt, '2026-11-23T15:04:09.000Z');
});

test('guardar otra parte de Contenido, o el mismo texto, no cambia la versión de los términos', () => {
  const store = crearAlmacen();
  guardar(superadmin, { config: { footerText: 'Otro pie', termsContent: seed.config.termsContent } }, store);
  assert.equal(store.state.termsVersions.length, 1);
  assert.equal(buildAdminSnapshot(store.state, 'superadmin').config.termsVersion, 1);
  assert.equal(buildAdminSnapshot(store.state, 'superadmin').config.termsPublishedAt, null);
});

test('el número de la versión no lo escribe el Admin: si lo envía, se descarta', () => {
  const store = crearAlmacen();
  guardar(superadmin, { config: { termsVersion: 9, termsPublishedAt: 'x' } }, store);
  assert.equal(store.state.termsVersions.length, 1);
  assert.equal('termsVersion' in store.state.config, false);
  assert.equal('termsPublishedAt' in store.state.config, false);
});

test('la tienda recibe la versión vigente de los términos con los ajustes públicos', () => {
  const store = crearAlmacen();
  guardar(superadmin, { config: { termsContent: 'Términos nuevos.' } }, store);
  const ajustes = createContenidoQueries({ store }).getSettings();
  assert.equal(ajustes.termsVersion, 2);
  assert.equal(ajustes.termsContent, 'Términos nuevos.');
  assert.equal('termsVersions' in ajustes, false);
});

test('el pedido del Admin trae la versión aceptada, o null si es anterior al registro de versiones', () => {
  const store = crearAlmacen();
  const base = {
    id: 'WS-1',
    createdAt: '2026-11-23T15:00:00.000Z',
    status: 'confirmed',
    customer: { fullName: 'Ana' },
    total: 1,
  };
  store.state.orders = [
    { ...base, termsAcceptedAt: '2026-11-23T15:00:00.000Z', termsVersion: 2 },
    { ...base, id: 'WS-2', termsAcceptedAt: '2026-11-01T00:00:00.000Z' },
  ];
  const [conVersion, sinVersion] = buildAdminSnapshot(store.state, 'superadmin').orders;
  assert.equal(conVersion.termsVersion, 2);
  assert.equal(sinVersion.termsVersion, null);
});

test('los días no laborables viajan solo al superadministrador (content.manage)', () => {
  const store = crearAlmacen();
  assert.deepEqual(
    buildAdminSnapshot(store.state, 'superadmin').nonWorkingDates,
    store.state.nonWorkingDates,
  );
  assert.deepEqual(buildAdminSnapshot(store.state, 'admin').nonWorkingDates, []);
  assert.deepEqual(buildAdminSnapshot(store.state, 'vendedor').nonWorkingDates, []);
});

test('el superadministrador agrega y quita días no laborables con cambios; se guardan ordenados', () => {
  const store = crearAlmacen();
  const vista = guardar(
    superadmin,
    {
      nonWorkingDates: {
        upsert: [{ id: 'nwd-2', date: '2026-07-28', name: ' Fiestas Patrias ' }],
        remove: ['nwd-1'],
      },
    },
    store,
  );
  assert.deepEqual(vista.nonWorkingDates, [{ id: 'nwd-2', date: '2026-07-28', name: 'Fiestas Patrias' }]);
  assert.deepEqual(store.state.nonWorkingDates, vista.nonWorkingDates);
});

test('una fecha repetida o inválida no se guarda y el estado no cambia', () => {
  const store = crearAlmacen();
  assert.throws(
    () => guardar(superadmin, { nonWorkingDates: { upsert: [{ id: 'nwd-2', date: '2026-12-25' }] } }, store),
    (error) => error.code === 'INVALID_COLLECTION' && error.details.collection === 'nonWorkingDates',
  );
  assert.throws(
    () => guardar(superadmin, { nonWorkingDates: { upsert: [{ id: 'nwd-2', date: '2026-02-30' }] } }, store),
    { code: 'INVALID_COLLECTION' },
  );
  assert.equal(store.state.nonWorkingDates.length, 1);
  assert.equal(store.state.revision, 5);
});

test('el administrador no cambia los días no laborables: 403 INSUFFICIENT_ROLE', () => {
  assert.throws(
    () => guardar(admin, { nonWorkingDates: { upsert: [{ id: 'nwd-2', date: '2026-07-28' }] } }),
    (error) => error.code === 'INSUFFICIENT_ROLE' && error.details.collection === 'nonWorkingDates',
  );
});
