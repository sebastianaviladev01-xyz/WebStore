/**
 * Entrada HTTP del BFF (lote 01, ADR-0017): una petición mal formada nunca tumba el proceso ni responde `500`.
 * PBI-0087 (cabecera `Host` inválida) y PBI-0099 (cuerpo partido en fragmentos, URI mal codificada, cuerpo `null`
 * y slug inexistente).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';

import { conBff, pedidoValido, pedir } from './apoyo/servidor.mjs';

/** Petición cruda con node:http, para fijar cabeceras que `fetch` no deja tocar (`Host`) o enviar el cuerpo por partes. */
function crudo(port, { method = 'GET', path = '/health', headers = {}, partes = [] } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const trozos = [];
      res.on('data', (trozo) => trozos.push(trozo));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(trozos).toString('utf8') }));
    });
    req.on('error', reject);
    (async () => {
      for (const parte of partes) {
        req.write(parte);
        await new Promise((r) => setTimeout(r, 20));
      }
      req.end();
    })();
  });
}

test('PBI-0087: un Host inválido no tumba el BFF', async () => {
  await conBff({ port: 3120 }, async (base) => {
    const respuesta = await crudo(3120, { headers: { host: 'localhost:99999' } });
    assert.ok(respuesta.status < 500, `respondió ${respuesta.status}`);
    const salud = await pedir(base, '/health');
    assert.equal(salud.status, 200, 'el BFF dejó de responder');
  });
});

test('PBI-0099: un carácter con tilde partido entre dos fragmentos llega entero', async () => {
  await conBff({ port: 3121 }, async (base) => {
    const cuerpo = Buffer.from(
      JSON.stringify(pedidoValido({ customer: { ...pedidoValido().customer, fullName: 'Ñandú Pérez' } })),
    );
    const corte = cuerpo.indexOf(Buffer.from('Ñ')) + 1; // mitad del primer byte de «Ñ»
    const respuesta = await crudo(3121, {
      method: 'POST',
      path: '/bff/checkout/orders',
      headers: { 'content-type': 'application/json', 'content-length': cuerpo.length },
      partes: [cuerpo.subarray(0, corte), cuerpo.subarray(corte)],
    });
    assert.equal(respuesta.status, 201, respuesta.body);
    assert.equal(JSON.parse(respuesta.body).customer.fullName, 'Ñandú Pérez');
    assert.equal((await pedir(base, '/health')).status, 200);
  });
});

test('PBI-0099: URI mal codificada, cuerpo null y slug inexistente responden 4xx', async () => {
  await conBff({ port: 3122 }, async (base) => {
    const producto = await pedir(base, '/bff/catalog/products/%E0%A4%A');
    assert.equal(producto.status, 400);
    assert.equal(producto.body.error.code, 'INVALID_PATH');

    const pedido = await pedir(base, '/bff/orders/%E0%A4%A');
    assert.equal(pedido.status, 400);
    assert.equal(pedido.body.error.code, 'INVALID_PATH');

    const cambio = await pedir(base, '/bff/orders/%E0%A4%A/cancel', { method: 'PATCH', body: '{}' });
    assert.equal(cambio.status, 400);

    for (const cuerpo of ['null', '[]', '"texto"', '7']) {
      const checkout = await pedir(base, '/bff/checkout/orders', { method: 'POST', body: cuerpo });
      assert.equal(checkout.status, 400, `cuerpo ${cuerpo}`);
      assert.equal(checkout.body.error.code, 'INVALID_BODY', `cuerpo ${cuerpo}`);
    }

    const lineaNula = await pedir(base, '/bff/checkout/orders', {
      method: 'POST',
      body: pedidoValido({ items: [null] }),
    });
    assert.equal(lineaNula.status, 400);

    const inexistente = await pedir(base, '/bff/catalog/products/no-existe');
    assert.equal(inexistente.status, 404);
    assert.equal(inexistente.body.error.code, 'PRODUCT_NOT_FOUND');
  });
});
