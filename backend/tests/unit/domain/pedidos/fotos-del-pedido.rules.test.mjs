/**
 * Fotos de los pedidos anteriores (lote 27, ADR-0025, PBI-0236; ADR-0026). Hasta el lote 25, un pedido guardaba la ficha
 * pública del producto con las fotos de la galería como Data URL. `pedidosSinDataUrl` las cambia por la dirección que
 * tendría hoy un pedido nuevo, si el producto todavía tiene esa foto, y quita las que ya no puede servir: ningún lugar
 * muestra la galería de un pedido. La imagen y la miniatura de la línea, que el detalle del pedido sí muestra, pasan a
 * la dirección de su campo, como en un pedido creado desde el lote 24.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pedidosSinDataUrl } from '../../../../src/domain/pedidos/fotos-del-pedido.rules.mjs';

const foto = (n) => `data:image/webp;base64,FOTO${n}`;
/** Doble de la dirección: muestra qué campo se pidió; una SVG no se sirve por dirección y vuelve tal cual. */
const direccion = (coleccion, id, campo, valor) =>
  valor.startsWith('data:image/svg') ? valor : `/dir/${coleccion}/${id}/${campo}`;

const linea = (product, extra = {}) => ({
  productId: product.id,
  quantity: 1,
  product: { name: 'Televisor', price: 10, ...product },
  ...extra,
});
const pedido = (id, items) => ({ id, status: 'confirmed', items });

test('una foto de la galería que el producto aún tiene pasa a su dirección por su posición', () => {
  const productos = [{ id: 'p-1', gallery: ['assets/x.jpg', foto(1), foto(2)] }];
  const { orders, aDireccion, quitadas } = pedidosSinDataUrl(
    [
      pedido('WS-1', [
        linea({
          id: 'p-1',
          imageUrl: 'assets/tv.svg',
          thumbnailUrl: 'assets/tv.svg',
          images: ['assets/tv.svg', 'assets/x.jpg', foto(2)],
        }),
      ]),
    ],
    productos,
    direccion,
  );
  assert.deepEqual(orders[0].items[0].product.images, [
    'assets/tv.svg',
    'assets/x.jpg',
    '/dir/products/p-1/gallery/2',
  ]);
  assert.equal(aDireccion, 1);
  assert.equal(quitadas, 0);
});

test('una foto que el producto ya no tiene, o de un producto eliminado, se quita del pedido', () => {
  const { orders, aDireccion, quitadas } = pedidosSinDataUrl(
    [
      pedido('WS-1', [
        linea({ id: 'p-1', imageUrl: 'assets/tv.svg', images: ['assets/tv.svg', foto(9)] }),
        linea({ id: 'p-borrado', imageUrl: 'assets/lav.svg', images: ['assets/lav.svg', foto(1)] }),
      ]),
    ],
    [{ id: 'p-1', gallery: [foto(1)] }],
    direccion,
  );
  assert.deepEqual(orders[0].items[0].product.images, ['assets/tv.svg']);
  assert.deepEqual(orders[0].items[1].product.images, ['assets/lav.svg']);
  assert.equal(aDireccion, 0);
  assert.equal(quitadas, 2);
});

test('la imagen y la miniatura de la línea pasan a la dirección de su campo, también en la galería del pedido', () => {
  const { orders, aDireccion } = pedidosSinDataUrl(
    [
      pedido('WS-1', [
        linea({ id: 'p-1', imageUrl: foto(1), thumbnailUrl: foto(2), images: [foto(1), foto(3)] }),
      ]),
    ],
    [{ id: 'p-1', imageUrl: foto(1), gallery: [foto(3)] }],
    direccion,
  );
  const { product } = orders[0].items[0];
  assert.equal(product.imageUrl, '/dir/products/p-1/image');
  assert.equal(product.thumbnailUrl, '/dir/products/p-1/thumbnail');
  assert.deepEqual(product.images, ['/dir/products/p-1/image', '/dir/products/p-1/gallery/0']);
  assert.equal(aDireccion, 3);
});

test('una imagen que no se sirve por dirección: la de la línea se conserva y la de la galería se quita', () => {
  const svg = 'data:image/svg+xml;base64,PHN2Zz4=';
  const { orders, quitadas } = pedidosSinDataUrl(
    [pedido('WS-1', [linea({ id: 'p-1', imageUrl: svg, images: [svg, svg] })])],
    [{ id: 'p-1', imageUrl: svg, gallery: [svg] }],
    direccion,
  );
  assert.equal(orders[0].items[0].product.imageUrl, svg);
  assert.deepEqual(orders[0].items[0].product.images, [svg]);
  assert.equal(quitadas, 1);
});

test('un pedido sin Data URL, o una línea sin ficha, no cambia; aplicarla otra vez no hace nada', () => {
  const sinFotos = pedido('WS-2', [
    linea({ id: 'p-1', imageUrl: '/bff/images/products/p-1/image?v=x', images: ['assets/tv.svg'] }),
    { productId: 'p-1', quantity: 1 },
  ]);
  const conFotos = pedido('WS-1', [linea({ id: 'p-1', imageUrl: 'assets/tv.svg', images: [foto(1)] })]);
  const productos = [{ id: 'p-1', gallery: [foto(1)] }];
  const primera = pedidosSinDataUrl([conFotos, sinFotos], productos, direccion);
  assert.equal(primera.orders[1], sinFotos);
  const segunda = pedidosSinDataUrl(primera.orders, productos, direccion);
  assert.deepEqual(segunda, { orders: primera.orders, aDireccion: 0, quitadas: 0 });
  assert.equal(segunda.orders[0], primera.orders[0]);
});

test('no cambia los pedidos que recibe', () => {
  const original = pedido('WS-1', [linea({ id: 'p-1', imageUrl: 'assets/tv.svg', images: [foto(1)] })]);
  const copia = structuredClone(original);
  pedidosSinDataUrl([original], [], direccion);
  assert.deepEqual(original, copia);
});
