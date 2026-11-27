/**
 * Errores de compra de la campana del Admin (lote 13, ADR-0021, PBI-0173; confirmado por Sebastián Avila): los
 * intentos de checkout que el BFF rechaza porque la tienda cambió bajo el comprador (total, stock, producto fuera de
 * venta o distrito sin tarifa). Se guardan sin datos del comprador ni del pago: el código, el instante y, si lo hay,
 * el producto del catálogo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DomainError } from '../../../../src/domain/comun/domain-error.mjs';
import {
  CODIGOS_DE_ERROR_DE_COMPRA,
  MAX_ERRORES_DE_COMPRA,
  conErrorDeCompra,
  errorDeCompraDe,
  normalizarErroresDeCompra,
} from '../../../../src/domain/admin/errores-de-compra.rules.mjs';

const productos = [{ id: 'p-1', name: 'Uno' }];
const contexto = (cambios = {}) => ({
  id: 'e-1',
  at: '2026-11-23T15:00:00.000Z',
  products: productos,
  attempt: 'h:clave',
  ...cambios,
});
const rechazo = (code, details) => new DomainError('conflict', code, 'mensaje', details);

test('PBI-0173: son errores de compra el total cambiado, la falta de stock, el producto fuera de venta y el envío', () => {
  assert.deepEqual(CODIGOS_DE_ERROR_DE_COMPRA, [
    'ORDER_TOTAL_CHANGED',
    'INSUFFICIENT_STOCK',
    'PRODUCT_UNAVAILABLE',
    'SHIPPING_UNAVAILABLE',
  ]);
  assert.deepEqual(errorDeCompraDe(rechazo('ORDER_TOTAL_CHANGED', { total: 112 }), contexto()), {
    id: 'e-1',
    at: '2026-11-23T15:00:00.000Z',
    code: 'ORDER_TOTAL_CHANGED',
    productId: null,
    attempt: 'h:clave',
  });
  assert.equal(
    errorDeCompraDe(rechazo('INSUFFICIENT_STOCK', { productId: 'p-1' }), contexto()).productId,
    'p-1',
  );
});

test('PBI-0173: los errores de validación del formulario y los que no son de dominio no se registran', () => {
  for (const code of ['INVALID_PAYMENT_METHOD', 'TERMS_NOT_ACCEPTED', 'EMPTY_ORDER', 'INVALID_EMAIL'])
    assert.equal(errorDeCompraDe(new DomainError('validation', code, 'x'), contexto()), null, code);
  assert.equal(errorDeCompraDe(new Error('ORDER_TOTAL_CHANGED'), contexto()), null);
});

test('PBI-0173: solo se guarda un producto que existe en el catálogo, nunca lo que envió la tienda', () => {
  const inventado = errorDeCompraDe(rechazo('INSUFFICIENT_STOCK', { productId: '<script>' }), contexto());
  assert.equal(inventado.productId, null);
  assert.equal(errorDeCompraDe(rechazo('PRODUCT_UNAVAILABLE', undefined), contexto()).productId, null);
});

test('PBI-0173: el mismo intento con el mismo error se cuenta una vez; la lista guarda los 50 más recientes', () => {
  const evento = (n, cambios = {}) => ({
    id: `e-${n}`,
    at: new Date(Date.UTC(2026, 10, 23, 0, n)).toISOString(),
    code: 'INSUFFICIENT_STOCK',
    productId: 'p-1',
    attempt: `h:${n}`,
    ...cambios,
  });
  let lista = conErrorDeCompra([], evento(1));
  lista = conErrorDeCompra(lista, evento(2, { attempt: 'h:1' }));
  assert.deepEqual(
    lista.map((item) => item.id),
    ['e-1'],
    'repetido: mismo intento y mismo código',
  );
  lista = conErrorDeCompra(lista, evento(3, { attempt: 'h:1', code: 'ORDER_TOTAL_CHANGED' }));
  lista = conErrorDeCompra(lista, evento(4, { attempt: null }));
  lista = conErrorDeCompra(lista, evento(5, { attempt: null }));
  assert.deepEqual(
    lista.map((item) => item.id),
    ['e-5', 'e-4', 'e-3', 'e-1'],
    'sin clave de intento no se puede saber si se repite: cuenta cada vez',
  );
  for (let n = 10; n < 70; n += 1) lista = conErrorDeCompra(lista, evento(n));
  assert.equal(MAX_ERRORES_DE_COMPRA, 50);
  assert.equal(lista.length, 50);
  assert.equal(lista[0].id, 'e-69');
});

test('PBI-0173: al cargar el estado solo quedan los errores bien formados; sin lista, vacía', () => {
  assert.deepEqual(normalizarErroresDeCompra(undefined), []);
  const bueno = {
    id: 'e-1',
    at: '2026-11-23T15:00:00.000Z',
    code: 'ORDER_TOTAL_CHANGED',
    productId: null,
    attempt: null,
  };
  assert.deepEqual(
    normalizarErroresDeCompra([bueno, null, { ...bueno, code: 'OTRO' }, { ...bueno, at: 3 }, 'x']),
    [bueno],
  );
});
