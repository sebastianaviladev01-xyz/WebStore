/**
 * Lote 50 (ADR-0037, PBI-0277; decisión de Sebastián Avila del 2026-11-27, «Lotes 50 a 56»): los buscadores no indexan
 * el backoffice. En la demo publicada (`servidor-demo.mjs`), cada respuesta bajo `/admin/` lleva
 * `X-Robots-Tag: noindex, nofollow`; la tienda, en `/`, sigue indexable y no la lleva.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cabecerasDelEstatico, cabecerasDeLaRedireccion, NO_INDEXAR } from './cabeceras-demo.mjs';

test('PBI-0277: el backoffice se marca como no indexable', () => {
  assert.equal(NO_INDEXAR, 'noindex, nofollow');
});

test('PBI-0277: cada archivo del backoffice lleva X-Robots-Tag, también index.html y los del build', () => {
  for (const archivo of ['index.html', 'main-ABC123.js', 'styles-XYZ.css', 'assets/brand/favicon.svg'])
    assert.equal(cabecerasDelEstatico('/admin/', archivo)['x-robots-tag'], NO_INDEXAR, archivo);
});

test('PBI-0277: la tienda sigue indexable: sus archivos no llevan X-Robots-Tag', () => {
  for (const archivo of ['index.html', 'main-ABC123.js', 'assets/brand/favicon.svg'])
    assert.equal(Object.hasOwn(cabecerasDelEstatico('/', archivo), 'x-robots-tag'), false, archivo);
});

test('PBI-0277: las cabeceras de siempre no cambian: tipo, caché y nosniff', () => {
  assert.deepEqual(cabecerasDelEstatico('/', 'index.html'), {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  assert.deepEqual(cabecerasDelEstatico('/admin/', 'main-ABC123.js'), {
    'content-type': 'text/javascript; charset=utf-8',
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': NO_INDEXAR,
  });
  assert.equal(cabecerasDelEstatico('/', 'datos.bin')['content-type'], 'application/octet-stream');
});

test('PBI-0277: la redirección de /admin a /admin/ también lleva X-Robots-Tag', () => {
  assert.deepEqual(cabecerasDeLaRedireccion('/admin/'), { location: '/admin/', 'x-robots-tag': NO_INDEXAR });
});
