/**
 * PBI-0119 (lote 06, ADR-0017): con fotos guardadas que suman más que el límite del cuerpo (2 MB), un cambio de un
 * producto sigue guardándose porque solo viaja el cambio (`{ upsert }`), no la colección completa con las fotos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bearer, conBff, ingresarAlAdmin, pedir } from './apoyo/servidor.mjs';
import { dataUrl, webp } from '../apoyo/imagenes.mjs';

test('PBI-0119: con 2 MB de fotos guardadas, el stock y la ficha de un producto se siguen guardando', async () => {
  await conBff({ port: 3160 }, async (base) => {
    const { token } = await ingresarAlAdmin(base);
    const leer = async () => (await pedir(base, '/bff/admin/snapshot', { headers: bearer(token) })).body;
    // Nueve fotos de unos 240 KB en tres productos: la colección completa ya no cabe en un guardado. Desde el lote 25
    // (ADR-0026) cada foto nueva es una imagen cargada de verdad (WebP de hasta 1600 px y 250 KB), no cualquier texto.
    const foto = (n) => `${dataUrl('webp', webp(1600 - n, 1200))}${'A'.repeat(240 * 1024)}`;
    for (const [i, id] of ['p-001', 'p-002', 'p-003'].entries()) {
      const { revision } = await leer();
      const gallery = [1, 2, 3].map((n) => foto(i * 3 + n));
      const respuesta = await pedir(base, '/bff/admin/snapshot', {
        method: 'PUT',
        headers: bearer(token),
        body: { revision, products: { upsert: [{ id, gallery }] } },
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
      3,
      'conserva las fotos',
    );
  });
});
