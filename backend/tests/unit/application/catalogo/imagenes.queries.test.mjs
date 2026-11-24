/**
 * Imágenes cargadas servidas por dirección (lote 24, ADR-0026, PBI-0214; provisional). La tienda no recibe las Data URL
 * de la imagen principal, la miniatura ni las del banner dentro del JSON: recibe una dirección del BFF con la versión de
 * la imagen (`?v=`), que cambia cuando cambia la imagen. Las rutas de `assets/` llegan como siempre.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createCatalogoQueries } from '../../../../src/application/catalogo/catalogo.queries.mjs';
import { createImagenesQueries } from '../../../../src/application/catalogo/imagenes.queries.mjs';
import { createContenidoQueries } from '../../../../src/application/contenido/contenido.queries.mjs';
import { dataUrl, png, webp } from '../../../apoyo/imagenes.mjs';

const principal = dataUrl('webp', webp(1600, 1200));
const miniatura = dataUrl('webp', webp(480, 360));

const estado = (cambios = {}) => ({
  products: [
    {
      id: 'p-1',
      name: 'Televisor',
      sku: 'TV-1',
      active: true,
      imageUrl: principal,
      thumbnailUrl: miniatura,
      gallery: ['assets/products/tv.svg'],
    },
    {
      id: 'p-2',
      name: 'Lavadora',
      sku: 'LV-1',
      active: true,
      imageUrl: 'assets/products/washer-studio.jpg',
      thumbnailUrl: 'assets/products/washer-studio-480.jpg',
    },
  ],
  banners: [
    { id: 'bn 1', title: 'Hero', placement: 'hero', active: true, imageUrl: principal, mobileImageUrl: '' },
    {
      id: 'bn-2',
      title: 'Otro',
      placement: 'hero',
      active: true,
      imageUrl: 'assets/brand/living-room-v4.webp',
      mobileImageUrl: dataUrl('png', png(1100, 586)),
    },
  ],
  categories: [],
  brands: [],
  config: {},
  ...cambios,
});

const VERSION = /^[A-Za-z0-9_-]{12}$/;

test('PBI-0214: la ficha pública trae la dirección del BFF de la imagen y de la miniatura, con su versión', () => {
  const [tv, lavadora] = createCatalogoQueries({ store: { state: estado() } }).listProducts();
  const imagen = new URL(tv.imageUrl, 'http://bff');
  assert.equal(imagen.pathname, '/bff/images/products/p-1/image');
  assert.match(imagen.searchParams.get('v'), VERSION);
  const reducida = new URL(tv.thumbnailUrl, 'http://bff');
  assert.equal(reducida.pathname, '/bff/images/products/p-1/thumbnail');
  assert.notEqual(reducida.searchParams.get('v'), imagen.searchParams.get('v'));
  assert.deepEqual(tv.images, [tv.imageUrl, 'assets/products/tv.svg'], 'la principal sigue primero');
  assert.equal(lavadora.imageUrl, 'assets/products/washer-studio.jpg');
  assert.equal(lavadora.thumbnailUrl, 'assets/products/washer-studio-480.jpg');
});

test('PBI-0214: sin miniatura, la ficha usa la dirección de la imagen principal', () => {
  const state = estado();
  delete state.products[0].thumbnailUrl;
  const [tv] = createCatalogoQueries({ store: { state } }).listProducts();
  assert.equal(tv.thumbnailUrl, tv.imageUrl);
});

test('PBI-0214: el banner público trae la dirección de sus imágenes cargadas, con el id codificado', () => {
  const [hero, otro] = createContenidoQueries({ store: { state: estado() } }).listBanners();
  assert.match(hero.imageUrl, /^\/bff\/images\/banners\/bn%201\/image\?v=[A-Za-z0-9_-]{12}$/);
  assert.equal(hero.mobileImageUrl, '');
  assert.equal(otro.imageUrl, 'assets/brand/living-room-v4.webp');
  assert.match(otro.mobileImageUrl, /^\/bff\/images\/banners\/bn-2\/mobile-image\?v=/);
});

test('PBI-0214: la versión cambia cuando cambia la imagen', () => {
  const antes = createCatalogoQueries({ store: { state: estado() } }).listProducts()[0].imageUrl;
  const state = estado();
  state.products[0].imageUrl = dataUrl('webp', webp(1600, 1000));
  const despues = createCatalogoQueries({ store: { state } }).listProducts()[0].imageUrl;
  assert.notEqual(antes, despues);
});

test('PBI-0214: devuelve el tipo, los bytes y la versión de una imagen cargada', () => {
  const imagenes = createImagenesQueries({ store: { state: estado() } });
  const imagen = imagenes.obtener('products', 'p-1', 'image');
  assert.equal(imagen.tipo, 'webp');
  assert.deepEqual(imagen.bytes, Buffer.from(principal.split(',')[1], 'base64'));
  assert.match(imagen.version, VERSION);
  assert.equal(imagenes.obtener('banners', 'bn-2', 'mobile-image').tipo, 'png');
});

test('PBI-0214: una imagen que no existe o que no es una imagen cargada responde IMAGE_NOT_FOUND', () => {
  const imagenes = createImagenesQueries({ store: { state: estado() } });
  for (const [coleccion, id, campo] of [
    ['products', 'p-x', 'image'],
    ['products', 'p-2', 'image'],
    ['products', 'p-1', 'gallery'],
    ['banners', 'bn 1', 'mobile-image'],
    ['users', 'u-1', 'image'],
  ])
    assert.throws(
      () => imagenes.obtener(coleccion, id, campo),
      (error) => error.code === 'IMAGE_NOT_FOUND' && error.kind === 'not-found',
      `${coleccion}/${id}/${campo}`,
    );
});
