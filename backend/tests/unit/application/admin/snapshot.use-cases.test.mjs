/**
 * Guardado del snapshot del Admin (lote 01, ADR-0017), con un almacén en memoria:
 * - PBI-0089: un guardado rechazado no deja nada aplicado ni guardado.
 * - PBI-0095: cada colección se valida en forma y contenido antes de aplicar nada, y los reclamos solo cambian
 *   de estado y de respuesta: no se crean, no se borran y no cambian su monto ni su detalle.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createSnapshotUseCases } from '../../../../src/application/admin/snapshot.use-cases.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

const security = {
  hashPassword: (password) => ({ salt: 's', hash: `h:${password}` }),
  digest: (valor) => `h:${valor}`,
};

const reclamo = (id, cambios = {}) => ({
  id,
  name: 'Ana',
  document: '12345678',
  email: 'ana@example.com',
  phone: '999',
  address: 'Av 1',
  subject: 'Producto',
  amount: 100,
  type: 'reclamo',
  detail: 'Detalle original',
  request: 'Revisión',
  status: 'received',
  providerResponse: '',
  createdAt: '2026-11-01T15:00:00.000Z',
  updatedAt: '2026-11-01T15:00:00.000Z',
  dueAt: '2026-11-22T04:59:59.999Z',
  ...cambios,
});

const pedido = (id, status = 'confirmed') => ({
  id,
  status,
  createdAt: '2026-11-01T15:00:00.000Z',
  customer: { fullName: 'Ana', email: 'ana@example.com', phone: '999' },
  shipping: { district: 'San Isidro', addressLine: 'Av 1' },
  items: [{ productId: 'p-001', quantity: 1, product: { id: 'p-001', name: 'TV', price: 1 } }],
  subtotal: 1,
  total: 13,
});

function crearAlmacen() {
  const state = {
    ...structuredClone(seed),
    revision: 5,
    adminCredentials: seed.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
    adminSessions: [],
    complaints: [reclamo('REC-2026-00001'), reclamo('REC-2026-00002')],
    orders: [pedido('WS-1'), pedido('WS-2')],
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

function guardar(usuario, cambios, store = crearAlmacen()) {
  const casos = createSnapshotUseCases({ store, security });
  return { store, resultado: () => casos.save(usuario, { revision: store.state.revision, ...cambios }) };
}

test('PBI-0089: un guardado rechazado por los usuarios no deja aplicado el precio de los productos', () => {
  const { store, resultado } = guardar(superadmin, {
    products: seed.products.map((producto, i) => (i === 0 ? { ...producto, price: 1 } : producto)),
    users: [],
  });
  const antes = structuredClone(store.state);
  assert.throws(resultado, { code: 'LAST_SUPERADMIN' });
  assert.deepEqual(store.state, antes);
  assert.equal(store.guardados, 0);
});

test('PBI-0089: un guardado rechazado por el stock al reactivar un pedido no deja nada aplicado', () => {
  const store = crearAlmacen();
  store.state.orders[0].status = 'cancelled';
  store.state.products[0].stock = 0;
  const antes = structuredClone(store.state);
  const { resultado } = guardar(
    admin,
    {
      brands: [...seed.brands, { id: 'b-x', name: 'Nueva', active: true }],
      orders: [{ id: 'WS-1', status: 'confirmed' }],
    },
    store,
  );
  assert.throws(resultado, { code: 'INSUFFICIENT_STOCK' });
  assert.deepEqual(store.state, antes);
});

const invalidos = [
  ['rates no es una lista', { rates: 'x' }],
  ['config es null', { config: null }],
  ['config es una lista', { config: [] }],
  ['config con un texto que no es texto', { config: { ...seed.config, storeName: 7 } }],
  ['config sin nombre de tienda', { config: { ...seed.config, storeName: '  ' } }],
  ['config con una casilla que no es booleana', { config: { ...seed.config, termsPageEnabled: 'sí' } }],
  ['precio negativo', { products: seed.products.map((p, i) => (i ? p : { ...p, price: -1 })) }],
  ['precio no numérico', { products: seed.products.map((p, i) => (i ? p : { ...p, price: '10' })) }],
  ['stock negativo', { products: seed.products.map((p, i) => (i ? p : { ...p, stock: -1 })) }],
  ['stock no numérico', { products: seed.products.map((p, i) => (i ? p : { ...p, stock: 'abc' })) }],
  ['stock decimal', { products: seed.products.map((p, i) => (i ? p : { ...p, stock: 1.5 })) }],
  ['nombre vacío', { products: seed.products.map((p, i) => (i ? p : { ...p, name: ' ' })) }],
  [
    'SKU repetido',
    { products: seed.products.map((p, i) => (i === 1 ? { ...p, sku: seed.products[0].sku } : p)) },
  ],
  ['id de producto repetido', { products: [...seed.products, { ...seed.products[0], sku: 'OTRO' }] }],
  ['producto que no es un objeto', { products: [...seed.products, null] }],
  [
    'activo que no es booleano',
    { products: seed.products.map((p, i) => (i ? p : { ...p, active: 'true' })) },
  ],
  ['tarifa negativa', { rates: seed.rates.map((r, i) => (i ? r : { ...r, price: -2 })) }],
  ['tarifa sin destino', { rates: seed.rates.map((r, i) => (i ? r : { ...r, destination: '' })) }],
  ['marca sin nombre', { brands: [{ id: 'b-x', name: '', active: true }] }],
  ['categoría sin id', { categories: [...seed.categories, { name: 'Sin id' }] }],
  ['cliente sin nombre', { customers: [{ id: 'c-1', name: '', email: 'a@b.pe', document: '1', orders: 0 }] }],
  [
    'banner con ubicación desconocida',
    { banners: seed.banners.map((b, i) => (i ? b : { ...b, placement: 'x' })) },
  ],
  ['estado de pedido desconocido', { orders: [{ id: 'WS-1', status: 'lo-que-sea' }] }],
  ['usuario sin correo', { users: seed.users.map((u, i) => (i === 2 ? { ...u, email: 'x' } : u)) }],
  [
    'estado de reclamo desconocido',
    { complaints: [reclamo('REC-2026-00001', { status: 'x' }), reclamo('REC-2026-00002')] },
  ],
];

for (const [nombre, cambios] of invalidos)
  test(`PBI-0095: ${nombre} responde 400 sin aplicar ni guardar nada`, () => {
    const { store, resultado } = guardar(superadmin, cambios);
    const antes = structuredClone(store.state);
    assert.throws(resultado, (error) => error.kind === 'validation', nombre);
    assert.deepEqual(store.state, antes);
    assert.equal(store.guardados, 0);
  });

test('PBI-0095: los datos válidos se aplican y la revisión sube', () => {
  const { store, resultado } = guardar(admin, {
    products: seed.products.map((p, i) => (i ? p : { ...p, price: 0, stock: 0 })),
    rates: seed.rates.map((r, i) => (i ? r : { ...r, price: 0 })),
  });
  const snapshot = resultado();
  assert.equal(snapshot.revision, 6);
  assert.equal(store.state.products[0].price, 0);
  assert.equal(store.state.rates[0].price, 0);
  assert.equal(store.guardados, 1);
});

test('PBI-0095: config descarta las claves que no conoce', () => {
  // Desde el lote 07 (PBI-0013), Contenido es solo del superadministrador.
  const { store, resultado } = guardar(superadmin, {
    config: { ...seed.config, storeName: 'Nueva', primaryColor: '#123456', script: '<x>' },
  });
  resultado();
  assert.equal(store.state.config.storeName, 'Nueva');
  assert.equal('script' in store.state.config, false);
  assert.equal('primaryColor' in store.state.config, false);
});

test('PBI-0095: el Admin cambia el estado y la respuesta del reclamo, no su monto ni su detalle', () => {
  const { store, resultado } = guardar(admin, {
    complaints: [
      reclamo('REC-2026-00001', {
        status: 'resolved',
        providerResponse: 'Atendido',
        amount: 1,
        detail: 'Cambiado',
        name: 'Otra persona',
      }),
      reclamo('REC-2026-00002'),
    ],
  });
  resultado();
  const guardado = store.state.complaints.find((item) => item.id === 'REC-2026-00001');
  assert.equal(guardado.status, 'resolved');
  assert.equal(guardado.providerResponse, 'Atendido');
  assert.equal(guardado.amount, 100);
  assert.equal(guardado.detail, 'Detalle original');
  assert.equal(guardado.name, 'Ana');
});

test('PBI-0095: el Admin no borra ni agrega reclamos', () => {
  for (const complaints of [
    [reclamo('REC-2026-00001')],
    [],
    [reclamo('REC-2026-00001'), reclamo('REC-2026-00002'), reclamo('REC-2026-00003')],
  ]) {
    const { store, resultado } = guardar(admin, { complaints });
    assert.throws(resultado, { code: 'COMPLAINTS_READ_ONLY' });
    assert.equal(store.state.complaints.length, 2);
  }
});
