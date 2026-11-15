/**
 * Barreras del BFF fuera del modo demo (lote 01, ADR-0017), por HTTP contra el BFF real:
 * - PBI-0090: `POST /admin/reset` solo funciona en modo demo o con `WEBSTORE_ALLOW_STORE_RESET=true`.
 * - PBI-0091: por defecto, ni el registro ni la recuperación devuelven el código.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bearer, conBff, ingresarAlAdmin, pedidoValido, pedir } from './apoyo/servidor.mjs';

async function reiniciar(base) {
  const { token } = await ingresarAlAdmin(base);
  await pedir(base, '/bff/checkout/orders', { method: 'POST', body: pedidoValido() });
  const respuesta = await pedir(base, '/bff/admin/reset', {
    method: 'POST',
    headers: bearer(token),
    body: '{}',
  });
  const snapshot = await pedir(base, '/bff/admin/snapshot', {
    headers: bearer((await ingresarAlAdmin(base)).token),
  });
  return { respuesta, pedidos: snapshot.body.orders.length };
}

test('PBI-0090: sin modo demo, el reinicio responde 403 STORE_RESET_DISABLED y no borra nada', async () => {
  await conBff({ port: 3140 }, async (base) => {
    const { respuesta, pedidos } = await reiniciar(base);
    assert.equal(respuesta.status, 403);
    assert.equal(respuesta.body.error.code, 'STORE_RESET_DISABLED');
    assert.equal(pedidos, 1);
  });
});

test('PBI-0090: con WEBSTORE_ALLOW_STORE_RESET=true el reinicio funciona', async () => {
  await conBff({ port: 3141, env: { WEBSTORE_ALLOW_STORE_RESET: 'true' } }, async (base) => {
    const { respuesta, pedidos } = await reiniciar(base);
    assert.equal(respuesta.status, 200);
    assert.equal(pedidos, 0);
  });
});

test('PBI-0090: en modo demo el reinicio funciona', async () => {
  await conBff({ port: 3142, env: { WEBSTORE_DEMO_MODE: 'true' } }, async (base) => {
    const { respuesta, pedidos } = await reiniciar(base);
    assert.equal(respuesta.status, 200);
    assert.equal(pedidos, 0);
  });
});

const registro = {
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '999999999',
  document: '12345678',
  password: 'Prueba2026x',
};

test('PBI-0091: por defecto ni el registro ni la recuperación devuelven el código', async () => {
  await conBff({ port: 3143 }, async (base) => {
    const alta = await pedir(base, '/bff/accounts', { method: 'POST', body: registro });
    assert.equal(alta.status, 201);
    assert.equal('testCode' in alta.body, false);
    const recuperacion = await pedir(base, '/bff/password-reset-requests', {
      method: 'POST',
      body: { email: registro.email },
    });
    assert.equal(recuperacion.status, 202);
    assert.equal('testCode' in recuperacion.body, false);
  });
});

test('PBI-0091: con WEBSTORE_EXPOSE_TEST_CODES=true el registro devuelve el código', async () => {
  await conBff({ port: 3144, env: { WEBSTORE_EXPOSE_TEST_CODES: 'true' } }, async (base) => {
    const alta = await pedir(base, '/bff/accounts', { method: 'POST', body: registro });
    assert.match(alta.body.testCode ?? '', /^\d{6}$/);
  });
});
