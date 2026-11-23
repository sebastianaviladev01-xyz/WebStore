/**
 * Permisos de los roles en el guardado y la lectura del snapshot del Admin (lote 07, ADR-0017, PBI-0013; decisión
 * provisional por confirmar con Daniel), con un almacén en memoria. El BFF es la autoridad: el Admin solo oculta.
 * - El vendedor crea productos y modifica todos sus campos, sobre cualquier producto; no los elimina. Desde el lote 11
 *   (ADR-0021, PBI-0170; provisional) gestiona el inventario y ve los pedidos sin cambiar su estado.
 * - Contenido es solo del superadministrador; banners y tarifas siguen con el administrador.
 * - El administrador ve y gestiona solo a los vendedores (crear, editar, activar y desactivar), sin eliminarlos ni
 *   asignar otro rol. El superadministrador gestiona a todos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSnapshotUseCases } from '../../../../src/application/admin/snapshot.use-cases.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

const security = { hashPassword: (password) => ({ salt: 's', hash: `h:${password}` }) };

function crearAlmacen() {
  const state = {
    ...structuredClone(seed),
    revision: 5,
    adminCredentials: seed.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
    adminSessions: seed.users.map((user) => ({ userId: user.id, tokenHash: `t-${user.id}` })),
    complaints: [],
    orders: [
      {
        id: 'WS-1',
        status: 'confirmed',
        createdAt: '2026-11-01T00:00:00.000Z',
        customer: { fullName: 'Ana', email: 'a@example.com', phone: '9' },
        items: [],
        total: 10,
      },
    ],
  };
  return {
    state,
    guardados: 0,
    save() {
      this.guardados += 1;
    },
  };
}

const superadmin = { id: 'u-1', role: 'superadmin' };
const admin = { id: 'u-3', role: 'admin' };
const vendedor = { id: 'u-2', role: 'vendedor' };

function casosCon(store = crearAlmacen()) {
  return { store, casos: createSnapshotUseCases({ store, security }) };
}

function guardar(usuario, cambios, store = crearAlmacen()) {
  const { casos } = casosCon(store);
  return { store, resultado: () => casos.save(usuario, { revision: store.state.revision, ...cambios }) };
}

const rechazo =
  (code, extra = {}) =>
  (error) => {
    assert.equal(error.code, code, error.message);
    for (const [clave, valor] of Object.entries(extra))
      assert.deepEqual(error.details?.[clave], valor, clave);
    return true;
  };

const producto = (id) => structuredClone(seed.products.find((item) => item.id === id));

test('PBI-0013: el vendedor crea un producto completo', () => {
  const nuevo = { ...producto('p-003'), id: 'p-vendedor', name: 'Producto del vendedor', sku: 'VEND-1' };
  const snapshot = guardar(vendedor, { products: { upsert: [nuevo] } }).resultado();
  assert.deepEqual(
    snapshot.products.find((item) => item.id === 'p-vendedor'),
    nuevo,
  );
});

test('PBI-0013: el vendedor modifica precio, categoría, marca, SKU y estado de cualquier producto', () => {
  const otro = seed.products.find((item) => item.categoryId !== producto('p-003').categoryId);
  const cambio = {
    id: 'p-003',
    price: 123,
    sku: 'NUEVO-SKU',
    categoryId: otro.categoryId,
    brandId: otro.brandId,
    active: false,
  };
  const snapshot = guardar(vendedor, { products: { upsert: [cambio] } }).resultado();
  const guardado = snapshot.products.find((item) => item.id === 'p-003');
  for (const [campo, valor] of Object.entries(cambio)) assert.equal(guardado[campo], valor, campo);
});

test('PBI-0013: el vendedor no elimina productos, ni con remove ni con una lista sin uno', () => {
  for (const products of [{ remove: ['p-003'] }, seed.products.filter((item) => item.id !== 'p-003')]) {
    const { store, resultado } = guardar(vendedor, { products });
    assert.throws(resultado, rechazo('CATALOG_SCOPE_VIOLATION'));
    assert.equal(store.guardados, 0);
    assert.ok(store.state.products.some((item) => item.id === 'p-003'));
  }
});

test('PBI-0013: el administrador sí elimina productos', () => {
  const snapshot = guardar(admin, { products: { remove: ['p-003'] } }).resultado();
  assert.ok(!snapshot.products.some((item) => item.id === 'p-003'));
});

test('PBI-0170: el vendedor ve los pedidos, pero no los cambia; tampoco ve clientes ni usuarios', () => {
  const { casos } = casosCon();
  const snapshot = casos.get(vendedor);
  assert.deepEqual(
    snapshot.orders.map((pedido) => [pedido.id, pedido.status]),
    [['WS-1', 'confirmed']],
  );
  assert.equal(snapshot.orders[0].customerEmail, 'a@example.com');
  assert.deepEqual(snapshot.customers, []);
  assert.deepEqual(snapshot.users, []);
  assert.throws(
    guardar(vendedor, { orders: { upsert: [{ id: 'WS-1', status: 'processing' }] } }).resultado,
    rechazo('INSUFFICIENT_ROLE', { collection: 'orders' }),
  );
});

test('PBI-0170: la actividad reciente sigue siendo del Resumen completo (`orders.manage`)', () => {
  const store = crearAlmacen();
  store.state.activity = [{ id: 'e-1', at: '2026-11-01T00:00:00.000Z', type: 'order-created', description: 'x' }];
  const { casos } = casosCon(store);
  assert.deepEqual(casos.get(vendedor).activity, []);
  assert.equal(casos.get(vendedor).onlineVisitors, null);
  assert.equal(casos.get(admin).activity.length, 1);
});

test('PBI-0170: el vendedor gestiona el inventario: cambia el stock de un producto', () => {
  const snapshot = guardar(vendedor, { products: { upsert: [{ id: 'p-003', stock: 42 }] } }).resultado();
  assert.equal(snapshot.products.find((item) => item.id === 'p-003').stock, 42);
});

test('PBI-0013: Contenido es solo del superadministrador; banners y tarifas siguen con el administrador', () => {
  const { store, resultado } = guardar(admin, { config: { storeName: 'Otra tienda' } });
  assert.throws(resultado, rechazo('INSUFFICIENT_ROLE', { collection: 'config' }));
  assert.equal(store.state.config.storeName, seed.config.storeName);
  assert.equal(
    guardar(superadmin, { config: { storeName: 'Otra tienda' } }).resultado().config.storeName,
    'Otra tienda',
  );
  const banner = { id: seed.banners[0].id, title: 'Título del administrador' };
  const tarifa = { id: seed.rates[0].id, price: 77 };
  const snapshot = guardar(admin, {
    banners: { upsert: [banner] },
    rates: { upsert: [tarifa] },
  }).resultado();
  assert.equal(snapshot.banners[0].title, 'Título del administrador');
  assert.equal(snapshot.rates.find((rate) => rate.id === tarifa.id).price, 77);
});

test('PBI-0013: el administrador solo ve a los vendedores; el superadministrador, a todos', () => {
  const { casos } = casosCon();
  assert.deepEqual(
    casos.get(admin).users.map((user) => user.role),
    ['vendedor'],
  );
  assert.deepEqual(
    casos
      .get(superadmin)
      .users.map((user) => user.id)
      .sort(),
    ['u-1', 'u-2', 'u-3'],
  );
});

const vendedorNuevo = {
  id: 'u-nuevo',
  name: 'Vendedora Nueva',
  email: 'nueva@webstore.demo',
  role: 'vendedor',
  active: true,
  temporaryPassword: 'Temporal1234',
};

test('PBI-0013: el administrador crea, edita, desactiva y reactiva vendedores', () => {
  const store = crearAlmacen();
  const { casos } = casosCon(store);
  const paso = (cambios) => casos.save(admin, { revision: store.state.revision, users: cambios });

  paso({ upsert: [vendedorNuevo] });
  assert.ok(store.state.adminCredentials.some((credencial) => credencial.userId === 'u-nuevo'));
  paso({ upsert: [{ id: 'u-2', name: 'Vendedor Renombrado', active: false }] });
  const vendedorDemo = store.state.users.find((user) => user.id === 'u-2');
  assert.equal(vendedorDemo.name, 'Vendedor Renombrado');
  assert.equal(vendedorDemo.active, false);
  assert.ok(
    !store.state.adminSessions.some((sesion) => sesion.userId === 'u-2'),
    'un vendedor desactivado pierde sus sesiones',
  );
  paso({ upsert: [{ id: 'u-2', active: true }] });
  assert.equal(store.state.users.find((user) => user.id === 'u-2').active, true);
});

test('PBI-0013: el administrador no toca a superadministradores ni administradores, ni asigna otro rol', () => {
  for (const [nombre, users] of [
    ['crear un administrador', { upsert: [{ ...vendedorNuevo, role: 'admin' }] }],
    ['ascender a un vendedor', { upsert: [{ id: 'u-2', role: 'admin' }] }],
    ['editar al superadministrador', { upsert: [{ id: 'u-1', name: 'Otro nombre' }] }],
    ['desactivar a un administrador', { upsert: [{ id: 'u-3', active: false }] }],
    ['enviar la lista completa', [{ ...seed.users.find((user) => user.id === 'u-2') }]],
  ]) {
    const { store, resultado } = guardar(admin, { users });
    assert.throws(resultado, rechazo('USER_SCOPE_VIOLATION'), nombre);
    assert.equal(store.guardados, 0, nombre);
    assert.deepEqual(store.state.users, seed.users, nombre);
  }
});

test('PBI-0013: el administrador no elimina usuarios; el superadministrador sí', () => {
  const { store, resultado } = guardar(admin, { users: { remove: ['u-2'] } });
  assert.throws(resultado, rechazo('USER_SCOPE_VIOLATION'));
  assert.equal(store.state.users.length, seed.users.length);
  const snapshot = guardar(superadmin, { users: { remove: ['u-2'] } }).resultado();
  assert.ok(!snapshot.users.some((user) => user.id === 'u-2'));
});

test('PBI-0013: el superadministrador sigue gestionando a cualquier rol, con el último superadministrador', () => {
  const snapshot = guardar(superadmin, {
    users: {
      upsert: [
        { ...vendedorNuevo, role: 'admin' },
        { id: 'u-3', role: 'vendedor' },
      ],
    },
  }).resultado();
  assert.equal(snapshot.users.find((user) => user.id === 'u-nuevo').role, 'admin');
  assert.equal(snapshot.users.find((user) => user.id === 'u-3').role, 'vendedor');
  assert.throws(
    guardar(superadmin, { users: { upsert: [{ id: 'u-1', active: false }] } }).resultado,
    rechazo('LAST_SUPERADMIN'),
  );
});

test('PBI-0013: el vendedor no gestiona usuarios', () => {
  assert.throws(
    guardar(vendedor, { users: { upsert: [vendedorNuevo] } }).resultado,
    rechazo('INSUFFICIENT_ROLE', { collection: 'users' }),
  );
});
