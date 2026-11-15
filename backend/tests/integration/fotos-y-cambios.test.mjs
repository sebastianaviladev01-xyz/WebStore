/**
 * PBI-0119 (lote 06, ADR-0017): con fotos guardadas que suman más que el límite del cuerpo (2 MB), un cambio de un
 * producto sigue guardándose porque solo viaja el cambio (`{ upsert }`), no la colección completa con las fotos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bearer, conBff, ingresarAlAdmin, pedir } from './apoyo/servidor.mjs';

test('PBI-0119: con 2 MB de fotos guardadas, el stock y la ficha de un producto se siguen guardando', async () => {
  await conBff({ port: 3160 }, async (base) => {
    const { token } = await ingresarAlAdmin(base);
    const leer = async () => (await pedir(base, '/bff/admin/snapshot', { headers: bearer(token) })).body;
    // Seis fotos de 400 KB en tres productos: la colección completa ya no cabe en un guardado.
    const foto = (n) => `data:image/jpeg;base64,${String(n).repeat(400 * 1024)}`;
    for (const id of ['p-001', 'p-002', 'p-003']) {
      const { revision } = await leer();
      const respuesta = await pedir(base, '/bff/admin/snapshot', {
        method: 'PUT',
        headers: bearer(token),
        body: { revision, products: { upsert: [{ id, gallery: [foto(1), foto(2)] }] } },
      });
      assert.equal(respuesta.status, 200, JSON.stringify(respuesta.body).slice(0, 200));
    }
    const conFotos = await leer();
    assert.ok(
      JSON.stringify({ revision: conFotos.revision, products: conFotos.products }).length > 2 * 1024 * 1024,
      'la colección completa supera el límite',
    );
    const completa = await pedir(base, '/bff/admin/snapshot', {
      method: 'PUT',
      headers: bearer(token),
      body: { revision: conFotos.revision, products: conFotos.products },
    });
    assert.equal(completa.status, 413, 'enviar la colección completa ya no cabe');

    const stock = await pedir(base, '/bff/admin/snapshot', {
      method: 'PUT',
      headers: bearer(token),
      body: { revision: conFotos.revision, products: { upsert: [{ id: 'p-004', stock: 7 }] } },
    });
    assert.equal(stock.status, 200);
    assert.equal(stock.body.products.find((item) => item.id === 'p-004').stock, 7);
    assert.equal(
      stock.body.products.find((item) => item.id === 'p-001').gallery.length,
      2,
      'conserva las fotos',
    );
  });
});
