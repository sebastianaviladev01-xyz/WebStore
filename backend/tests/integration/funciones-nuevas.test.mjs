/**
 * Lote 07b (ADR-0017), por HTTP contra el BFF real: actividad reciente (PBI-0028), notificaciones de pedidos nuevos
 * (PBI-0033), perfil propio (PBI-0034) e imagen de categoría (PBI-0052). Lote 13 (ADR-0021): sin personas en línea ni
 * latido (PBI-0172) y con reclamos y errores de compra en la campana (PBI-0173).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bearer, conBff, ingresarAlAdmin, pedidoValido, pedir } from './apoyo/servidor.mjs';
import { dataUrl, png } from '../apoyo/imagenes.mjs';

const VENDEDOR = ['catalogo@webstore.demo', 'Catalogo#2026'];
const snapshot = async (base, token) =>
  (await pedir(base, '/bff/admin/snapshot', { headers: bearer(token) })).body;

test('PBI-0172: sin «Personas en línea», el BFF ya no recibe latidos ni los envía en el snapshot', async () => {
  await conBff({ port: 3170 }, async (base) => {
    const latido = await pedir(base, '/bff/visits', {
      method: 'POST',
      body: { visitId: 'pestana-uno-000000001' },
    });
    assert.equal(latido.status, 404);
    assert.equal(latido.body.error.code, 'ROUTE_NOT_FOUND');
    const { token } = await ingresarAlAdmin(base);
    assert.equal('onlineVisitors' in (await snapshot(base, token)), false);
    const vendedor = await ingresarAlAdmin(base, ...VENDEDOR);
    assert.equal('onlineVisitors' in (await snapshot(base, vendedor.token)), false);
  });
});

test('PBI-0028: pedido, cambio de estado, cuenta y reclamo dejan su evento, el más reciente primero', async () => {
  await conBff({ port: 3171 }, async (base) => {
    const pedido = await pedir(base, '/bff/checkout/orders', { method: 'POST', body: pedidoValido() });
    assert.equal(pedido.status, 201);
    const cuenta = await pedir(base, '/bff/accounts', {
      method: 'POST',
      body: {
        fullName: 'Cuenta Nueva',
        email: 'nueva@example.com',
        phone: '999',
        document: '123',
        password: 'Clave2026x',
      },
    });
    assert.equal(cuenta.status, 201);
    const reclamo = await pedir(base, '/bff/complaints', {
      method: 'POST',
      body: {
        name: 'Luis Soto',
        document: '123',
        email: 'luis@example.com',
        phone: '999',
        address: 'Av. 1',
        subject: 'Falla',
        type: 'reclamo',
        detail: 'Detalle.',
        request: 'Cambio.',
      },
    });
    assert.equal(reclamo.status, 201);
    const { token } = await ingresarAlAdmin(base);
    const { revision } = await snapshot(base, token);
    const cambio = await pedir(base, '/bff/admin/snapshot', {
      method: 'PUT',
      headers: bearer(token),
      body: { revision, orders: { upsert: [{ id: pedido.body.id, status: 'shipped' }] } },
    });
    assert.equal(cambio.status, 200);
    assert.deepEqual(
      cambio.body.activity.map((evento) => evento.type),
      ['order-status-changed', 'complaint-registered', 'account-registered', 'order-created'],
    );
    assert.equal(
      cambio.body.activity[0].description,
      `El equipo pasó el pedido ${pedido.body.id} a «Enviado».`,
    );
    assert.ok(!JSON.stringify(cambio.body.activity).includes('nueva@example.com'));
    // El vendedor no la recibe.
    const vendedor = await ingresarAlAdmin(base, ...VENDEDOR);
    assert.deepEqual((await snapshot(base, vendedor.token)).activity, []);
  });
});

test('PBI-0033: la campana lista los pedidos confirmados nuevos y «visto» se recuerda por usuario', async () => {
  await conBff({ port: 3172 }, async (base) => {
    const { token } = await ingresarAlAdmin(base);
    const leer = async (t = token) => pedir(base, '/bff/admin/notifications', { headers: bearer(t) });
    assert.deepEqual((await leer()).body, {
      seenAt: null,
      total: 0,
      counts: { orders: 0, complaints: 0, checkoutErrors: 0 },
      items: [],
    });
    const pedido = await pedir(base, '/bff/checkout/orders', { method: 'POST', body: pedidoValido() });
    const vista = (await leer()).body;
    assert.equal(vista.total, 1);
    assert.deepEqual(Object.keys(vista.items[0]).sort(), ['at', 'customer', 'id', 'total', 'type']);
    assert.equal(vista.items[0].id, pedido.body.id);

    const visto = await pedir(base, '/bff/admin/notifications/seen', {
      method: 'PUT',
      headers: bearer(token),
      body: { until: vista.items[0].at },
    });
    assert.equal(visto.status, 200);
    assert.equal(visto.body.total, 0);
    assert.equal((await leer()).body.total, 0);
    // Otro usuario no lo vio.
    const admin = await ingresarAlAdmin(base, 'admin@webstore.demo', 'Admin#2026');
    assert.equal((await leer(admin.token)).body.total, 1);

    const malo = await pedir(base, '/bff/admin/notifications/seen', {
      method: 'PUT',
      headers: bearer(token),
      body: { until: 'ayer' },
    });
    assert.equal(malo.body.error.code, 'INVALID_SEEN_AT');
    // PBI-0170 (lote 11): el vendedor ve los pedidos, así que también su campana, con su propio «visto».
    const vendedor = await ingresarAlAdmin(base, ...VENDEDOR);
    const campanaDelVendedor = await leer(vendedor.token);
    assert.equal(campanaDelVendedor.status, 200);
    assert.equal(campanaDelVendedor.body.total, 1);
    assert.equal((await pedir(base, '/bff/admin/notifications')).status, 401);
  });
});

test('PBI-0173: la campana avisa también de los reclamos y de los errores de compra, según el rol', async () => {
  await conBff({ port: 3175 }, async (base) => {
    const pedido = await pedir(base, '/bff/checkout/orders', { method: 'POST', body: pedidoValido() });
    assert.equal(pedido.status, 201);
    const fallido = await pedir(base, '/bff/checkout/orders', {
      method: 'POST',
      body: pedidoValido({ total: 1 }),
    });
    assert.equal(fallido.body.error.code, 'ORDER_TOTAL_CHANGED');
    const reclamo = await pedir(base, '/bff/complaints', {
      method: 'POST',
      body: {
        name: 'Luis Soto',
        document: '123',
        email: 'luis@example.com',
        phone: '999',
        address: 'Av. 1',
        subject: 'Falla',
        type: 'queja',
        detail: 'Detalle.',
        request: 'Cambio.',
      },
    });
    assert.equal(reclamo.status, 201);

    const { token } = await ingresarAlAdmin(base);
    const vista = (await pedir(base, '/bff/admin/notifications', { headers: bearer(token) })).body;
    assert.deepEqual(
      vista.items.map((item) => item.type),
      ['complaint', 'checkout-error', 'order'],
    );
    assert.deepEqual(vista.counts, { orders: 1, complaints: 1, checkoutErrors: 1 });
    assert.equal(vista.total, 3);
    assert.deepEqual(vista.items[0], {
      type: 'complaint',
      id: reclamo.body.id,
      at: reclamo.body.createdAt,
      complaintType: 'queja',
    });
    assert.equal(vista.items[1].code, 'ORDER_TOTAL_CHANGED');
    assert.ok(!JSON.stringify(vista).includes('luis@example.com'));
    // El error de compra no cambia la revisión: el Admin puede seguir guardando lo que editaba.
    const antes = await snapshot(base, token);
    await pedir(base, '/bff/checkout/orders', { method: 'POST', body: pedidoValido({ total: 2 }) });
    assert.equal((await snapshot(base, token)).revision, antes.revision);

    // «Visto» hasta el aviso más reciente que se mostró, sea del tipo que sea.
    const visto = await pedir(base, '/bff/admin/notifications/seen', {
      method: 'PUT',
      headers: bearer(token),
      body: { until: vista.items[0].at },
    });
    assert.equal(visto.body.total, 1, 'queda el segundo error, posterior a lo visto');

    // El vendedor solo ve los pedidos.
    const vendedor = await ingresarAlAdmin(base, ...VENDEDOR);
    const delVendedor = (await pedir(base, '/bff/admin/notifications', { headers: bearer(vendedor.token) }))
      .body;
    assert.deepEqual(
      delVendedor.items.map((item) => item.type),
      ['order'],
    );
  });
});

test('PBI-0034: el perfil se edita por su ruta y cambiar la contraseña cierra las demás sesiones', async () => {
  await conBff({ port: 3173 }, async (base) => {
    const [correo, clave] = VENDEDOR;
    const primera = await ingresarAlAdmin(base, correo, clave);
    const segunda = await ingresarAlAdmin(base, correo, clave);
    const datos = await pedir(base, '/bff/admin/profile', {
      method: 'PATCH',
      headers: bearer(primera.token),
      body: { name: 'Vendedora Uno', email: 'ventas@webstore.demo' },
    });
    assert.equal(datos.status, 200);
    assert.equal(datos.body.user.name, 'Vendedora Uno');
    const repetido = await pedir(base, '/bff/admin/profile', {
      method: 'PATCH',
      headers: bearer(primera.token),
      body: { name: 'X', email: 'owner@webstore.demo' },
    });
    assert.equal(repetido.status, 409);
    assert.equal(repetido.body.error.code, 'ADMIN_EMAIL_TAKEN');

    const malaActual = await pedir(base, '/bff/admin/profile/password', {
      method: 'PUT',
      headers: bearer(primera.token),
      body: { currentPassword: 'Otra2026xx', newPassword: 'Nueva2026x' },
    });
    assert.equal(malaActual.status, 400);
    assert.equal(malaActual.body.error.code, 'INVALID_CURRENT_PASSWORD');
    const cambio = await pedir(base, '/bff/admin/profile/password', {
      method: 'PUT',
      headers: bearer(primera.token),
      body: { currentPassword: clave, newPassword: 'Nueva2026x' },
    });
    assert.equal(cambio.status, 204);
    const actual = (t) => pedir(base, '/bff/admin/sessions/current', { headers: bearer(t) });
    assert.equal((await actual(primera.token)).status, 200, 'la sesión que cambió la contraseña sigue');
    assert.equal((await actual(segunda.token)).status, 401, 'la otra sesión se cerró');
    await ingresarAlAdmin(base, 'ventas@webstore.demo', 'Nueva2026x');
    assert.equal((await pedir(base, '/bff/admin/profile', { method: 'PATCH', body: {} })).status, 401);
  });
});

test('PBI-0052 y PBI-0176: la categoría guarda una imagen opcional de 100 × 100 px y el catálogo la publica', async () => {
  await conBff({ port: 3174 }, async (base) => {
    const { token } = await ingresarAlAdmin(base);
    const imagen = dataUrl('png', png(100, 100));
    const guardar = async (cambio) =>
      pedir(base, '/bff/admin/snapshot', {
        method: 'PUT',
        headers: bearer(token),
        body: { revision: (await snapshot(base, token)).revision, categories: { upsert: [cambio] } },
      });
    assert.equal((await guardar({ id: 'cat-tv', imageUrl: imagen })).status, 200);
    const publicas = (await pedir(base, '/bff/catalog/categories')).body;
    // Lote 25 (ADR-0026): el catálogo publica la dirección de la imagen, no su Data URL; el BFF la sirve.
    const direccion = publicas.find((item) => item.id === 'cat-tv').imageUrl;
    assert.match(direccion, /^\/bff\/images\/categories\/cat-tv\/image\?v=/);
    const servida = await fetch(base + direccion);
    assert.equal(servida.status, 200);
    assert.equal(servida.headers.get('content-type'), 'image/png');
    assert.equal(dataUrl('png', Buffer.from(await servida.arrayBuffer())), imagen);
    assert.equal(publicas.find((item) => item.id === 'cat-home').imageUrl, null);

    const pesada = await guardar({ id: 'cat-tv', imageUrl: `data:image/webp;base64,${'A'.repeat(200_000)}` });
    assert.equal(pesada.status, 400);
    assert.equal(pesada.body.error.details.field, 'imageUrl');
    const otroTipo = await guardar({ id: 'cat-tv', imageUrl: 'javascript:alert(1)' });
    assert.equal(otroTipo.status, 400);
    // Lote 11 (PBI-0176): una sola versión de 100 × 100 px; otras medidas o un tipo que no es el de los bytes, no.
    for (const otra of [dataUrl('png', png(160, 160)), dataUrl('webp', png(100, 100))]) {
      const rechazo = await guardar({ id: 'cat-tv', imageUrl: otra });
      assert.equal(rechazo.status, 400);
      assert.equal(rechazo.body.error.details.field, 'imageUrl');
    }
    assert.equal((await guardar({ id: 'cat-tv', imageUrl: null })).status, 200, 'se quita con null');
    assert.equal(
      (await pedir(base, '/bff/catalog/categories')).body.find((item) => item.id === 'cat-tv').imageUrl,
      null,
    );
  });
});
