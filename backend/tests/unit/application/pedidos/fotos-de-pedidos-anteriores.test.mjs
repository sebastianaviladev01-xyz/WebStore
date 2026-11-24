/**
 * Migración al arrancar de las fotos de los pedidos anteriores (lote 27, ADR-0025, PBI-0236; ADR-0026). Sobre el estado
 * cargado, cambia las Data URL de los pedidos por la dirección vigente del BFF (la misma que sirve
 * `GET /bff/images/...`) o las quita, guarda una sola vez y deja un aviso en el log con lo que hizo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createImagenesQueries } from '../../../../src/application/catalogo/imagenes.queries.mjs';
import { migrarFotosDePedidosAnteriores } from '../../../../src/application/pedidos/fotos-de-pedidos-anteriores.mjs';
import { dataUrl, webp } from '../../../apoyo/imagenes.mjs';

const foto = dataUrl('webp', webp(800, 600));
const quitada = dataUrl('webp', webp(640, 480));

const almacen = () => {
  const store = {
    guardados: 0,
    state: {
      products: [{ id: 'p-1', name: 'Televisor', imageUrl: 'assets/tv.svg', gallery: [foto] }],
      orders: [
        {
          id: 'WS-1',
          items: [
            {
              productId: 'p-1',
              quantity: 1,
              product: { id: 'p-1', imageUrl: 'assets/tv.svg', images: ['assets/tv.svg', foto, quitada] },
            },
          ],
        },
      ],
    },
    save: () => store.guardados++,
  };
  return store;
};

test('cambia la foto por la dirección que sirve el BFF, quita la que ya no existe, guarda y avisa', () => {
  const store = almacen();
  const avisos = [];
  migrarFotosDePedidosAnteriores(store, (aviso) => avisos.push(aviso));
  const [principal, direccion, ...resto] = store.state.orders[0].items[0].product.images;
  assert.equal(principal, 'assets/tv.svg');
  assert.match(direccion, /^\/bff\/images\/products\/p-1\/gallery\/0\?v=[\w-]{12}$/);
  assert.deepEqual(resto, []);
  const servida = createImagenesQueries({ store }).obtener('products', 'p-1', 'gallery/0');
  assert.equal(direccion.endsWith(`?v=${servida.version}`), true);
  assert.equal(store.guardados, 1);
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /\[pedidos\].*1 .*dirección.*1 .*quit/);
  assert.doesNotMatch(JSON.stringify(store.state.orders), /data:image/);
});

test('sin Data URL en los pedidos no guarda ni avisa', () => {
  const store = almacen();
  migrarFotosDePedidosAnteriores(store, () => {});
  const avisos = [];
  migrarFotosDePedidosAnteriores(store, (aviso) => avisos.push(aviso));
  assert.equal(store.guardados, 1);
  assert.deepEqual(avisos, []);
});
