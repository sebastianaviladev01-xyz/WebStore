/**
 * Guardado del snapshot del Admin, lote 06 (ADR-0017), con un almacén en memoria:
 * - PBI-0119 y PBI-0120: una colección puede llegar como cambios (`{ upsert, remove }`): solo viajan los registros y
 *   los campos que la persona cambió, y el resto se conserva del servidor (fotos, stock vendido, cambios de otros).
 * - PBI-0123: un usuario con el correo de otro se rechaza (caracterización del lote 01).
 * - PBI-0128: un banner que termina antes de empezar se rechaza.
 * - PBI-0129: un producto con el SKU o la dirección de ficha (slug) de otro se rechaza, diciendo cuál.
 * - PBI-0131: una marca o una categoría que usan productos, o una categoría con subcategorías, no se elimina.
 * - PBI-0145: el pedido del Admin trae la fecha de aceptación de los términos.
 * - PBI-0184 (lote 12): cada botón del banner se guarda con su texto y su enlace, o sin ninguno de los dos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminSnapshot } from '../../../../src/application/admin/admin.views.mjs';
import { createSnapshotUseCases } from '../../../../src/application/admin/snapshot.use-cases.mjs';
import { seed } from '../../../../src/infrastructure/persistencia/seed.mjs';

const security = { hashPassword: (password) => ({ salt: 's', hash: `h:${password}` }) };

function crearAlmacen(cambios = {}) {
  const state = {
    ...structuredClone(seed),
    revision: 5,
    adminCredentials: seed.users.map((user) => ({ userId: user.id, salt: 's', hash: 'h' })),
    adminSessions: [],
    complaints: [],
    orders: [],
    ...cambios,
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
const vendedor = { id: 'u-2', role: 'vendedor' };

function guardar(usuario, cambios, store = crearAlmacen()) {
  const casos = createSnapshotUseCases({ store, security });
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

test('PBI-0120: un cambio parcial de un producto solo toca los campos enviados y conserva el resto', () => {
  const store = crearAlmacen();
  store.state.products = store.state.products.map((item) =>
    item.id === 'p-002' ? { ...item, stock: 3, gallery: ['data:image/jpeg;base64,AAAA'] } : item,
  );
  const { resultado } = guardar(superadmin, { products: { upsert: [{ id: 'p-002', price: 1999 }] } }, store);
  const snapshot = resultado();
  const lavadora = snapshot.products.find((item) => item.id === 'p-002');
  assert.equal(lavadora.price, 1999);
  assert.equal(lavadora.stock, 3, 'conserva el stock del servidor');
  assert.deepEqual(lavadora.gallery, ['data:image/jpeg;base64,AAAA'], 'conserva las fotos del servidor');
  assert.deepEqual(
    snapshot.products.filter((item) => item.id !== 'p-002'),
    seed.products.filter((item) => item.id !== 'p-002'),
    'los demás productos no cambian',
  );
  assert.equal(snapshot.revision, 6);
});

test('PBI-0119: guardar el stock de un producto no reenvía las fotos de ningún producto', () => {
  const foto = `data:image/jpeg;base64,${'A'.repeat(500_000)}`;
  const store = crearAlmacen();
  store.state.products = store.state.products.map((item) => ({ ...item, gallery: [foto, `${foto}B`] }));
  const cambios = { products: { upsert: [{ id: 'p-001', stock: 2 }] } };
  assert.ok(JSON.stringify(cambios).length < 200, 'el cuerpo no lleva fotos');
  const { resultado } = guardar(superadmin, cambios, store);
  const tv = resultado().products.find((item) => item.id === 'p-001');
  assert.equal(tv.stock, 2);
  assert.equal(tv.gallery.length, 2);
});

test('PBI-0119: un producto nuevo se agrega completo y uno retirado se elimina, sin enviar la colección', () => {
  const nuevo = { ...producto('p-004'), id: 'p-nuevo', sku: 'NUEVO-1', name: 'Parlante nuevo' };
  const { resultado } = guardar(superadmin, { products: { upsert: [nuevo], remove: ['p-006'] } });
  const ids = resultado().products.map((item) => item.id);
  assert.deepEqual(ids, ['p-001', 'p-002', 'p-003', 'p-004', 'p-005', 'p-nuevo']);
});

test('PBI-0120: null en un cambio quita el campo (una categoría que deja de tener padre)', () => {
  const { resultado } = guardar(superadmin, {
    categories: { upsert: [{ id: 'cat-tv-oled', parentId: null }] },
  });
  const oled = resultado().categories.find((item) => item.id === 'cat-tv-oled');
  assert.equal('parentId' in oled, false);
  assert.equal(oled.name, 'OLED');
});

test('PBI-0120: un producto nuevo incompleto se rechaza con INVALID_COLLECTION', () => {
  const { store, resultado } = guardar(superadmin, {
    products: { upsert: [{ id: 'p-x', name: 'Sin SKU' }] },
  });
  assert.throws(resultado, rechazo('INVALID_COLLECTION', { collection: 'products', field: 'sku' }));
  assert.equal(store.guardados, 0);
});

test('PBI-0120: los cambios con una forma desconocida se rechazan', () => {
  for (const products of [
    { upsert: 'p-001' },
    { remove: [1] },
    { upsert: [{ price: 1 }] },
    { reemplazar: [] },
    { upsert: [{ id: 'p-001' }], remove: ['p-001'] },
  ]) {
    const { resultado } = guardar(superadmin, { products });
    assert.throws(
      resultado,
      rechazo('INVALID_COLLECTION', { collection: 'products' }),
      JSON.stringify(products),
    );
  }
});

test('PBI-0120: el vendedor cambia el stock con un cambio parcial, pero no elimina productos (PBI-0013)', () => {
  const stock = guardar(vendedor, { products: { upsert: [{ id: 'p-003', stock: 1 }] } }).resultado();
  assert.equal(stock.products.find((item) => item.id === 'p-003').stock, 1);
  assert.throws(
    guardar(vendedor, { products: { remove: ['p-003'] } }).resultado,
    rechazo('CATALOG_SCOPE_VIOLATION'),
  );
});

test('PBI-0120: el estado de un pedido y la respuesta de un reclamo también llegan como cambios', () => {
  const reclamo = {
    id: 'REC-1',
    name: 'Ana',
    document: '1',
    email: 'a@example.com',
    phone: '9',
    address: 'Av',
    subject: 'X',
    amount: 10,
    type: 'reclamo',
    detail: 'Detalle',
    request: 'Pedido',
    status: 'received',
    providerResponse: '',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    dueAt: '2026-11-20T00:00:00.000Z',
  };
  const pedido = {
    id: 'WS-1',
    status: 'confirmed',
    createdAt: '2026-11-01T00:00:00.000Z',
    customer: { fullName: 'Ana', email: 'a@example.com', phone: '9' },
    items: [],
    total: 10,
  };
  const store = crearAlmacen({ complaints: [reclamo], orders: [pedido] });
  const snapshot = guardar(
    superadmin,
    {
      orders: { upsert: [{ id: 'WS-1', status: 'processing' }] },
      complaints: { upsert: [{ id: 'REC-1', status: 'resolved', providerResponse: 'Listo' }] },
    },
    store,
  ).resultado();
  assert.equal(snapshot.orders[0].status, 'processing');
  assert.equal(snapshot.complaints[0].status, 'resolved');
  assert.equal(snapshot.complaints[0].detail, 'Detalle');
});

test('PBI-0123 (caracterización): un usuario con el correo de otro, aunque cambien las mayúsculas, se rechaza', () => {
  const { store, resultado } = guardar(superadmin, {
    users: {
      upsert: [
        {
          id: 'u-nuevo',
          name: 'Otra persona',
          email: ' Admin@WebStore.demo ',
          role: 'vendedor',
          active: true,
          temporaryPassword: 'Temporal1234',
        },
      ],
    },
  });
  assert.throws(resultado, rechazo('INVALID_COLLECTION', { collection: 'users', field: 'email' }));
  assert.equal(store.guardados, 0);
});

test('PBI-0129: un producto con el SKU de otro se rechaza diciendo cuál', () => {
  const nuevo = { ...producto('p-004'), id: 'p-nuevo', sku: 'tv-oled-55-vsn', name: 'Televisor nuevo' };
  assert.throws(guardar(superadmin, { products: { upsert: [nuevo] } }).resultado, (error) => {
    assert.equal(error.code, 'INVALID_COLLECTION');
    assert.equal(error.details.field, 'sku');
    assert.match(error.message, /tv-oled-55-vsn/);
    return true;
  });
});

test('PBI-0129: un producto con la dirección de ficha de otro se rechaza diciendo cuál', () => {
  const nuevo = { ...producto('p-004'), id: 'p-nuevo', sku: 'OTRO-1', name: 'Oled Visión 55 4K' };
  assert.throws(guardar(superadmin, { products: { upsert: [nuevo] } }).resultado, (error) => {
    assert.equal(error.code, 'INVALID_COLLECTION');
    assert.deepEqual(error.details, { collection: 'products', field: 'slug', id: 'p-nuevo' });
    assert.match(error.message, /oled-vision-55-4k/);
    assert.match(error.message, /OLED Vision 55” 4K/);
    return true;
  });
  const renombrado = { id: 'p-002', name: 'Microondas EasyCook 30 L' };
  assert.throws(
    guardar(superadmin, { products: { upsert: [renombrado] } }).resultado,
    rechazo('INVALID_COLLECTION', { field: 'slug' }),
  );
});

test('PBI-0129: dos productos que ya compartían dirección no bloquean el guardado de otro', () => {
  const store = crearAlmacen();
  store.state.products.push({ ...producto('p-001'), id: 'p-copia', sku: 'COPIA-1' });
  const snapshot = guardar(
    superadmin,
    { products: { upsert: [{ id: 'p-005', stock: 1 }] } },
    store,
  ).resultado();
  assert.equal(snapshot.products.find((item) => item.id === 'p-005').stock, 1);
});

test('PBI-0131: una marca que usan productos no se elimina y el error dice cuántos', () => {
  const { store, resultado } = guardar(superadmin, { brands: { remove: ['b-nova'] } });
  assert.throws(resultado, (error) => {
    assert.equal(error.code, 'BRAND_IN_USE');
    assert.deepEqual(error.details, { brandId: 'b-nova', products: 5 });
    assert.match(error.message, /Nova/);
    assert.match(error.message, /5 productos/);
    return true;
  });
  assert.equal(store.guardados, 0);
  // Con la colección entera (Admin anterior) también.
  assert.throws(
    guardar(superadmin, { brands: seed.brands.filter((item) => item.id !== 'b-zen') }).resultado,
    rechazo('BRAND_IN_USE', { brandId: 'b-zen', products: 1 }),
  );
});

test('PBI-0131: una marca sin productos se elimina, y también si sus productos cambian de marca a la vez', () => {
  const store = crearAlmacen();
  store.state.brands.push({ id: 'b-libre', name: 'Libre', active: true });
  const libre = guardar(superadmin, { brands: { remove: ['b-libre'] } }, store).resultado();
  assert.equal(
    libre.brands.some((item) => item.id === 'b-libre'),
    false,
  );
  const juntos = guardar(superadmin, {
    products: { upsert: [{ id: 'p-005', brandId: 'b-nova' }] },
    brands: { remove: ['b-zen'] },
  }).resultado();
  assert.deepEqual(
    juntos.brands.map((item) => item.id),
    ['b-nova'],
  );
});

test('PBI-0131: una categoría que usan productos o que tiene subcategorías no se elimina', () => {
  assert.throws(guardar(superadmin, { categories: { remove: ['cat-kitchen'] } }).resultado, (error) => {
    assert.equal(error.code, 'CATEGORY_IN_USE');
    assert.deepEqual(error.details, { categoryId: 'cat-kitchen', products: 1 });
    assert.match(error.message, /Cocina/);
    assert.match(error.message, /1 producto\b/);
    return true;
  });
  const store = crearAlmacen();
  store.state.categories.push(
    { id: 'cat-padre', name: 'Padre' },
    { id: 'cat-hija', name: 'Hija', parentId: 'cat-padre' },
  );
  assert.throws(guardar(superadmin, { categories: { remove: ['cat-padre'] } }, store).resultado, (error) => {
    assert.equal(error.code, 'CATEGORY_HAS_CHILDREN');
    assert.deepEqual(error.details, { categoryId: 'cat-padre', children: 1 });
    assert.match(error.message, /Padre/);
    return true;
  });
  const sinHijas = guardar(
    superadmin,
    { categories: { remove: ['cat-hija', 'cat-padre'] } },
    store,
  ).resultado();
  assert.equal(
    sinHijas.categories.some((item) => item.id.startsWith('cat-pa')),
    false,
  );
});

test('PBI-0128: un banner que termina antes de empezar se rechaza', () => {
  const banner = {
    ...structuredClone(seed.banners[0]),
    id: 'bn-nuevo',
    startAt: '2026-12-10T00:00:00.000-05:00',
    endAt: '2026-12-01T23:59:59.999-05:00',
  };
  assert.throws(
    guardar(superadmin, { banners: { upsert: [banner] } }).resultado,
    rechazo('INVALID_COLLECTION', { collection: 'banners', field: 'endAt', id: 'bn-nuevo' }),
  );
  const mismoDia = { ...banner, endAt: '2026-12-10T23:59:59.999-05:00' };
  assert.equal(guardar(superadmin, { banners: { upsert: [mismoDia] } }).resultado().banners.length, 6);
});

test('PBI-0145: el pedido del Admin trae la fecha de aceptación de los términos, o null si no la hay', () => {
  const base = {
    id: 'WS-1',
    status: 'confirmed',
    createdAt: '2026-11-01T00:00:00.000Z',
    customer: { fullName: 'Ana', email: 'a@example.com', phone: '9' },
    items: [],
    total: 10,
  };
  const state = {
    ...structuredClone(seed),
    orders: [
      { ...base, termsAcceptedAt: '2026-11-01T00:00:00.000Z' },
      { ...base, id: 'WS-2' },
    ],
  };
  const [conTerminos, anterior] = buildAdminSnapshot(state, 'superadmin').orders;
  assert.equal(conTerminos.termsAcceptedAt, '2026-11-01T00:00:00.000Z');
  assert.equal(anterior.termsAcceptedAt, null);
});

// Lote 07 (ADR-0017), PBI-0148: la tienda abre una categoría por el slug de su nombre; dos con el mismo slug se pisan.
test('PBI-0148: una categoría con la dirección de otra se rechaza diciendo cuál', () => {
  const otra = seed.categories[0];
  const { store, resultado } = guardar(superadmin, {
    categories: { upsert: [{ id: 'cat-nueva', name: ` ${otra.name.toUpperCase()} `, parentId: null }] },
  });
  assert.throws(
    resultado,
    rechazo('INVALID_COLLECTION', { collection: 'categories', field: 'slug', id: 'cat-nueva' }),
  );
  assert.equal(store.guardados, 0);
});

test('PBI-0148: dos categorías que ya compartían dirección no bloquean el guardado de otra', () => {
  const [primera, segunda] = seed.categories;
  const store = crearAlmacen({
    categories: seed.categories.map((item) =>
      item.id === segunda.id ? { ...item, name: primera.name } : item,
    ),
  });
  const snapshot = guardar(
    superadmin,
    { categories: { upsert: [{ id: 'cat-otra', name: 'Categoría lote 07', parentId: null }] } },
    store,
  ).resultado();
  assert.ok(snapshot.categories.some((item) => item.id === 'cat-otra'));
});

test('lote 12 (PBI-0184): el botón secundario se guarda con su texto y su enlace; a medias se rechaza', () => {
  const conSecundario = guardar(superadmin, {
    banners: {
      upsert: [{ id: 'bn-3', secondaryCta: 'Ver ofertas', secondaryCtaUrl: 'https://example.com' }],
    },
  }).resultado();
  const banner = conSecundario.banners.find((item) => item.id === 'bn-3');
  assert.equal(banner.secondaryCta, 'Ver ofertas');
  assert.equal(banner.secondaryCtaUrl, 'https://example.com');
  assert.equal(banner.cta, 'Ver electrohogar');
  assert.throws(
    guardar(superadmin, { banners: { upsert: [{ id: 'bn-3', secondaryCta: 'Ver ofertas' }] } }).resultado,
    rechazo('INVALID_COLLECTION', { collection: 'banners', field: 'secondaryCtaUrl', id: 'bn-3' }),
  );
  // Quitar los dos campos de un botón lo quita.
  const sinPrincipal = guardar(superadmin, {
    banners: { upsert: [{ id: 'bn-3', cta: '', ctaUrl: '' }] },
  }).resultado();
  assert.equal(sinPrincipal.banners.find((item) => item.id === 'bn-3').cta, '');
});
