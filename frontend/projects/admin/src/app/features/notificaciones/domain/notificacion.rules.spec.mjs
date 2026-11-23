import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 07b (ADR-0017), PBI-0033: la campana del Admin con los pedidos nuevos desde la última vez que se abrió.
// Lote 13 (ADR-0021), PBI-0173: también los reclamos nuevos y los errores de compra, cada uno con su página.
const source = await readFile(new URL('./notificacion.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  contadorDeLaCampana,
  nombreDeLaCampana,
  hastaDelMasReciente,
  presentacionDelAviso,
  puedeVerLaCampana,
  tituloDelMenu,
} = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);

const conteo = (orders = 0, complaints = 0, checkoutErrors = 0) => ({ orders, complaints, checkoutErrors });

test('PBI-0033: el número de la campana se oculta sin avisos nuevos y pasa a «9+» desde 10', () => {
  assert.equal(contadorDeLaCampana(0), '');
  assert.equal(contadorDeLaCampana(1), '1');
  assert.equal(contadorDeLaCampana(9), '9');
  assert.equal(contadorDeLaCampana(10), '9+');
});

test('PBI-0173: el nombre accesible de la campana dice cuántos avisos nuevos hay de cada tipo', () => {
  assert.equal(nombreDeLaCampana(conteo()), 'Notificaciones: no hay avisos nuevos');
  assert.equal(nombreDeLaCampana(conteo(1)), 'Notificaciones: 1 pedido nuevo');
  assert.equal(nombreDeLaCampana(conteo(12)), 'Notificaciones: 12 pedidos nuevos');
  assert.equal(nombreDeLaCampana(conteo(2, 1)), 'Notificaciones: 2 pedidos nuevos y 1 reclamo nuevo');
  assert.equal(
    nombreDeLaCampana(conteo(1, 3, 2)),
    'Notificaciones: 1 pedido nuevo, 3 reclamos nuevos y 2 errores de compra',
  );
  assert.equal(nombreDeLaCampana(conteo(0, 0, 1)), 'Notificaciones: 1 error de compra');
});

test('PBI-0173: al abrir el menú se marca como visto hasta el aviso más reciente que se mostró', () => {
  assert.equal(hastaDelMasReciente([]), null);
  assert.equal(
    hastaDelMasReciente([
      { type: 'order', id: 'WS-1', at: '2026-11-15T10:00:00.000Z' },
      { type: 'complaint', id: 'RC-2026-000001', at: '2026-11-15T12:00:00.000Z' },
      { type: 'checkout-error', id: 'e-1', at: '2026-11-15T11:00:00.000Z' },
    ]),
    '2026-11-15T12:00:00.000Z',
  );
});

test('PBI-0173: la campana es de quien ve pedidos, gestiona reclamaciones o gestiona pedidos', () => {
  const con =
    (...permisos) =>
    (permiso) =>
      permisos.includes(permiso);
  assert.equal(puedeVerLaCampana(con('orders.view')), true);
  assert.equal(puedeVerLaCampana(con('complaints.manage')), true);
  assert.equal(puedeVerLaCampana(con('orders.manage')), true);
  assert.equal(puedeVerLaCampana(con('products.edit', 'dashboard.view')), false);
});

test('PBI-0173: el menú se titula «Pedidos nuevos» si solo hay pedidos y «Avisos nuevos» si hay más tipos', () => {
  const con =
    (...permisos) =>
    (permiso) =>
      permisos.includes(permiso);
  assert.deepEqual(tituloDelMenu(con('orders.view')), {
    titulo: 'Pedidos nuevos',
    vacio: 'No hay pedidos nuevos.',
  });
  assert.deepEqual(tituloDelMenu(con('orders.view', 'orders.manage', 'complaints.manage')), {
    titulo: 'Avisos nuevos',
    vacio: 'No hay avisos nuevos.',
  });
});

test('PBI-0033: un pedido nuevo lleva a ese pedido en Pedidos', () => {
  assert.deepEqual(
    presentacionDelAviso({
      type: 'order',
      id: 'WS-1',
      at: '2026-11-15T10:00:00.000Z',
      customer: 'Ana Pérez',
      total: 120,
    }),
    { titulo: 'WS-1 · Ana Pérez', detalle: null, ruta: '/pedidos', parametros: { pedido: 'WS-1' } },
  );
});

test('PBI-0173: un reclamo nuevo dice si es reclamo o queja y lleva a Reclamaciones filtrado por su código', () => {
  const reclamo = (complaintType) => ({
    type: 'complaint',
    id: 'RC-2026-000004',
    at: '2026-11-15T10:00:00.000Z',
    complaintType,
  });
  assert.deepEqual(presentacionDelAviso(reclamo('reclamo')), {
    titulo: 'Reclamo RC-2026-000004',
    detalle: 'Libro de reclamaciones',
    ruta: '/reclamaciones',
    parametros: { texto: 'RC-2026-000004' },
  });
  assert.equal(presentacionDelAviso(reclamo('queja')).titulo, 'Queja RC-2026-000004');
});

test('PBI-0173: cada error de compra dice qué pasó y lleva a la página donde se resuelve', () => {
  const error = (code, product = null) => ({
    type: 'checkout-error',
    id: 'e-1',
    at: '2026-11-15T10:00:00.000Z',
    code,
    product,
  });
  assert.deepEqual(presentacionDelAviso(error('INSUFFICIENT_STOCK', 'Audífonos')), {
    titulo: 'Compra no completada: sin stock suficiente',
    detalle: 'Audífonos',
    ruta: '/inventario',
    parametros: { texto: 'Audífonos' },
  });
  assert.deepEqual(presentacionDelAviso(error('PRODUCT_UNAVAILABLE', 'Audífonos')), {
    titulo: 'Compra no completada: producto fuera de venta',
    detalle: 'Audífonos',
    ruta: '/productos',
    parametros: { nombre: 'Audífonos' },
  });
  assert.deepEqual(presentacionDelAviso(error('INSUFFICIENT_STOCK')), {
    titulo: 'Compra no completada: sin stock suficiente',
    detalle: null,
    ruta: '/inventario',
    parametros: null,
  });
  assert.deepEqual(presentacionDelAviso(error('ORDER_TOTAL_CHANGED')), {
    titulo: 'Compra no completada: el total cambió',
    detalle: 'Cambió un precio o el envío mientras el cliente compraba',
    ruta: '/pedidos',
    parametros: null,
  });
  assert.deepEqual(presentacionDelAviso(error('SHIPPING_UNAVAILABLE')), {
    titulo: 'Compra no completada: distrito sin tarifa de envío',
    detalle: null,
    ruta: '/envios',
    parametros: null,
  });
  assert.deepEqual(presentacionDelAviso(error('OTRO_CODIGO')), {
    titulo: 'Compra no completada',
    detalle: null,
    ruta: '/pedidos',
    parametros: null,
  });
});
