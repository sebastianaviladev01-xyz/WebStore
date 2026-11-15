/**
 * Cabeceras de las respuestas (lote 01, ADR-0017), por HTTP contra el BFF real:
 * - PBI-0100: las respuestas JSON (tokens y datos personales) llevan `Cache-Control: no-store` y todas
 *   `X-Content-Type-Options: nosniff`.
 * - PBI-0073: `theme.css` solo envía `Vary: Cookie` en modo demo, que es cuando la cookie cambia la hoja.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { conBff, pedir } from './apoyo/servidor.mjs';

const vary = (headers) => (headers.get('vary') ?? '').split(',').map((valor) => valor.trim().toLowerCase());

test('PBI-0100: JSON con no-store y nosniff, también en los errores y en el 204', async () => {
  await conBff({ port: 3150 }, async (base) => {
    const sesion = await pedir(base, '/bff/admin/sessions', {
      method: 'POST',
      body: { email: 'owner@webstore.demo', password: 'WebStore#2026' },
    });
    const error = await pedir(base, '/bff/admin/snapshot');
    const catalogo = await pedir(base, '/bff/catalog/products');
    const cierre = await pedir(base, '/bff/admin/sessions/current', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${sesion.body.token}` },
    });
    for (const [nombre, respuesta] of [
      ['sesión', sesion],
      ['error 401', error],
      ['catálogo', catalogo],
      ['204', cierre],
    ]) {
      assert.equal(respuesta.headers.get('cache-control'), 'no-store', nombre);
      assert.equal(respuesta.headers.get('x-content-type-options'), 'nosniff', nombre);
    }
    assert.equal(cierre.status, 204);
  });
});

test('PBI-0073: fuera del modo demo, theme.css no envía Vary: Cookie y sí nosniff', async () => {
  await conBff({ port: 3151 }, async (base) => {
    const hoja = await fetch(`${base}/bff/appearance/theme.css`);
    assert.equal(hoja.status, 200);
    assert.equal(vary(hoja.headers).includes('cookie'), false);
    assert.equal(hoja.headers.get('cache-control'), 'no-cache');
    assert.equal(hoja.headers.get('x-content-type-options'), 'nosniff');
  });
});

test('PBI-0073: en modo demo, theme.css envía Vary: Cookie', async () => {
  await conBff({ port: 3152, env: { WEBSTORE_DEMO_MODE: 'true' } }, async (base) => {
    const hoja = await fetch(`${base}/bff/appearance/theme.css`);
    assert.ok(vary(hoja.headers).includes('cookie'));
  });
});
