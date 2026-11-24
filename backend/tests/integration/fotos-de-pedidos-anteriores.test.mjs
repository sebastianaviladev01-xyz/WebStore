/**
 * Pedidos anteriores al lote 25 con fotos de la galería como Data URL (lote 27, ADR-0025, PBI-0236; ADR-0026). Al
 * arrancar, el BFF cambia cada foto por la dirección vigente del producto, si todavía la tiene, o la quita: el archivo
 * deja de guardar esas Data URL, el pedido llega a la tienda con la dirección y esa dirección sirve la foto.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { seed } from '../../src/infrastructure/persistencia/seed.mjs';
import { digest } from '../../src/infrastructure/seguridad/tokens.mjs';
import { conBff, pedir } from './apoyo/servidor.mjs';
import { dataUrl, webp } from '../apoyo/imagenes.mjs';

const foto = dataUrl('webp', webp(800, 600));
const quitada = dataUrl('webp', webp(640, 480));
const TOKEN = 'token-del-pedido-anterior';

/** Estado guardado por el lote 24: un producto con una foto en la galería y un pedido que guardó dos Data URL. */
function estadoAnterior() {
  const estado = structuredClone(seed);
  estado.schemaVersion = 5;
  const producto = estado.products.find((item) => item.id === 'p-001');
  producto.gallery = [foto];
  estado.orders = [
    {
      id: 'WS-00000001',
      createdAt: '2026-11-20T15:00:00.000Z',
      updatedAt: '2026-11-20T15:00:00.000Z',
      status: 'confirmed',
      accessTokenHash: digest(TOKEN),
      customer: { name: 'Cliente', email: 'cliente@example.com', phone: '999888777', document: '12345678' },
      shipping: { district: 'Miraflores', address: 'Av. Prueba 123', reference: '' },
      items: [
        {
          productId: 'p-001',
          quantity: 1,
          product: {
            id: 'p-001',
            name: producto.name,
            price: producto.price,
            imageUrl: producto.imageUrl,
            thumbnailUrl: producto.thumbnailUrl,
            images: [producto.imageUrl, foto, quitada],
          },
        },
      ],
      subtotal: producto.price,
      shippingCost: 0,
      total: producto.price,
    },
  ];
  return estado;
}

test('PBI-0236: al arrancar, las fotos de un pedido anterior pasan a su dirección o se quitan', async () => {
  const dataFile = join(tmpdir(), `webstore-fotos-pedidos-${process.pid}.json`);
  await writeFile(dataFile, JSON.stringify(estadoAnterior()));
  try {
    await conBff({ port: 3177, dataFile }, async (base) => {
      const guardado = await readFile(dataFile, 'utf8');
      assert.doesNotMatch(JSON.stringify(JSON.parse(guardado).orders), /data:image/);

      const pedido = await pedir(base, '/bff/orders/WS-00000001', { headers: { 'x-order-token': TOKEN } });
      assert.equal(pedido.status, 200);
      const [principal, direccion, ...resto] = pedido.body.items[0].product.images;
      assert.doesNotMatch(principal, /^data:/);
      assert.match(direccion, /^\/bff\/images\/products\/p-001\/gallery\/0\?v=/);
      assert.deepEqual(resto, [], 'la foto que el producto ya no tiene se quita');

      const servida = await fetch(base + direccion);
      assert.equal(servida.status, 200);
      assert.equal(dataUrl('webp', Buffer.from(await servida.arrayBuffer())), foto);
    });
  } finally {
    await unlink(dataFile).catch(() => {});
  }
});
