/**
 * Smoke test del contrato HTTP del BFF (`npm run test:contract`): levanta el servidor real con un archivo de
 * estado temporal (nunca `backend/data.json`) y recorre el contrato de docs/BFF-CONTRACT.md. No usa node:test.
 */
import { spawn } from 'node:child_process';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { dataUrl, imagenesDeProducto, png, webp } from '../apoyo/imagenes.mjs';
import { fechaDeLima } from './apoyo/servidor.mjs';

const port = 3107;
const base = `http://localhost:${port}`;
const dataFile = join(tmpdir(), `webstore-smoke-${process.pid}.json`);
const serverEntry = fileURLToPath(new URL('../../src/main.mjs', import.meta.url));
const child = spawn(process.execPath, [serverEntry], {
  stdio: 'ignore',
  env: {
    ...process.env,
    PORT: String(port),
    WEBSTORE_DATA_FILE: dataFile,
    // Fuera del modo demo, los códigos y el reinicio se piden de forma explícita (PBI-0090 y PBI-0091).
    WEBSTORE_EXPOSE_TEST_CODES: 'true',
    WEBSTORE_ALLOW_STORE_RESET: 'true',
    WEBSTORE_NON_WORKING_DATES: '',
  },
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function raw(path, options = {}) {
  return fetch(base + path, {
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
}
async function request(path, options = {}) {
  const response = await raw(path, options);
  if (!response.ok)
    throw new Error(`${options.method ?? 'GET'} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}
const authorization = (token) => ({ authorization: `Bearer ${token}` });
const errorDe = async (response) => (await response.json()).error ?? {};
/** Exige el estado y el código de error; devuelve el `error` del Problem. */
async function esperarError(response, status, code, contexto) {
  const error = response.status === status ? await errorDe(response) : {};
  if (response.status !== status || error.code !== code)
    throw new Error(`${contexto}: se esperaba ${status} ${code} y llegó ${response.status} ${error.code}`);
  return error;
}
async function adminLogin(email = 'owner@webstore.demo', password = 'WebStore#2026') {
  return request('/bff/admin/sessions', { method: 'POST', body: JSON.stringify({ email, password }) });
}

try {
  for (let index = 0; index < 30; index++) {
    try {
      await request('/health');
      break;
    } catch {
      await sleep(100);
    }
  }

  let owner = await adminLogin();
  await request('/bff/admin/reset', { method: 'POST', headers: authorization(owner.token), body: '{}' });
  owner = await adminLogin();
  let snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  snapshot.products[0].stock = 15;
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify(snapshot),
  });

  let products = await request('/bff/catalog/products');
  if (products[0].stock !== 15) throw new Error('El stock modificado en Admin no llegó al Storefront');
  if (!products[0].highlights.length || !products[0].thumbnailUrl)
    throw new Error('La ficha pública no expone características y miniatura');
  if (products[0].images[0] !== products[0].imageUrl || products[0].images.length < 2)
    throw new Error('La ficha pública no expone la galería con la imagen principal primero');
  snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  // Lote 25 (ADR-0026): una foto nueva de la galería se carga como archivo; la tienda la recibe por dirección y la
  // foto que el producto ya tenía (una ruta de assets/) sigue valiendo.
  const fotoCargada = dataUrl('webp', webp(1200, 900));
  snapshot.products[0] = {
    ...snapshot.products[0],
    gallery: [fotoCargada, 'assets/brand/living-room-v2.jpg'],
  };
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify(snapshot),
  });
  products = await request('/bff/catalog/products');
  const [, fotoPublica, rutaPublica] = products[0].images;
  if (
    products[0].images.length !== 3 ||
    !/^\/bff\/images\/products\/[^/]+\/gallery\/0\?v=[A-Za-z0-9_-]{12}$/.test(fotoPublica) ||
    rutaPublica !== 'assets/brand/living-room-v2.jpg' ||
    JSON.stringify(products).includes('data:')
  )
    throw new Error('La galería editada en Admin no llegó al Storefront por dirección');
  const fotoServida = await raw(fotoPublica);
  if (
    fotoServida.status !== 200 ||
    dataUrl('webp', Buffer.from(await fotoServida.arrayBuffer())) !== fotoCargada
  )
    throw new Error('Lote 25: GET /bff/images no sirve la foto cargada de la galería');
  snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({
        revision: snapshot.revision,
        products: { upsert: [{ id: snapshot.products[0].id, gallery: ['https://example.com/foto.jpg'] }] },
      }),
    }),
    400,
    'INVALID_COLLECTION',
    'Lote 25: una URL nueva en la galería',
  );

  // Lote 22 (ADR-0025, PBI-0215): los destacados son los que marca el Admin, sin tope; la semilla marca los cuatro
  // primeros. Una marca que no es booleana se rechaza con 400 INVALID_COLLECTION.
  const destacados = (lista) => lista.filter((product) => product.featured).map((product) => product.id);
  if (destacados(products).join() !== 'p-001,p-002,p-003,p-004')
    throw new Error('La semilla no marca como destacados los cuatro productos de la demo');
  snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  const marcaInvalida = await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({
        revision: snapshot.revision,
        products: { upsert: [{ id: 'p-005', featured: 'si' }] },
      }),
    }),
    400,
    'INVALID_COLLECTION',
    'Una marca de destacado que no es booleana',
  );
  if (marcaInvalida.details?.field !== 'featured')
    throw new Error('El rechazo de la marca de destacado no señala el campo featured');
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: snapshot.revision,
      products: {
        upsert: [
          { id: 'p-001', featured: false },
          { id: 'p-005', featured: true },
          { id: 'p-006', featured: true },
        ],
      },
    }),
  });
  if (destacados(await request('/bff/catalog/products')).join() !== 'p-002,p-003,p-004,p-005,p-006')
    throw new Error('Los destacados marcados en Admin no llegaron al Storefront');
  snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: snapshot.revision,
      products: {
        upsert: [
          { id: 'p-001', featured: true },
          { id: 'p-005', featured: false },
          { id: 'p-006', featured: false },
        ],
      },
    }),
  });

  const product = products[0];
  // CartItem sin productId, como lo envía el Storefront, con un precio manipulado en el cliente.
  const command = {
    customer: {
      fullName: 'Smoke Test',
      email: 'smoke@example.com',
      phone: '999999999',
      document: '12345678',
    },
    shipping: { addressLine: 'Av Demo 123', district: 'San Isidro', province: 'Lima', department: 'Lima' },
    deliveryDate: fechaDeLima(2),
    paymentMethod: 'card',
    items: [{ product: { ...product, price: 1 }, quantity: 2 }],
    termsAccepted: true,
    // Lote 17 (PBI-0177): la versión de los términos que mostró la tienda (la 1 en un estado nuevo).
    termsVersion: 1,
  };
  // Lote 04 (ADR-0017): sin aceptar los términos (PBI-0040) o con un total que no es el del BFF (PBI-0106), no se
  // crea nada ni se toca el stock.
  const { termsAccepted: _sinTerminos, ...sinTerminos } = command;
  await esperarError(
    await raw('/bff/checkout/orders', { method: 'POST', body: JSON.stringify(sinTerminos) }),
    400,
    'TERMS_NOT_ACCEPTED',
    'Sin aceptar los términos',
  );
  const totalCambiado = await esperarError(
    await raw('/bff/checkout/orders', { method: 'POST', body: JSON.stringify({ ...command, total: 2 }) }),
    409,
    'ORDER_TOTAL_CHANGED',
    'Total que no es el del BFF',
  );
  if (totalCambiado.details?.total !== Math.round((product.price * 2 + 12) * 100) / 100)
    throw new Error('ORDER_TOTAL_CHANGED no trae el total vigente');
  if ((await request('/bff/catalog/products'))[0].stock !== 15)
    throw new Error('Un checkout rechazado descontó stock');
  // Doble envío (PBI-0086): la misma Idempotency-Key devuelve el mismo pedido con 200 y no descuenta otra vez.
  const intento = { 'content-type': 'application/json', 'idempotency-key': 'smoke-intento-0123456789' };
  const primerEnvio = await raw('/bff/checkout/orders', {
    method: 'POST',
    headers: intento,
    body: JSON.stringify(command),
  });
  const segundoEnvio = await raw('/bff/checkout/orders', {
    method: 'POST',
    headers: intento,
    body: JSON.stringify(command),
  });
  if (primerEnvio.status !== 201 || segundoEnvio.status !== 200)
    throw new Error(`Idempotency-Key: ${primerEnvio.status} y ${segundoEnvio.status}, se esperaba 201 y 200`);
  const order = await primerEnvio.json();
  const repetido = await segundoEnvio.json();
  if (repetido.id !== order.id || 'idempotencyKeyHash' in repetido)
    throw new Error('La misma clave no devolvió el mismo pedido');
  if (!order.termsAcceptedAt) throw new Error('El pedido no guarda la aceptación de los términos');
  if (order.termsVersion !== 1)
    throw new Error('El pedido no guarda la versión de los términos aceptada (PBI-0177)');
  order.accessToken = repetido.accessToken;
  products = await request('/bff/catalog/products');
  if (products[0].stock !== 13) throw new Error('Checkout no descontó stock, o lo descontó dos veces');
  if (order.shippingOrigin !== 'Lima Centro' || order.shippingCost !== 12)
    throw new Error('El BFF no asignó origen/tarifa desde la tabla de envíos');
  if (order.total !== Math.round((product.price * 2 + 12) * 100) / 100)
    throw new Error('El BFF aceptó montos calculados por el cliente');
  if (!order.accessToken || order.accessTokenHash)
    throw new Error('El checkout no entregó un token de acceso público seguro');
  snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  if (!snapshot.orders.some((item) => item.id === order.id)) throw new Error('Pedido no llegó al Admin');
  if (!snapshot.customers.some((customer) => customer.email === 'smoke@example.com'))
    throw new Error('Cliente no llegó al Admin');

  const quote = await request('/bff/shipping/quote?destination=Lince');
  if (quote.origin !== 'Lima Centro' || quote.price !== 10)
    throw new Error('La cotización no eligió el origen desde la tabla');
  if ((await raw('/bff/orders?email=smoke@example.com')).status !== 401)
    throw new Error('Listar pedidos por correo no exige sesión');
  if ((await raw(`/bff/orders/${order.id}`)).status !== 404)
    throw new Error('Un pedido es visible sin autorización');
  if ((await raw(`/bff/orders/${order.id}`, { headers: { 'x-order-token': 'token-ajeno' } })).status !== 404)
    throw new Error('Un token ajeno accede al pedido');
  if ((await raw(`/bff/orders/${order.id}/cancel`, { method: 'PATCH', body: '{}' })).status !== 404)
    throw new Error('Un pedido se puede cancelar sin autorización');
  const guestAccess = { 'x-order-token': order.accessToken };
  const guestOrder = await request(`/bff/orders/${order.id}`, { headers: guestAccess });
  if (guestOrder.id !== order.id) throw new Error('El token de invitado no recupera su pedido');
  const moved = await request(`/bff/orders/${order.id}/shipping`, {
    method: 'PATCH',
    headers: guestAccess,
    body: JSON.stringify({ shipping: { ...command.shipping, district: 'Lince' } }),
  });
  if (moved.shippingCost !== 10 || moved.total !== Math.round((product.price * 2 + 10) * 100) / 100)
    throw new Error('Cambiar de distrito no recalculó el envío');
  await request(`/bff/orders/${order.id}/cancel`, { method: 'PATCH', headers: guestAccess, body: '{}' });
  products = await request('/bff/catalog/products');
  if (products[0].stock !== 15) throw new Error('Cancelar el pedido no liberó el stock reservado');

  const adminOrder = await request('/bff/checkout/orders', { method: 'POST', body: JSON.stringify(command) });
  snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  snapshot.orders = snapshot.orders.map((item) =>
    item.id === adminOrder.id ? { ...item, status: 'cancelled' } : item,
  );
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify(snapshot),
  });
  products = await request('/bff/catalog/products');
  if (products[0].stock !== 15) throw new Error('Cancelar desde Admin no liberó el stock reservado');

  // Un pedido entregado no lo cancela el cliente, aunque siga dentro de las 24 horas (PBI-0094).
  const entregado = await request('/bff/checkout/orders', { method: 'POST', body: JSON.stringify(command) });
  snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: snapshot.revision,
      orders: snapshot.orders.map((item) =>
        item.id === entregado.id ? { ...item, status: 'delivered' } : item,
      ),
    }),
  });
  const cancelarEntregado = await raw(`/bff/orders/${entregado.id}/cancel`, {
    method: 'PATCH',
    headers: { 'x-order-token': entregado.accessToken },
    body: '{}',
  });
  if (
    cancelarEntregado.status !== 409 ||
    (await cancelarEntregado.json()).error?.code !== 'ORDER_NOT_MODIFIABLE'
  )
    throw new Error('El cliente pudo cancelar un pedido entregado');
  snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: snapshot.revision,
      orders: snapshot.orders.map((item) =>
        item.id === entregado.id ? { ...item, status: 'cancelled' } : item,
      ),
    }),
  });
  products = await request('/bff/catalog/products');
  if (products[0].stock !== 15)
    throw new Error('Cancelar el pedido entregado desde Admin no liberó el stock');

  // Un Admin con datos viejos no debe pisar el stock vendido mientras tanto.
  const staleSnapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  await request('/bff/checkout/orders', { method: 'POST', body: JSON.stringify(command) });
  const staleSave = await raw('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: staleSnapshot.revision,
      brands: staleSnapshot.brands,
      products: staleSnapshot.products,
    }),
  });
  if (staleSave.status !== 409)
    throw new Error('El BFF aceptó un guardado del Admin con datos desactualizados');
  products = await request('/bff/catalog/products');
  if (products[0].stock !== 13) throw new Error('Un guardado desactualizado del Admin alteró el stock');
  const fresh = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  const partial = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({ revision: fresh.revision, brands: fresh.brands }),
  });
  if (partial.revision !== fresh.revision + 1 || partial.products[0].stock !== 13)
    throw new Error('El guardado parcial del Admin no conservó el stock o no avanzó la revisión');

  // Lote 06 (ADR-0017): cambios por registro y por campo, nombres únicos, marcas en uso y términos en el pedido.
  const conCambio = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: partial.revision,
      products: { upsert: [{ id: partial.products[1].id, price: partial.products[1].price + 1 }] },
    }),
  });
  if (
    conCambio.products[1].price !== partial.products[1].price + 1 ||
    conCambio.products[0].stock !== 13 ||
    conCambio.products[1].name !== partial.products[1].name
  )
    throw new Error('Un cambio { upsert } no aplicó solo el campo enviado (PBI-0120)');
  const slugRepetido = await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({
        revision: conCambio.revision,
        products: {
          upsert: [
            {
              ...conCambio.products[0],
              // Lote 24 (PBI-0214): un producto nuevo llega con sus imágenes cargadas.
              // Lote 25: sin la galería del producto que copia, que no es una foto cargada para el nuevo.
              gallery: [],
              ...imagenesDeProducto(),
              id: 'p-smoke-slug',
              sku: 'SMOKE-SLUG',
              name: conCambio.products[0].name.toUpperCase(),
            },
          ],
        },
      }),
    }),
    400,
    'INVALID_COLLECTION',
    'Dirección de ficha repetida (PBI-0129)',
  );
  if (slugRepetido.details?.field !== 'slug')
    throw new Error('La dirección repetida no indica el campo slug');
  await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({
        revision: conCambio.revision,
        brands: { remove: [conCambio.products[0].brandId] },
      }),
    }),
    409,
    'BRAND_IN_USE',
    'Marca en uso (PBI-0131)',
  );
  await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({ revision: conCambio.revision, categories: { remove: ['cat-tv'] } }),
    }),
    409,
    'CATEGORY_HAS_CHILDREN',
    'Categoría con subcategorías (PBI-0131)',
  );
  await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({ revision: conCambio.revision, categories: { remove: ['cat-kitchen'] } }),
    }),
    409,
    'CATEGORY_IN_USE',
    'Categoría en uso (PBI-0131)',
  );
  if (!conCambio.orders.some((item) => typeof item.termsAcceptedAt === 'string'))
    throw new Error('El pedido del Admin no trae termsAcceptedAt (PBI-0145)');

  // Jerarquía de categorías: sin ciclos ni padres inexistentes.
  const cyclic = partial.categories.map((category) =>
    category.id === 'cat-tv' ? { ...category, parentId: 'cat-tv-oled' } : category,
  );
  for (const categories of [
    cyclic,
    partial.categories.map((category) =>
      category.id === 'cat-tv' ? { ...category, parentId: 'cat-tv' } : category,
    ),
    [...partial.categories, { id: 'cat-huerfana', name: 'Huérfana', parentId: 'no-existe' }],
  ]) {
    const invalid = await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({ revision: conCambio.revision, categories }),
    });
    if (invalid.status !== 400) throw new Error('El BFF aceptó una jerarquía de categorías inválida');
  }
  if ((await request('/bff/catalog/categories')).find((category) => category.id === 'cat-tv')?.parentId)
    throw new Error('Una jerarquía rechazada alteró las categorías');

  // Lote 23 (ADR-0025, PBI-0226): el registro del producto no envía el stock, que se gestiona en Inventario. Un producto
  // nuevo sin `stock` empieza en 0, y un cambio sin `stock` conserva el vigente.
  const { stock: _stockDeLaPlantilla, ...plantilla } = conCambio.products[1];
  const conNuevoSinStock = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: conCambio.revision,
      products: {
        upsert: [
          {
            ...plantilla,
            // Lote 24 (PBI-0214): un producto nuevo llega con sus imágenes cargadas.
            // Lote 25: sin la galería del producto que copia, que no es una foto cargada para el nuevo.
            gallery: [],
            ...imagenesDeProducto(),
            id: 'p-smoke-stock',
            sku: 'SMOKE-STOCK',
            name: 'Producto sin stock',
          },
        ],
      },
    }),
  });
  if (conNuevoSinStock.products.find((item) => item.id === 'p-smoke-stock')?.stock !== 0)
    throw new Error('Un producto nuevo sin stock no empezó en 0 (PBI-0226)');
  const sinNuevo = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: conNuevoSinStock.revision,
      products: {
        upsert: [{ ...plantilla, name: conCambio.products[1].name }],
        remove: ['p-smoke-stock'],
      },
    }),
  });
  if (
    sinNuevo.products.some((item) => item.id === 'p-smoke-stock') ||
    sinNuevo.products[1].stock !== conCambio.products[1].stock
  )
    throw new Error('Un cambio sin stock no conservó el stock vigente (PBI-0226)');

  const registration = await request('/bff/accounts', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Cuenta Smoke',
      email: 'account@example.com',
      phone: '999999999',
      document: '87654321',
      password: 'CuentaSmoke2026',
    }),
  });
  if (!registration.testCode) throw new Error('El canal de prueba no entregó el código temporal');
  if ('account' in registration) throw new Error('El alta no debe devolver los datos de la cuenta');
  // Reenviar el código (PBI-0098): 202 con un código nuevo; el anterior deja de valer.
  const reenvio = await raw('/bff/account-verification-requests', {
    method: 'POST',
    body: JSON.stringify({ email: 'account@example.com' }),
  });
  const codigoNuevo = reenvio.status === 202 ? (await reenvio.json()).testCode : undefined;
  if (!/^\d{6}$/.test(codigoNuevo ?? ''))
    throw new Error('Reenviar el código debe responder 202 con un código');
  const sinCuenta = await raw('/bff/account-verification-requests', {
    method: 'POST',
    body: JSON.stringify({ email: 'nadie@example.com' }),
  });
  if (sinCuenta.status !== 202 || 'testCode' in (await sinCuenta.json()))
    throw new Error('Reenviar a un correo sin cuenta debe responder 202 sin código');
  await request('/bff/account-verifications', {
    method: 'POST',
    body: JSON.stringify({ email: 'account@example.com', code: codigoNuevo }),
  });
  // Alta uniforme (PBI-0100): un correo ya verificado responde 201 como uno nuevo, sin código ni cambios.
  const repetida = await raw('/bff/accounts', {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Otra persona',
      email: 'account@example.com',
      phone: '999999999',
      document: '87654321',
      password: 'OtraClave2026',
    }),
  });
  const cuerpoRepetida = repetida.status === 201 ? await repetida.json() : {};
  if (repetida.status !== 201 || cuerpoRepetida.testCode || cuerpoRepetida.message !== registration.message)
    throw new Error('El alta de un correo ya verificado debe responder igual que una nueva, sin código');
  const cabeceras = (await raw('/bff/catalog/products')).headers;
  if (cabeceras.get('cache-control') !== 'no-store' || cabeceras.get('x-content-type-options') !== 'nosniff')
    throw new Error(
      'Las respuestas JSON deben llevar Cache-Control: no-store y X-Content-Type-Options: nosniff',
    );
  const accountSession = await request('/bff/account-sessions', {
    method: 'POST',
    body: JSON.stringify({ email: 'account@example.com', password: 'CuentaSmoke2026' }),
  });
  const current = await request('/bff/account-sessions/current', {
    headers: authorization(accountSession.token),
  });
  if (current.user.email !== 'account@example.com')
    throw new Error('La sesión de cliente no recuperó el perfil');
  const accountOrder = await request('/bff/checkout/orders', {
    method: 'POST',
    headers: authorization(accountSession.token),
    body: JSON.stringify({ ...command, customer: { ...command.customer, email: 'account@example.com' } }),
  });
  const mine = await request('/bff/orders', { headers: authorization(accountSession.token) });
  if (!mine.some((item) => item.id === accountOrder.id) || mine.some((item) => item.id === order.id))
    throw new Error('La cuenta no ve exactamente sus pedidos');
  if ((await raw(`/bff/orders/${order.id}`, { headers: authorization(accountSession.token) })).status !== 404)
    throw new Error('Una cuenta accede a pedidos de otro correo');
  const reset = await request('/bff/password-reset-requests', {
    method: 'POST',
    body: JSON.stringify({ email: 'account@example.com' }),
  });
  await request('/bff/password-resets', {
    method: 'POST',
    body: JSON.stringify({ email: 'account@example.com', code: reset.testCode, password: 'CuentaNueva2026' }),
  });
  const oldSession = await raw('/bff/account-sessions/current', {
    headers: authorization(accountSession.token),
  });
  if (oldSession.status !== 401) throw new Error('El cambio de contraseña no revocó sesiones anteriores');

  const complaint = await request('/bff/complaints', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Cliente Smoke',
      document: '12345678',
      email: 'smoke@example.com',
      phone: '999999999',
      address: 'Av Demo 123',
      subject: 'Producto de prueba',
      amount: 100,
      type: 'reclamo',
      detail: 'Detalle suficiente para la prueba contractual.',
      request: 'Solicito revisión del caso.',
    }),
  });
  if (!/^REC-\d{4}-\d{5}$/.test(complaint.id)) throw new Error('No se generó código de reclamación');
  const montoInvalido = await raw('/bff/complaints', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Cliente Smoke',
      document: '12345678',
      email: 'smoke@example.com',
      phone: '999999999',
      address: 'Av Demo 123',
      subject: 'Producto de prueba',
      amount: 'abc',
      type: 'reclamo',
      detail: 'Detalle.',
      request: 'Revisión.',
    }),
  });
  if (montoInvalido.status !== 400 || (await montoInvalido.json()).error?.code !== 'INVALID_COMPLAINT_AMOUNT')
    throw new Error('Un monto no numérico debe responder 400 INVALID_COMPLAINT_AMOUNT');
  const toLimaDate = (date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  const cursor = new Date(`${toLimaDate(new Date(complaint.createdAt))}T00:00:00Z`);
  const dueDate = new Date(`${toLimaDate(new Date(complaint.dueAt))}T00:00:00Z`);
  let businessDays = 0;
  while (cursor < dueDate) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) businessDays += 1;
  }
  if (businessDays !== 15) throw new Error(`El plazo debe ser 15 días hábiles; calculados ${businessDays}`);
  snapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  if (!snapshot.complaints.some((item) => item.id === complaint.id))
    throw new Error('La reclamación no llegó al Admin');

  // Contenido ya no tiene colores (D3, AC-22): ni la semilla ni el snapshot los traen.
  const coloresDeContenido = (config) => ['primaryColor', 'secondaryColor'].filter((key) => key in config);
  if (
    coloresDeContenido(await request('/bff/content/settings')).length ||
    coloresDeContenido(snapshot.config).length
  )
    throw new Error('Contenido no debe traer primaryColor ni secondaryColor');
  // Un Admin anterior que aún envía los colores: se descartan sin error y no se publican.
  const settings = {
    ...snapshot.config,
    storeName: 'Tienda Smoke',
    primaryColor: '#123456',
    secondaryColor: '#654321',
    logoUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
    sideNavigation: 'TV y audio, Cocina',
    shippingPageEnabled: false,
    privacyContent: 'Privacidad contractual',
  };
  snapshot.config = settings;
  snapshot = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify(snapshot),
  });
  const publicSettings = await request('/bff/content/settings');
  if (
    publicSettings.storeName !== 'Tienda Smoke' ||
    publicSettings.privacyContent !== 'Privacidad contractual'
  )
    throw new Error('CMS Admin no llegó al Storefront');
  if (coloresDeContenido(publicSettings).length || coloresDeContenido(snapshot.config).length)
    throw new Error('El PUT del snapshot con primaryColor y secondaryColor no debe publicarlos (AC-22)');
  if (
    publicSettings.logoUrl !== settings.logoUrl ||
    publicSettings.sideNavigation !== 'TV y audio, Cocina' ||
    publicSettings.shippingPageEnabled !== false
  )
    throw new Error('Configuración pública incompleta');

  // Lote 15 (ADR-0021): listas de Contenido. La semilla ya no trae los campos de texto de antes.
  if (
    ['contactEmail', 'contactPhone', 'headerMessage', 'topNavigation'].some(
      (campo) => campo in publicSettings,
    ) ||
    !Array.isArray(publicSettings.contactEmails) ||
    !Array.isArray(publicSettings.contactPhones) ||
    !Array.isArray(publicSettings.socialLinks) ||
    !Array.isArray(publicSettings.announcements) ||
    !Array.isArray(publicSettings.quickLinks)
  )
    throw new Error(
      'Contenido debe publicar correos, teléfonos, redes, avisos y accesos inferiores como listas',
    );
  const listas = {
    contactEmails: [
      { value: 'contacto@webstore.demo', label: '' },
      { value: 'ventas@webstore.demo', label: 'Ventas' },
    ],
    contactPhones: [{ value: '+51 999 000 000', label: '' }],
    socialLinks: [{ label: 'Instagram', url: 'https://www.instagram.com/webstore' }],
    announcements: [
      { text: 'Mantenimiento el domingo', url: '' },
      { text: 'Ofertas de verano', url: '/catalogo' },
    ],
    quickLinks: [{ group: 'Ayuda', label: 'Contacto', url: '/info/contacto' }],
  };
  for (const [clave, invalida] of [
    ['contactEmails', [{ value: 'no-es-correo', label: '' }]],
    ['contactPhones', [{ value: 'llámanos', label: '' }]],
    ['socialLinks', [{ label: 'X', url: 'http://x.com/webstore' }]],
    ['announcements', [{ text: 'Aviso', url: 'javascript:alert(1)' }]],
    ['quickLinks', [{ group: 'Ayuda', label: 'Contacto', url: '' }]],
  ]) {
    const rechazo = await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({ revision: snapshot.revision, config: { [clave]: invalida } }),
    });
    const problema = await esperarError(rechazo, 400, 'INVALID_COLLECTION', `Lista ${clave} no válida`);
    if (problema.details?.field !== clave)
      throw new Error(`El rechazo de ${clave} debe nombrar el campo en details.field`);
  }
  snapshot = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({ revision: snapshot.revision, config: listas }),
  });
  const conListas = await request('/bff/content/settings');
  for (const [clave, valor] of Object.entries(listas))
    if (JSON.stringify(conListas[clave]) !== JSON.stringify(valor))
      throw new Error(`Contenido no publica ${clave} tal como se guardó`);

  // Lote 16 (ADR-0021, PBI-0179): dónde van los sugeridos al agregar al carrito. Por defecto, el diálogo.
  if (conListas.addToCartDisplay !== 'dialog')
    throw new Error('Contenido debe publicar addToCartDisplay, con «dialog» por defecto');
  const lugarInvalido = await raw('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({ revision: snapshot.revision, config: { addToCartDisplay: 'modal' } }),
  });
  const problemaDeLugar = await esperarError(
    lugarInvalido,
    400,
    'INVALID_COLLECTION',
    'addToCartDisplay no válido',
  );
  if (problemaDeLugar.details?.field !== 'addToCartDisplay')
    throw new Error('El rechazo de addToCartDisplay debe nombrar el campo en details.field');
  snapshot = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({ revision: snapshot.revision, config: { addToCartDisplay: 'side-panel' } }),
  });
  if ((await request('/bff/content/settings')).addToCartDisplay !== 'side-panel')
    throw new Error('Contenido no publica addToCartDisplay tal como se guardó');
  snapshot = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({ revision: snapshot.revision, config: { addToCartDisplay: 'dialog' } }),
  });

  // Lote 24 (ADR-0026, PBI-0214; provisional): la imagen del banner se carga como archivo y la tienda la pide por la
  // dirección del BFF, con su versión.
  const imagenDeBanner = dataUrl('webp', webp(2560, 1024));
  snapshot.banners[0] = {
    ...snapshot.banners[0],
    title: 'Campaña de prueba',
    imageUrl: imagenDeBanner,
    imageFit: 'cover',
    imageTone: 'dark',
    imageFocusY: 120,
    ctaUrl: '/catalogo?categoria=cat-tv',
  };
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify(snapshot),
  });
  const publicBanners = await request('/bff/content/banners');
  const campaign = publicBanners.find((banner) => banner.id === snapshot.banners[0].id);
  if (
    campaign?.title !== 'Campaña de prueba' ||
    campaign.imageFit !== 'cover' ||
    campaign.imageTone !== 'dark' ||
    campaign.imageFocusY !== 100 ||
    campaign.ctaUrl !== '/catalogo?categoria=cat-tv' ||
    !/^\/bff\/images\/banners\/[^/]+\/image\?v=[A-Za-z0-9_-]{12}$/.test(campaign.imageUrl)
  )
    throw new Error('Banner o presentación de imagen no llegó al Storefront');
  const imagenServida = await raw(campaign.imageUrl);
  if (
    imagenServida.status !== 200 ||
    imagenServida.headers.get('content-type') !== 'image/webp' ||
    dataUrl('webp', Buffer.from(await imagenServida.arrayBuffer())) !== imagenDeBanner
  )
    throw new Error('PBI-0214: GET /bff/images no sirve la imagen cargada del banner');
  await esperarError(
    await raw('/bff/images/banners/no-existe/image'),
    404,
    'IMAGE_NOT_FOUND',
    'PBI-0214: la imagen de un banner que no existe',
  );

  // Lote 24 (PBI-0214 y PBI-0221; provisional): una URL nueva en lugar de la imagen y una vigencia sin hora se rechazan.
  let bannerSnapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  for (const [cambio, campo] of [
    [{ imageUrl: 'https://example.com/banner.jpg' }, 'imageUrl'],
    [{ startAt: '2026-12-01' }, 'startAt'],
  ]) {
    const rechazo = await esperarError(
      await raw('/bff/admin/snapshot', {
        method: 'PUT',
        headers: { ...authorization(owner.token), 'content-type': 'application/json' },
        body: JSON.stringify({
          revision: bannerSnapshot.revision,
          banners: { upsert: [{ id: campaign.id, ...cambio }] },
        }),
      }),
      400,
      'INVALID_COLLECTION',
      `PBI-0214 y PBI-0221: el banner con ${campo} no válido`,
    );
    if (rechazo.details?.field !== campo) throw new Error(`El rechazo debe señalar ${campo}`);
  }

  // Lote 12 (PBI-0184, provisional): dos botones opcionales por banner, cada uno con su texto y su enlace.
  const conBotones = await raw('/bff/admin/snapshot', {
    method: 'PUT',
    headers: { ...authorization(owner.token), 'content-type': 'application/json' },
    body: JSON.stringify({
      revision: bannerSnapshot.revision,
      banners: {
        upsert: [
          {
            id: campaign.id,
            secondaryCta: 'Ver ofertas',
            secondaryCtaUrl: 'https://example.com/ofertas',
          },
        ],
      },
    }),
  });
  if (conBotones.status !== 200)
    throw new Error(`PBI-0184: el botón secundario no se guardó (${conBotones.status})`);
  const conSecundario = (await request('/bff/content/banners')).find((banner) => banner.id === campaign.id);
  if (
    conSecundario?.secondaryCtaLabel !== 'Ver ofertas' ||
    conSecundario.secondaryCtaUrl !== 'https://example.com/ofertas' ||
    typeof conSecundario.ctaLabel !== 'string'
  )
    throw new Error('PBI-0184: el banner público no trae los dos botones');
  bannerSnapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  const aMedias = await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: { ...authorization(owner.token), 'content-type': 'application/json' },
      body: JSON.stringify({
        revision: bannerSnapshot.revision,
        banners: { upsert: [{ id: campaign.id, secondaryCtaUrl: '' }] },
      }),
    }),
    400,
    'INVALID_COLLECTION',
    'PBI-0184: un botón con texto y sin enlace',
  );
  if (aMedias.details?.field !== 'secondaryCtaUrl')
    throw new Error('PBI-0184: el error de un botón sin enlace debe señalar secondaryCtaUrl');

  // Roles fijos: el Admin envía solo las colecciones que cambió, así que las pruebas hacen lo mismo.
  const put = (session, update) =>
    raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: { ...authorization(session.token), 'content-type': 'application/json' },
      body: JSON.stringify(update),
    });

  // Permisos de los roles (lote 07, PBI-0013, confirmados por Daniel el 2026-11-18): el vendedor crea y modifica
  // productos sin eliminarlos; el administrador gestiona solo a los vendedores y no tiene Contenido. Lote 11 (PBI-0170,
  // provisional): el vendedor gestiona el inventario y ve los pedidos (`orders.view`) sin cambiar su estado.
  const seller = await adminLogin('catalogo@webstore.demo', 'Catalogo#2026');
  let sellerSnapshot = await request('/bff/admin/snapshot', { headers: authorization(seller.token) });
  if (
    seller.user.role !== 'vendedor' ||
    sellerSnapshot.users.length ||
    sellerSnapshot.rates.length ||
    sellerSnapshot.customers.length
  )
    throw new Error('El vendedor recibió colecciones fuera de su rol');
  if (!sellerSnapshot.orders.some((item) => item.id === order.id))
    throw new Error('PBI-0170: el vendedor debe ver los pedidos');
  if (!sellerSnapshot.roles.find((role) => role.id === 'vendedor').permissions.includes('orders.view'))
    throw new Error('PBI-0170: el rol vendedor debe publicar orders.view');
  if (sellerSnapshot.roles?.map((role) => role.id).join() !== 'superadmin,admin,vendedor')
    throw new Error('El snapshot no publica los roles fijos');
  await esperarError(
    await put(seller, {
      revision: sellerSnapshot.revision,
      products: { remove: [sellerSnapshot.products[0].id] },
    }),
    403,
    'CATALOG_SCOPE_VIOLATION',
    'El vendedor elimina un producto',
  );
  await esperarError(
    await put(seller, { revision: sellerSnapshot.revision, products: sellerSnapshot.products.slice(1) }),
    403,
    'CATALOG_SCOPE_VIOLATION',
    'El vendedor envía el catálogo sin un producto',
  );
  const sellerCategories = await put(seller, {
    revision: sellerSnapshot.revision,
    categories: sellerSnapshot.categories,
  });
  if (sellerCategories.status !== 403) throw new Error('El vendedor pudo modificar categorías');
  await esperarError(
    await put(seller, {
      revision: sellerSnapshot.revision,
      orders: { upsert: [{ id: order.id, status: 'processing' }] },
    }),
    403,
    'INSUFFICIENT_ROLE',
    'El vendedor cambia un pedido',
  );
  const sellerProduct = {
    ...sellerSnapshot.products[0],
    // Lote 24 (PBI-0214): un producto nuevo llega con su imagen y su miniatura cargadas.
    ...imagenesDeProducto(),
    id: 'p-smoke-vendedor',
    name: 'Producto creado por el vendedor',
    sku: 'SMOKE-VENDEDOR',
    // Lote 25 (ADR-0026): la foto de la galería se carga como archivo.
    gallery: [dataUrl('png', png(64, 48))],
    price: 1,
  };
  const sellerCreate = await put(seller, {
    revision: sellerSnapshot.revision,
    products: { upsert: [sellerProduct] },
  });
  if (!sellerCreate.ok) throw new Error(`El vendedor no pudo crear un producto: ${sellerCreate.status}`);
  sellerSnapshot = await sellerCreate.json();
  const sellerEdit = await put(seller, {
    revision: sellerSnapshot.revision,
    products: { upsert: [{ id: sellerProduct.id, price: 2 }] },
  });
  if (!sellerEdit.ok) throw new Error(`El vendedor no pudo cambiar el precio: ${sellerEdit.status}`);
  const creadoPorVendedor = (await request('/bff/catalog/products')).find(
    (item) => item.id === sellerProduct.id,
  );
  if (creadoPorVendedor?.images.length !== 2 || creadoPorVendedor.price !== 2)
    throw new Error('El producto del vendedor no llegó a la tienda con su precio y sus fotos');

  const manager = await adminLogin('admin@webstore.demo', 'Admin#2026');
  let managerSnapshot = await request('/bff/admin/snapshot', { headers: authorization(manager.token) });
  if (
    manager.user.role !== 'admin' ||
    !managerSnapshot.rates.length ||
    managerSnapshot.users.map((user) => user.role).join() !== 'vendedor'
  )
    throw new Error('El rol Administrador no recibe lo que le corresponde');
  await esperarError(
    await put(manager, { revision: managerSnapshot.revision, users: [] }),
    403,
    'USER_SCOPE_VIOLATION',
    'El Administrador reemplaza la lista de usuarios',
  );
  await esperarError(
    await put(manager, {
      revision: managerSnapshot.revision,
      users: { upsert: [{ id: managerSnapshot.users[0].id, role: 'admin' }] },
    }),
    403,
    'USER_SCOPE_VIOLATION',
    'El Administrador asciende a un vendedor',
  );
  await esperarError(
    await put(manager, {
      revision: managerSnapshot.revision,
      users: { remove: [managerSnapshot.users[0].id] },
    }),
    403,
    'USER_SCOPE_VIOLATION',
    'El Administrador elimina a un vendedor',
  );
  await esperarError(
    await put(manager, { revision: managerSnapshot.revision, config: { storeName: 'Otra' } }),
    403,
    'INSUFFICIENT_ROLE',
    'El Administrador cambia Contenido',
  );
  const managerSeller = await put(manager, {
    revision: managerSnapshot.revision,
    users: {
      upsert: [
        {
          id: 'u-smoke-vendedor',
          name: 'Vendedor del administrador',
          email: 'vendedor-smoke@webstore.demo',
          role: 'vendedor',
          active: false,
          temporaryPassword: 'Temporal1234',
        },
      ],
    },
  });
  if (!managerSeller.ok)
    throw new Error(`El Administrador no pudo crear un vendedor: ${managerSeller.status}`);
  managerSnapshot = await managerSeller.json();
  const managerReset = await raw('/bff/admin/reset', {
    method: 'POST',
    headers: authorization(manager.token),
    body: '{}',
  });
  if (managerReset.status !== 403) throw new Error('El Administrador pudo reiniciar la tienda');
  const managerRates = await put(manager, {
    revision: managerSnapshot.revision,
    rates: managerSnapshot.rates.map((rate) => ({ ...rate, price: rate.price + 1 })),
  });
  if (!managerRates.ok) throw new Error('El Administrador no pudo ajustar tarifas');
  managerSnapshot = await managerRates.json();
  const managerDelete = await put(manager, {
    revision: managerSnapshot.revision,
    products: { remove: [sellerProduct.id] },
  });
  if (!managerDelete.ok)
    throw new Error(`El Administrador no pudo eliminar un producto: ${managerDelete.status}`);

  const superSnapshot = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  const invalidRole = await put(owner, {
    revision: superSnapshot.revision,
    users: superSnapshot.users.map((user) => (user.role === 'vendedor' ? { ...user, role: 'owner' } : user)),
  });
  if (invalidRole.status !== 400) throw new Error('El BFF aceptó un rol fuera de los fijos');
  const lockout = await put(owner, {
    revision: superSnapshot.revision,
    users: superSnapshot.users.map((user) => ({
      ...user,
      role: user.role === 'superadmin' ? 'admin' : user.role,
    })),
  });
  if (lockout.status !== 409) throw new Error('El BFF permitió quedarse sin superadministrador');

  // Guardado del Admin (PBI-0089 y PBI-0095): todo o nada, y cada colección validada antes de aplicar.
  const precioAntes = (await request('/bff/catalog/products'))[0].price;
  const rechazado = await put(owner, {
    revision: superSnapshot.revision,
    products: superSnapshot.products.map((item, index) => (index === 0 ? { ...item, price: 1 } : item)),
    users: [],
  });
  if (rechazado.status !== 409) throw new Error('Un guardado sin superadministrador debe responder 409');
  if ((await request('/bff/catalog/products'))[0].price !== precioAntes)
    throw new Error('Un guardado rechazado dejó aplicado el precio');
  for (const [cambio, contexto] of [
    [{ rates: 'x' }, 'Tarifas que no son una lista'],
    [{ config: null }, 'Configuración nula'],
    [
      { products: superSnapshot.products.map((item, i) => (i ? item : { ...item, stock: -1 })) },
      'Stock negativo',
    ],
    [{ orders: [{ id: 'WS-1', status: 'lo-que-sea' }] }, 'Estado de pedido desconocido'],
  ]) {
    const error = await esperarError(
      await put(owner, { revision: superSnapshot.revision, ...cambio }),
      400,
      'INVALID_COLLECTION',
      contexto,
    );
    if (!error.details?.collection) throw new Error(`${contexto}: INVALID_COLLECTION sin details.collection`);
  }
  // PBI-0148 (lote 07): una categoría nueva con la dirección de otra se rechaza.
  const categoriaRepetida = await esperarError(
    await put(owner, {
      revision: superSnapshot.revision,
      categories: { upsert: [{ id: 'cat-smoke', name: superSnapshot.categories[0].name.toUpperCase() }] },
    }),
    400,
    'INVALID_COLLECTION',
    'Categoría con la dirección de otra',
  );
  if (categoriaRepetida.details?.field !== 'slug')
    throw new Error('La categoría repetida no se rechazó por su dirección (details.field: slug)');
  await esperarError(
    await put(owner, { revision: superSnapshot.revision, complaints: [] }),
    409,
    'COMPLAINTS_READ_ONLY',
    'Borrar las reclamaciones',
  );
  const respondido = await put(owner, {
    revision: superSnapshot.revision,
    complaints: superSnapshot.complaints.map((item) =>
      item.id === complaint.id
        ? { ...item, status: 'resolved', providerResponse: 'Atendido', amount: 1 }
        : item,
    ),
  });
  const reclamoRespondido = (await respondido.json()).complaints.find((item) => item.id === complaint.id);
  if (
    reclamoRespondido?.status !== 'resolved' ||
    reclamoRespondido.providerResponse !== 'Atendido' ||
    reclamoRespondido.amount !== 100
  )
    throw new Error('El Admin debe responder la reclamación sin cambiar su monto');

  // Apariencia y temas (TEST-13): rutas públicas, rutas del Admin con `themes.manage`, revisión propia y caché.
  const temas = (session, path = '', options = {}) =>
    raw(`/bff/admin/${path || 'themes'}`, {
      ...options,
      headers: { ...(session ? authorization(session.token) : {}), ...(options.headers ?? {}) },
    });
  const coloresB = {
    primary: '#1D4ED8',
    secondary: '#C2410C',
    background: '#F3F5F8',
    surface: '#FFFFFF',
    contrast: '#0F172A',
  };
  const hoja = (headers = {}) => raw('/bff/appearance/theme.css', { headers });

  const aparienciaPublica = await request('/bff/appearance');
  if (
    aparienciaPublica.demoMode !== false ||
    aparienciaPublica.testCredentials !== false ||
    aparienciaPublica.activeThemeId !== 'b' ||
    aparienciaPublica.themes.map((tema) => tema.id).join() !== 'b' ||
    aparienciaPublica.themes[0].tokens['--ws-primary'].toUpperCase() !== '#1D4ED8'
  )
    throw new Error('Fuera del modo demo, /bff/appearance debe traer solo el tema activo (B)');

  const primeraHoja = await hoja();
  const etagB = primeraHoja.headers.get('etag');
  const cuerpoB = await primeraHoja.text();
  if (
    primeraHoja.status !== 200 ||
    primeraHoja.headers.get('content-type') !== 'text/css; charset=utf-8' ||
    primeraHoja.headers.get('cache-control') !== 'no-cache' ||
    primeraHoja.headers.get('x-content-type-options') !== 'nosniff' ||
    /(^|,\s*)Cookie(\s*,|$)/i.test(primeraHoja.headers.get('vary') ?? '') ||
    !/^"[^"]+"$/.test(etagB ?? '')
  )
    throw new Error(
      'theme.css debe responder text/css con no-cache, nosniff, un ETag entre comillas y, fuera del modo demo, sin Vary: Cookie',
    );
  const declaraciones =
    cuerpoB
      .match(/^:root:root \{\n([\s\S]*)\}\n$/)?.[1]
      .trim()
      .split('\n') ?? [];
  if (
    !declaraciones.length ||
    !declaraciones.every((linea) => /^ {0,2}--ws-[a-z0-9-]+: [^;{}]+;$/.test(linea.trim()))
  )
    throw new Error('theme.css debe ser un único bloque :root:root solo con declaraciones --ws-*');
  if (!/--ws-primary: #1D4ED8;/i.test(cuerpoB)) throw new Error('theme.css no sirve el tema activo B');
  // Lienzo de la tienda (ADR-0013): una clave más en Tema.tokens y una declaración más, justo antes de --ws-bg.
  if (aparienciaPublica.themes[0].tokens['--ws-store-bg'] !== '#f9fafc')
    throw new Error('/bff/appearance debe traer tokens["--ws-store-bg"] igual a #f9fafc con B');
  const lineaDelLienzo = declaraciones.indexOf('  --ws-store-bg: #f9fafc;');
  if (
    declaraciones.length !== 38 ||
    lineaDelLienzo < 0 ||
    declaraciones[lineaDelLienzo + 1] !== '  --ws-bg: #f3f5f8;' ||
    !declaraciones.includes('  --ws-border-strong: #8894a6;')
  )
    throw new Error(
      'theme.css de B debe tener 38 declaraciones, --ws-store-bg: #f9fafc justo antes de --ws-bg: #f3f5f8 y --ws-border-strong: #8894a6',
    );
  // Texto sobre el enlace (ADR-0014): una clave más en Tema.tokens y una declaración más, justo después de --ws-link.
  if (aparienciaPublica.themes[0].tokens['--ws-on-link'] !== '#ffffff')
    throw new Error('/bff/appearance debe traer tokens["--ws-on-link"] igual a #ffffff con B');
  const lineaDelEnlace = declaraciones.indexOf('  --ws-link: var(--ws-primary);');
  if (lineaDelEnlace < 0 || declaraciones[lineaDelEnlace + 1] !== '  --ws-on-link: #ffffff;')
    throw new Error('theme.css de B debe declarar --ws-on-link: #ffffff justo después de --ws-link');
  // Error y alerta (ADR-0019): cinco claves más en Tema.tokens y cinco declaraciones, justo después de --ws-on-topbar,
  // con los valores que tokens.css fijaba antes en B.
  const avisosDeB = [
    '  --ws-danger: #b42318;',
    '  --ws-danger-soft: #fef3f2;',
    '  --ws-danger-line: #fecdca;',
    '  --ws-warning: #8a4b08;',
    '  --ws-warning-soft: #fff6e5;',
  ];
  const lineaDeLaFranja = declaraciones.indexOf('  --ws-on-topbar: #ffffff;');
  if (
    lineaDeLaFranja < 0 ||
    declaraciones.slice(lineaDeLaFranja + 1, lineaDeLaFranja + 6).join('|') !== avisosDeB.join('|') ||
    aparienciaPublica.themes[0].tokens['--ws-danger'] !== '#b42318'
  )
    throw new Error('theme.css de B debe declarar el error y la alerta de B justo después de --ws-on-topbar');
  // Borde del acento (ADR-0023, PBI-0189): una clave más en Tema.tokens y una declaración más, justo después de
  // --ws-on-accent; en B es el propio acento.
  const lineaDelAcento = declaraciones.indexOf('  --ws-on-accent: #ffffff;');
  if (
    aparienciaPublica.themes[0].tokens['--ws-accent-line'] !== 'var(--ws-accent)' ||
    lineaDelAcento < 0 ||
    declaraciones[lineaDelAcento + 1] !== '  --ws-accent-line: var(--ws-accent);'
  )
    throw new Error(
      'theme.css de B debe declarar --ws-accent-line: var(--ws-accent) justo después de --ws-on-accent',
    );
  const revalidada = await hoja({ 'if-none-match': etagB });
  if (revalidada.status !== 304 || (await revalidada.text()) !== '')
    throw new Error('theme.css con If-None-Match igual al ETag debe responder 304 sin cuerpo');
  const conCookie = await hoja({ cookie: 'ws_tema_vista_previa=c' });
  if (conCookie.headers.get('etag') !== etagB || (await conCookie.text()) !== cuerpoB)
    throw new Error('Fuera del modo demo, theme.css debe ignorar la cookie de la vista previa');

  // Sin sesión: 401 en las cinco rutas del Admin. Con `admin` y `vendedor`: 403 INSUFFICIENT_ROLE.
  const rutasDeTemas = [
    ['GET', 'themes'],
    ['POST', 'themes'],
    ['PUT', 'themes/x'],
    ['DELETE', 'themes/x?revision=0'],
    ['PUT', 'active-theme'],
  ];
  for (const [method, path] of rutasDeTemas) {
    const body = method === 'POST' || method === 'PUT' ? '{}' : undefined;
    await esperarError(
      await temas(null, path, { method, body }),
      401,
      'ADMIN_AUTHENTICATION_REQUIRED',
      `${method} /bff/admin/${path} sin sesión`,
    );
    for (const session of [manager, seller])
      await esperarError(
        await temas(session, path, { method, body }),
        403,
        'INSUFFICIENT_ROLE',
        `${method} /bff/admin/${path} con ${session.user.role}`,
      );
  }

  const listaInicial = await request('/bff/admin/themes', { headers: authorization(owner.token) });
  if (
    typeof listaInicial.revision !== 'number' ||
    listaInicial.activeThemeId !== 'b' ||
    listaInicial.themes
      .slice(0, 3)
      .map((tema) => `${tema.id}:${tema.kind}`)
      .join() !== 'a:predefined,b:predefined,c:predefined'
  )
    throw new Error('GET /bff/admin/themes debe traer la revisión, el activo B y los predefinidos A, B y C');
  // Lote 20 (ADR-0023): el botón secundario de C con el puntero encima se aclara hacia el blanco; antes era la mezcla
  // del grafito con el grafito, igual al secundario.
  if (listaInicial.themes[2].tokens['--ws-accent-strong'] !== 'color-mix(in srgb, #1F2328 90%, #FFFFFF)')
    throw new Error('El --ws-accent-strong de C debe ser color-mix(in srgb, #1F2328 90%, #FFFFFF)');
  if (
    listaInicial.themes
      .slice(0, 3)
      .map((tema) => tema.tokens['--ws-store-bg'])
      .join() !== '#FAFAFB,#f9fafc,#F9F9FA'
  )
    throw new Error('GET /bff/admin/themes debe traer el lienzo de la tienda de A, B y C');
  const crearTema = (entrada) => temas(owner, 'themes', { method: 'POST', body: JSON.stringify(entrada) });
  let revisionDeTemas = listaInicial.revision;

  await esperarError(
    await crearTema({ revision: revisionDeTemas, name: '   ', colors: coloresB }),
    400,
    'INVALID_THEME_NAME',
    'Nombre vacío',
  );
  const colorInvalido = await esperarError(
    await crearTema({
      revision: revisionDeTemas,
      name: 'Smoke',
      colors: { ...coloresB, surface: 'rgb(0,0,0)' },
    }),
    400,
    'INVALID_THEME_COLOR',
    'Color inválido',
  );
  if (colorInvalido.details?.field !== 'surface') throw new Error('INVALID_THEME_COLOR no indica el campo');
  const sinContraste = await esperarError(
    await crearTema({
      revision: revisionDeTemas,
      name: 'Smoke',
      colors: { ...coloresB, contrast: '#FFFFFF' },
    }),
    400,
    'INSUFFICIENT_THEME_CONTRAST',
    'Contraste insuficiente',
  );
  const parBloqueante = sinContraste.details?.pairs?.find((par) => par.pair === 'contrast/background');
  if (!parBloqueante || parBloqueante.minimum !== 4.5 || !(parBloqueante.ratio < 4.5))
    throw new Error('INSUFFICIENT_THEME_CONTRAST no trae el par, la relación y el mínimo');
  await esperarError(
    await crearTema({ revision: revisionDeTemas, name: ' azul COBALTO ', colors: coloresB }),
    409,
    'THEME_NAME_TAKEN',
    'Nombre de un predefinido',
  );

  // Dos guardados sobre la misma revisión: el segundo recibe STALE_THEMES y no cambia nada.
  const creado = await crearTema({ revision: revisionDeTemas, name: 'Tema smoke', colors: coloresB });
  if (creado.status !== 201) throw new Error(`Crear un tema debe responder 201; llegó ${creado.status}`);
  const trasCrear = await creado.json();
  const propio = trasCrear.themes.find((tema) => tema.name === 'Tema smoke');
  if (
    !propio ||
    propio.kind !== 'custom' ||
    trasCrear.activeThemeId !== 'b' ||
    trasCrear.revision !== revisionDeTemas + 1
  )
    throw new Error('El tema creado no aparece como propio, quedó activo o no subió la revisión');
  await esperarError(
    await crearTema({ revision: revisionDeTemas, name: 'Tema smoke 2', colors: coloresB }),
    409,
    'STALE_THEMES',
    'Segundo guardado sobre la misma revisión',
  );
  const trasConflicto = await request('/bff/admin/themes', { headers: authorization(owner.token) });
  if (
    trasConflicto.revision !== trasCrear.revision ||
    trasConflicto.themes.some((tema) => tema.name === 'Tema smoke 2')
  )
    throw new Error('Un guardado con STALE_THEMES cambió los temas');
  revisionDeTemas = trasCrear.revision;

  const editar = (id, entrada) =>
    temas(owner, `themes/${id}`, { method: 'PUT', body: JSON.stringify(entrada) });
  const editado = await editar(propio.id, {
    revision: revisionDeTemas,
    name: 'Tema smoke editado',
    colors: { ...coloresB, primary: '#123456' },
  });
  if (editado.status !== 200)
    throw new Error(`Editar un tema propio debe responder 200; llegó ${editado.status}`);
  revisionDeTemas = (await editado.json()).revision;
  await esperarError(
    await editar('b', { revision: revisionDeTemas, name: 'Otro', colors: coloresB }),
    409,
    'PREDEFINED_THEME_READ_ONLY',
    'Editar un predefinido',
  );
  await esperarError(
    await editar('no-existe', { revision: revisionDeTemas, name: 'Otro', colors: coloresB }),
    404,
    'THEME_NOT_FOUND',
    'Editar un tema inexistente',
  );

  const activar = (themeId, revision = revisionDeTemas) =>
    temas(owner, 'active-theme', { method: 'PUT', body: JSON.stringify({ revision, themeId }) });
  await esperarError(await activar('no-existe'), 404, 'THEME_NOT_FOUND', 'Activar un tema inexistente');
  const activado = await activar(propio.id);
  if (activado.status !== 200)
    throw new Error(`Activar un tema debe responder 200; llegó ${activado.status}`);
  const trasActivar = await activado.json();
  if (trasActivar.activeThemeId !== propio.id) throw new Error('El tema propio no quedó activo');
  revisionDeTemas = trasActivar.revision;

  const hojaNueva = await hoja({ 'if-none-match': etagB });
  const etagNuevo = hojaNueva.headers.get('etag');
  if (hojaNueva.status !== 200 || !etagNuevo || etagNuevo === etagB)
    throw new Error('Tras activar otro tema, theme.css debe responder 200 con otro ETag');
  const cuerpoPropio = await hojaNueva.text();
  if (!cuerpoPropio.includes('--ws-primary: #123456;'))
    throw new Error('theme.css no sirve el tema recién activado');
  if (!cuerpoPropio.includes('  --ws-store-bg: #F3F5F8;\n  --ws-bg: #f3f5f8;\n'))
    throw new Error('Un tema propio con la base de B pinta el lienzo de la tienda con su fondo principal');
  if ((await request('/bff/appearance')).activeThemeId !== propio.id)
    throw new Error('/bff/appearance no refleja el tema activado');

  const borrar = (id, revision = revisionDeTemas) =>
    temas(owner, `themes/${id}${revision === null ? '' : `?revision=${revision}`}`, { method: 'DELETE' });
  const enUso = await esperarError(
    await borrar(propio.id),
    409,
    'ACTIVE_THEME_IN_USE',
    'Borrar el tema activo',
  );
  if (enUso.message !== 'Activa otro tema antes de borrar este.')
    throw new Error('ACTIVE_THEME_IN_USE no pide activar otro tema antes');
  await esperarError(await borrar('a'), 409, 'PREDEFINED_THEME_READ_ONLY', 'Borrar un predefinido');
  await esperarError(await borrar('no-existe'), 404, 'THEME_NOT_FOUND', 'Borrar un tema inexistente');
  await esperarError(await borrar(propio.id, null), 409, 'STALE_THEMES', 'Borrar sin revisión');

  const vueltaAB = await activar('b');
  if (vueltaAB.status !== 200) throw new Error('No se pudo volver a activar B');
  revisionDeTemas = (await vueltaAB.json()).revision;
  const borrado = await borrar(propio.id);
  if (borrado.status !== 200 || (await borrado.json()).themes.some((tema) => tema.id === propio.id))
    throw new Error('Borrar un tema propio que no es el activo debe responder 200 y quitarlo');
  if ((await hoja({ 'if-none-match': etagB })).status !== 304)
    throw new Error('Con B activo otra vez, theme.css debe volver al ETag de B');

  const rates = await request('/bff/shipping/rates');
  if (!rates.length) throw new Error('Tarifas compartidas vacías');

  // Entrada HTTP (lote 01): slug inexistente, URI mal codificada y cuerpo que no es un objeto.
  await esperarError(
    await raw('/bff/catalog/products/no-existe'),
    404,
    'PRODUCT_NOT_FOUND',
    'Slug inexistente',
  );
  const fichaPublica = await request(`/bff/catalog/products/${products[0].slug}`);
  if (fichaPublica.id !== products[0].id) throw new Error('La ficha por slug no devuelve el producto');
  await esperarError(await raw('/bff/orders/%E0%A4%A'), 400, 'INVALID_PATH', 'URI mal codificada');
  await esperarError(
    await raw('/bff/checkout/orders', { method: 'POST', body: 'null' }),
    400,
    'INVALID_BODY',
    'Cuerpo null',
  );
  await esperarError(
    await raw('/bff/checkout/orders', { method: 'POST', body: '{' }),
    400,
    'INVALID_JSON',
    'Cuerpo que no es JSON',
  );

  // Checkout (PBI-0096): fecha desde la primera que permite la tienda (lote 17, PBI-0178: por defecto, mañana en
  // Lima), método de pago ofrecido, cantidad entera y lista blanca.
  const checkoutCon = (cambios) =>
    raw('/bff/checkout/orders', { method: 'POST', body: JSON.stringify({ ...command, ...cambios }) });
  await esperarError(
    await checkoutCon({ deliveryDate: fechaDeLima(-1) }),
    400,
    'INVALID_DELIVERY_DATE',
    'Fecha pasada',
  );
  const deHoy = await esperarError(
    await checkoutCon({ deliveryDate: fechaDeLima(0) }),
    400,
    'INVALID_DELIVERY_DATE',
    'Hoy, con la primera fecha por defecto (mañana)',
  );
  if (deHoy.details?.minimum !== fechaDeLima(1))
    throw new Error('INVALID_DELIVERY_DATE debe traer la primera fecha en details.minimum');
  await esperarError(
    await checkoutCon({ paymentMethod: 'bitcoin' }),
    400,
    'INVALID_PAYMENT_METHOD',
    'Método de pago',
  );
  await esperarError(
    await checkoutCon({ items: [{ productId: products[0].id, quantity: 1.5 }] }),
    400,
    'INVALID_ORDER_ITEMS',
    'Cantidad decimal',
  );
  const conCamposDeMas = await checkoutCon({
    deliveryDate: fechaDeLima(1),
    customer: { ...command.customer, role: 'admin' },
    shipping: { ...command.shipping, price: 0 },
    items: [{ productId: products[0].id, quantity: 1 }],
  });
  if (conCamposDeMas.status !== 201)
    throw new Error(`Un pedido para la primera fecha debe aceptarse: ${conCamposDeMas.status}`);
  const pedidoFiltrado = await conCamposDeMas.json();
  if ('role' in pedidoFiltrado.customer || 'price' in pedidoFiltrado.shipping)
    throw new Error('El checkout guardó campos de más en customer o shipping');
  await request(`/bff/orders/${pedidoFiltrado.id}/cancel`, {
    method: 'PATCH',
    headers: { 'x-order-token': pedidoFiltrado.accessToken },
    body: '{}',
  });

  // Stock (lote 01): las líneas repetidas se suman y un producto inactivo no se vende.
  const conStock = (await request('/bff/catalog/products')).find((item) => item.stock >= 2);
  const repetidas = await raw('/bff/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      ...command,
      items: [
        { productId: conStock.id, quantity: conStock.stock },
        { productId: conStock.id, quantity: 1 },
      ],
    }),
  });
  const errorRepetidas = await esperarError(repetidas, 409, 'INSUFFICIENT_STOCK', 'Líneas repetidas');
  if (errorRepetidas.details?.productId !== conStock.id)
    throw new Error('INSUFFICIENT_STOCK no indica el producto');
  let catalogoAdmin = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  catalogoAdmin = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: catalogoAdmin.revision,
      products: catalogoAdmin.products.map((item) =>
        item.id === conStock.id ? { ...item, active: false } : item,
      ),
    }),
  });
  await esperarError(
    await raw('/bff/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({ ...command, items: [{ productId: conStock.id, quantity: 1 }] }),
    }),
    409,
    'PRODUCT_UNAVAILABLE',
    'Producto inactivo',
  );
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: catalogoAdmin.revision,
      products: catalogoAdmin.products.map((item) =>
        item.id === conStock.id ? { ...item, active: true } : item,
      ),
    }),
  });

  // Lote 07b (ADR-0017): actividad, notificaciones, perfil e imagen de categoría. Lote 13 (ADR-0021): sin latido ni
  // personas en línea (PBI-0172); la campana trae pedidos, reclamos y errores de compra (PBI-0173).
  await esperarError(
    await raw('/bff/visits', { method: 'POST', body: JSON.stringify({ visitId: 'smoke-pestana-0000001' }) }),
    404,
    'ROUTE_NOT_FOUND',
    'El latido de la tienda ya no existe (PBI-0172)',
  );
  owner = await adminLogin();
  const resumen07b = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  if ('onlineVisitors' in resumen07b || !Array.isArray(resumen07b.activity) || !resumen07b.activity.length)
    throw new Error('El snapshot del superadmin debe traer activity y no onlineVisitors');
  const vendedor07b = await adminLogin('catalogo@webstore.demo', 'Catalogo#2026');
  const resumenVendedor = await request('/bff/admin/snapshot', { headers: authorization(vendedor07b.token) });
  if ('onlineVisitors' in resumenVendedor || resumenVendedor.activity.length)
    throw new Error('El vendedor no debe recibir onlineVisitors ni activity');
  const campana = await request('/bff/admin/notifications', { headers: authorization(owner.token) });
  if (
    typeof campana.total !== 'number' ||
    !Array.isArray(campana.items) ||
    typeof campana.counts?.orders !== 'number' ||
    typeof campana.counts?.complaints !== 'number' ||
    typeof campana.counts?.checkoutErrors !== 'number'
  )
    throw new Error('GET /admin/notifications no tiene la forma { seenAt, total, counts, items }');
  // Los rechazos anteriores del checkout (producto inactivo, stock, total) son errores de compra del superadmin.
  if (!campana.counts.checkoutErrors || !campana.items.some((item) => item.type === 'checkout-error'))
    throw new Error('La campana del superadmin no trae los errores de compra');
  if (!campana.items.every((item) => ['order', 'complaint', 'checkout-error'].includes(item.type)))
    throw new Error('La campana trae un tipo de aviso desconocido');
  // PBI-0170: el vendedor ve los pedidos, así que también la campana de pedidos nuevos.
  const campanaVendedor = await raw('/bff/admin/notifications', {
    headers: authorization(vendedor07b.token),
  });
  if (campanaVendedor.status !== 200)
    throw new Error(`Notificaciones del vendedor: ${campanaVendedor.status}`);
  const avisosDelVendedor = await campanaVendedor.json();
  if (avisosDelVendedor.counts.checkoutErrors || avisosDelVendedor.counts.complaints)
    throw new Error('El vendedor solo recibe avisos de pedidos');
  await esperarError(
    await raw('/bff/admin/notifications/seen', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({ until: 'ayer' }),
    }),
    400,
    'INVALID_SEEN_AT',
    'Visto con una fecha inválida',
  );
  if (campana.items.length) {
    const vista = await request('/bff/admin/notifications/seen', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({ until: campana.items[0].at }),
    });
    if (vista.total !== 0) throw new Error('Tras marcar «visto» no deben quedar avisos nuevos');
  }
  const perfil07b = await request('/bff/admin/profile', {
    method: 'PATCH',
    headers: authorization(vendedor07b.token),
    body: JSON.stringify({ name: 'Vendedor Demo', email: 'catalogo@webstore.demo' }),
  });
  if (perfil07b.user.email !== 'catalogo@webstore.demo')
    throw new Error('PATCH /admin/profile no devolvió el usuario');
  await esperarError(
    await raw('/bff/admin/profile', {
      method: 'PATCH',
      headers: authorization(vendedor07b.token),
      body: JSON.stringify({ name: 'Vendedor Demo', email: 'owner@webstore.demo' }),
    }),
    409,
    'ADMIN_EMAIL_TAKEN',
    'Perfil con el correo de otro usuario',
  );
  await esperarError(
    await raw('/bff/admin/profile/password', {
      method: 'PUT',
      headers: authorization(vendedor07b.token),
      body: JSON.stringify({ currentPassword: 'NoEsLaClave1', newPassword: 'Catalogo#2027' }),
    }),
    400,
    'INVALID_CURRENT_PASSWORD',
    'Cambio de contraseña con la actual equivocada',
  );
  await esperarError(
    await raw('/bff/admin/profile/password', {
      method: 'PUT',
      headers: authorization(vendedor07b.token),
      body: JSON.stringify({ currentPassword: 'Catalogo#2026', newPassword: 'corta' }),
    }),
    400,
    'WEAK_PASSWORD',
    'Cambio de contraseña débil',
  );
  await esperarError(
    await raw('/bff/admin/profile', { method: 'PATCH', body: '{}' }),
    401,
    'ADMIN_AUTHENTICATION_REQUIRED',
    'Perfil sin sesión',
  );
  const conImagen = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  const categoria07b = conImagen.categories[0];
  // Lote 11 (PBI-0176): la imagen es la única versión, un PNG, JPG o WebP de 100 × 100 px.
  const imagen100 = dataUrl('png', png(100, 100));
  await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({
        revision: conImagen.revision,
        categories: { upsert: [{ id: categoria07b.id, imageUrl: dataUrl('png', png(160, 160)) }] },
      }),
    }),
    400,
    'INVALID_COLLECTION',
    'Imagen de la categoría que no es de 100 × 100 px',
  );
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: conImagen.revision,
      categories: { upsert: [{ id: categoria07b.id, imageUrl: imagen100 }] },
    }),
  });
  const publicas07b = await request('/bff/catalog/categories');
  // Lote 25 (ADR-0026): el catálogo publica la dirección de la imagen, no su Data URL, y el BFF la sirve.
  const direccion07b = publicas07b.find((item) => item.id === categoria07b.id).imageUrl;
  if (!/^\/bff\/images\/categories\/[^/]+\/image\?v=[A-Za-z0-9_-]{12}$/.test(direccion07b ?? ''))
    throw new Error('El catálogo no publica la dirección de la imagen de la categoría');
  const servida07b = await raw(direccion07b);
  if (
    servida07b.status !== 200 ||
    `data:${servida07b.headers.get('content-type')};base64,${Buffer.from(await servida07b.arrayBuffer()).toString('base64')}` !==
      imagen100
  )
    throw new Error('Lote 25: GET /bff/images no sirve la imagen de la categoría');
  if (publicas07b.some((item) => !('imageUrl' in item)))
    throw new Error('Cada categoría pública trae imageUrl');

  // Lote 17 (ADR-0021; provisional): primera fecha de entrega (PBI-0178), versiones de los términos (PBI-0177) y
  // calendario de días no laborables (PBI-0183).
  owner = await adminLogin();
  const manager17 = await adminLogin('admin@webstore.demo', 'Admin#2026');
  const primera = await request('/bff/checkout/delivery-dates');
  if (primera.minimum !== fechaDeLima(1))
    throw new Error(`GET /checkout/delivery-dates debe dar mañana en Lima por defecto: ${primera.minimum}`);
  let snapshot17 = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  if (
    snapshot17.config.firstDeliveryDay !== 'next-calendar-day' ||
    snapshot17.config.deliveryCutoffTime !== ''
  )
    throw new Error('La configuración debe traer la primera fecha de entrega por defecto');
  if (!Array.isArray(snapshot17.nonWorkingDates) || snapshot17.nonWorkingDates.length !== 0)
    throw new Error('El snapshot debe traer nonWorkingDates (vacía sin WEBSTORE_NON_WORKING_DATES)');
  const horaInvalida = await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({ revision: snapshot17.revision, config: { deliveryCutoffTime: '25:00' } }),
    }),
    400,
    'INVALID_COLLECTION',
    'Hora de corte no válida',
  );
  if (horaInvalida.details?.field !== 'deliveryCutoffTime')
    throw new Error('El rechazo de la hora de corte debe nombrar el campo');
  snapshot17 = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({ revision: snapshot17.revision, config: { firstDeliveryDay: 'same-day' } }),
  });
  if ((await request('/bff/checkout/delivery-dates')).minimum !== fechaDeLima(0))
    throw new Error('Con «el mismo día», la primera fecha es hoy');
  snapshot17 = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: snapshot17.revision,
      config: { firstDeliveryDay: 'next-calendar-day' },
    }),
  });
  // Días no laborables: solo el superadministrador; fechas válidas y sin repetir.
  const sinPermiso = await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(manager17.token),
      body: JSON.stringify({
        revision: snapshot17.revision,
        nonWorkingDates: { upsert: [{ id: 'nwd-smoke', date: '2026-12-25' }] },
      }),
    }),
    403,
    'INSUFFICIENT_ROLE',
    'El administrador no edita los días no laborables',
  );
  if (sinPermiso.details?.collection !== 'nonWorkingDates')
    throw new Error('El 403 de los días no laborables debe nombrar la colección');
  if (
    (await request('/bff/admin/snapshot', { headers: authorization(manager17.token) })).nonWorkingDates.length
  )
    throw new Error('El administrador no debe recibir los días no laborables');
  await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({
        revision: snapshot17.revision,
        nonWorkingDates: { upsert: [{ id: 'nwd-smoke', date: '2026-02-30' }] },
      }),
    }),
    400,
    'INVALID_COLLECTION',
    'Día no laborable con una fecha que no existe',
  );
  snapshot17 = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: snapshot17.revision,
      nonWorkingDates: { upsert: [{ id: 'nwd-smoke', date: '2026-12-25', name: ' Navidad ' }] },
    }),
  });
  if (
    JSON.stringify(snapshot17.nonWorkingDates) !==
    JSON.stringify([{ id: 'nwd-smoke', date: '2026-12-25', name: 'Navidad' }])
  )
    throw new Error('El día no laborable no se guardó como se envió');
  await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({
        revision: snapshot17.revision,
        nonWorkingDates: { upsert: [{ id: 'nwd-otro', date: '2026-12-25' }] },
      }),
    }),
    400,
    'INVALID_COLLECTION',
    'Día no laborable repetido',
  );
  snapshot17 = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({ revision: snapshot17.revision, nonWorkingDates: { remove: ['nwd-smoke'] } }),
  });
  // Versiones de los términos: el BFF numera, la tienda y el Admin ven la vigente y el checkout exige esa.
  const ajustes17 = await request('/bff/content/settings');
  if (ajustes17.termsVersion !== 1 || ajustes17.termsPublishedAt !== null)
    throw new Error('Los ajustes públicos deben traer la versión 1 de los términos, sin fecha');
  snapshot17 = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({
      revision: snapshot17.revision,
      config: { termsContent: `${ajustes17.termsContent} Texto nuevo.`, termsVersion: 7 },
    }),
  });
  if (snapshot17.config.termsVersion !== 2 || typeof snapshot17.config.termsPublishedAt !== 'string')
    throw new Error(
      'Un texto nuevo de los términos debe publicar la versión 2 con su fecha (y no la del Admin)',
    );
  if ((await request('/bff/content/settings')).termsVersion !== 2)
    throw new Error('La tienda debe recibir la versión vigente de los términos');
  const pedido17 = {
    ...command,
    deliveryDate: fechaDeLima(2),
    items: [{ productId: 'p-004', quantity: 1 }],
  };
  const terminosViejos = await esperarError(
    await raw('/bff/checkout/orders', { method: 'POST', body: JSON.stringify(pedido17) }),
    409,
    'TERMS_VERSION_CHANGED',
    'Términos aceptados en una versión anterior',
  );
  if (terminosViejos.details?.termsVersion !== 2)
    throw new Error('TERMS_VERSION_CHANGED debe traer la versión vigente');
  await esperarError(
    await raw('/bff/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({ ...pedido17, termsVersion: '2' }),
    }),
    400,
    'INVALID_TERMS_VERSION',
    'Versión de los términos que no es un número',
  );
  const conVersion2 = await request('/bff/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({ ...pedido17, termsVersion: 2 }),
  });
  snapshot17 = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  const pedidoDelAdmin = snapshot17.orders.find((item) => item.id === conVersion2.id);
  if (pedidoDelAdmin?.termsVersion !== 2 || pedidoDelAdmin.termsAcceptedAt !== conVersion2.createdAt)
    throw new Error('El pedido del Admin debe traer la versión aceptada y la fecha y hora de la aceptación');
  await request(`/bff/orders/${conVersion2.id}/cancel`, {
    method: 'PATCH',
    headers: { 'x-order-token': conVersion2.accessToken },
    body: '{}',
  });
  console.log('✓ Lote 17: primera fecha de entrega, días no laborables y versiones de los términos');

  // Lote 19 (ADR-0021, PBI-0006; provisional): una dirección por pedido (por defecto) o una por producto.
  let snapshot19 = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  if (snapshot19.config.deliveryAddressMode !== 'per-order')
    throw new Error('La configuración debe traer una dirección por pedido por defecto');
  if ((await request('/bff/content/settings')).deliveryAddressMode !== 'per-order')
    throw new Error('Los ajustes públicos deben traer deliveryAddressMode');
  const otraDireccion = {
    addressLine: 'Calle Regalo 456',
    district: 'Miraflores',
    province: 'Lima',
    department: 'Lima',
  };
  const pedido19 = {
    ...command,
    deliveryDate: fechaDeLima(2),
    termsVersion: 2,
    items: [
      { productId: 'p-004', quantity: 1 },
      { productId: 'p-005', quantity: 1, shipping: otraDireccion },
    ],
  };
  await esperarError(
    await raw('/bff/checkout/orders', { method: 'POST', body: JSON.stringify(pedido19) }),
    409,
    'PER_PRODUCT_ADDRESS_DISABLED',
    'Una dirección por producto con la tienda en una por pedido',
  );
  const modoInvalido = await esperarError(
    await raw('/bff/admin/snapshot', {
      method: 'PUT',
      headers: authorization(owner.token),
      body: JSON.stringify({ revision: snapshot19.revision, config: { deliveryAddressMode: 'per-line' } }),
    }),
    400,
    'INVALID_COLLECTION',
    'Modo de dirección no válido',
  );
  if (modoInvalido.details?.field !== 'deliveryAddressMode')
    throw new Error('El rechazo del modo de dirección debe nombrar el campo');
  snapshot19 = await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({ revision: snapshot19.revision, config: { deliveryAddressMode: 'per-product' } }),
  });
  if ((await request('/bff/content/settings')).deliveryAddressMode !== 'per-product')
    throw new Error('La tienda debe recibir una dirección por producto tal como se guardó');
  const lineaIncompleta = await esperarError(
    await raw('/bff/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        ...pedido19,
        items: [pedido19.items[0], { ...pedido19.items[1], shipping: { ...otraDireccion, district: '' } }],
      }),
    }),
    400,
    'VALIDATION_ERROR',
    'Dirección de línea incompleta',
  );
  if (lineaIncompleta.details?.productId !== 'p-005' || lineaIncompleta.details?.fields?.[0] !== 'district')
    throw new Error('El rechazo de la dirección de una línea debe nombrar su producto y su campo (lote 18)');
  const precios19 = Object.fromEntries(
    (await request('/bff/catalog/products')).map((item) => [item.id, item.price]),
  );
  const tarifa = async (destino) =>
    (await request(`/bff/shipping/quote?destination=${encodeURIComponent(destino)}`)).price;
  const envio19 = (await tarifa('San Isidro')) + (await tarifa('Miraflores'));
  const total19 = precios19['p-004'] + precios19['p-005'] + envio19;
  const cambiado19 = await esperarError(
    await raw('/bff/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({ ...pedido19, total: total19 - envio19 }),
    }),
    409,
    'ORDER_TOTAL_CHANGED',
    'Total sin el envío del segundo destino',
  );
  if (cambiado19.details?.shippingCost !== envio19)
    throw new Error('El envío debe cobrarse una vez por cada destino distinto');
  const clave19 = 'smoke-lote-19-direcciones';
  const porProducto = await request('/bff/checkout/orders', {
    method: 'POST',
    headers: { 'idempotency-key': clave19 },
    body: JSON.stringify({ ...pedido19, total: total19 }),
  });
  if (
    porProducto.shipping.district !== 'San Isidro' ||
    porProducto.items[0].shipping !== undefined ||
    porProducto.items[1].shipping?.district !== 'Miraflores' ||
    porProducto.shippingCost !== envio19
  )
    throw new Error('El pedido debe guardar la dirección de la línea y la principal en shipping');
  const repetido19 = await request('/bff/checkout/orders', {
    method: 'POST',
    headers: { 'idempotency-key': clave19 },
    body: JSON.stringify({ ...pedido19, total: total19 }),
  });
  if (repetido19.id !== porProducto.id) throw new Error('La misma clave debe devolver el mismo pedido');
  const consultado19 = await request(`/bff/orders/${porProducto.id}`, {
    headers: { 'x-order-token': repetido19.accessToken },
  });
  if (consultado19.items[1].shipping?.addressLine !== 'Calle Regalo 456')
    throw new Error('La tienda debe ver la dirección de la línea en el pedido');
  const pedidoAdmin19 = (
    await request('/bff/admin/snapshot', { headers: authorization(owner.token) })
  ).orders.find((item) => item.id === porProducto.id);
  if (pedidoAdmin19.items[0].shipping !== null || pedidoAdmin19.items[1].shipping?.district !== 'Miraflores')
    throw new Error('El Admin debe ver la dirección de cada línea que la tiene');
  // Cambiar la principal a la misma dirección de la línea deja un solo destino.
  const cambiadoA19 = await request(`/bff/orders/${porProducto.id}/shipping`, {
    method: 'PATCH',
    headers: { 'x-order-token': repetido19.accessToken },
    body: JSON.stringify({ shipping: otraDireccion }),
  });
  if (cambiadoA19.shippingCost !== (await tarifa('Miraflores')))
    throw new Error('Cambiar la dirección principal debe recalcular el envío con las líneas');
  await request(`/bff/orders/${porProducto.id}/cancel`, {
    method: 'PATCH',
    headers: { 'x-order-token': repetido19.accessToken },
    body: '{}',
  });
  snapshot19 = await request('/bff/admin/snapshot', { headers: authorization(owner.token) });
  await request('/bff/admin/snapshot', {
    method: 'PUT',
    headers: authorization(owner.token),
    body: JSON.stringify({ revision: snapshot19.revision, config: { deliveryAddressMode: 'per-order' } }),
  });
  console.log('✓ Lote 19: una dirección por pedido o una por producto, con el envío por destino distinto');

  console.log('✓ Admin autenticado → Storefront: catálogo/stock/características');
  console.log('✓ Storefront → Admin: pedido/cliente/inventario');
  console.log(
    '✓ Lote 07b: latido y personas en línea, actividad, notificaciones, perfil e imagen de categoría',
  );
  console.log('✓ Pedidos: acceso por cuenta o token, stock liberado al cancelar, envío desde la tabla');
  console.log('✓ Concurrencia: un guardado desactualizado del Admin se rechaza (409) sin alterar el stock');
  console.log('✓ Categorías: se rechazan ciclos y padres inexistentes');
  console.log(
    '✓ Lote 06: cambios por registro, ficha única, marcas y categorías en uso, términos en el pedido',
  );
  console.log('✓ Cuentas: registro/verificación/sesión/recuperación/revocación');
  console.log('✓ Roles fijos: superadmin, admin y vendedor con permisos validados en el BFF');
  console.log('✓ Reclamaciones: registro persistente y recepción administrativa');
  console.log('✓ CMS: logo/navegación/toggles/contenido legal');
  console.log('✓ Campañas y envíos compartidos');
  console.log('✓ Temas: apariencia pública, theme.css con ETag y 304, themes.manage y STALE_THEMES');
  console.log('\nSmoke test BFF: OK');
} finally {
  child.kill();
  await sleep(100);
  try {
    await unlink(dataFile);
  } catch {}
}
