/**
 * Lote 24 (ADR-0026, PBI-0214; provisional): la imagen principal y la miniatura de un producto cargadas en el Admin se
 * guardan y la tienda las pide por `GET /bff/images/{collection}/{id}/{field}`, con su tipo y una caché larga cuando la
 * dirección lleva la versión vigente. Una URL nueva en lugar de la imagen se rechaza.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bearer, conBff, ingresarAlAdmin, pedir } from './apoyo/servidor.mjs';
import { dataUrl, imagenesDeProducto } from '../apoyo/imagenes.mjs';

test('PBI-0214: la imagen cargada de un producto se sirve por su dirección, con su tipo y su caché', async () => {
  await conBff({ port: 3176 }, async (base) => {
    const { token } = await ingresarAlAdmin(base);
    const { revision } = (await pedir(base, '/bff/admin/snapshot', { headers: bearer(token) })).body;
    const imagenes = imagenesDeProducto();
    const guardado = await pedir(base, '/bff/admin/snapshot', {
      method: 'PUT',
      headers: bearer(token),
      body: { revision, products: { upsert: [{ id: 'p-001', ...imagenes }] } },
    });
    assert.equal(guardado.status, 200, JSON.stringify(guardado.body).slice(0, 300));

    const tv = (await pedir(base, '/bff/catalog/products')).body.find((item) => item.id === 'p-001');
    assert.match(tv.imageUrl, /^\/bff\/images\/products\/p-001\/image\?v=/);
    const respuesta = await fetch(base + tv.thumbnailUrl);
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get('content-type'), 'image/webp');
    assert.match(respuesta.headers.get('cache-control'), /max-age=31536000/);
    assert.equal(respuesta.headers.get('x-content-type-options'), 'nosniff');
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    assert.equal(dataUrl('webp', bytes), imagenes.thumbnailUrl);

    const sinVersion = await fetch(`${base}/bff/images/products/p-001/thumbnail`);
    assert.equal(sinVersion.headers.get('cache-control'), 'no-cache');
    const igual = await fetch(base + tv.thumbnailUrl, {
      headers: { 'if-none-match': respuesta.headers.get('etag') },
    });
    assert.equal(igual.status, 304);

    const otra = await pedir(base, '/bff/images/products/p-002/image');
    assert.equal(otra.status, 404, 'una ruta de assets no se sirve por aquí');
    assert.equal(otra.body.error.code, 'IMAGE_NOT_FOUND');

    const conUrl = await pedir(base, '/bff/admin/snapshot', {
      method: 'PUT',
      headers: bearer(token),
      body: {
        revision: guardado.body.revision,
        products: { upsert: [{ id: 'p-002', imageUrl: 'https://example.com/tv.jpg' }] },
      },
    });
    assert.equal(conUrl.status, 400);
    assert.equal(conUrl.body.error.details.field, 'imageUrl');
  });
});
