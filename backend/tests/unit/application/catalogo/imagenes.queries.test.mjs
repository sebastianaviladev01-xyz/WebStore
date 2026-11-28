/**
 * Imágenes cargadas servidas por dirección (lote 24, ADR-0026, PBI-0214; confirmado por Sebastián Avila). La tienda no
 * recibe las Data URL de la imagen principal, la miniatura ni las del banner dentro del JSON: recibe una dirección del
 * BFF con la versión de la imagen (`?v=`), que cambia cuando cambia la imagen. Las rutas de `assets/` llegan como
 * siempre.
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

/*
 * Lote 25 (ADR-0025 y ADR-0026; confirmado por Sebastián Avila): las fotos de la galería y la imagen de la categoría
 * tampoco viajan como Data URL dentro del JSON público. Cada foto de la galería tiene su dirección por posición
 * (`/bff/images/products/{id}/gallery/{n}`) y la imagen de la categoría, `/bff/images/categories/{id}/image`. Una imagen
 * guardada antes que no es PNG, JPEG ni WebP (la SVG de una categoría del lote 07b) o una ruta de `assets/` llega tal
 * cual.
 */
const foto1 = dataUrl('webp', webp(1200, 900));
const foto2 = dataUrl('png', png(64, 48));
const svg = 'data:image/svg+xml;base64,PHN2Zy8+';

const conGaleria = () =>
  estado({
    products: [
      {
        id: 'p-1',
        name: 'Televisor',
        sku: 'TV-1',
        active: true,
        imageUrl: principal,
        thumbnailUrl: miniatura,
        gallery: [foto1, 'assets/brand/living-room-v2.jpg', principal, foto2, foto1],
      },
    ],
    categories: [
      {
        id: 'cat-tv',
        name: 'Televisores',
        parentId: null,
        order: 1,
        imageUrl: dataUrl('webp', webp(100, 100)),
      },
      { id: 'cat-old', name: 'Antigua', parentId: null, order: 2, imageUrl: svg },
      { id: 'cat-none', name: 'Sin imagen', parentId: null, order: 3 },
    ],
  });

test('lote 25: las fotos cargadas de la galería llegan por dirección, una por posición y sin repetir', () => {
  const [tv] = createCatalogoQueries({ store: { state: conGaleria() } }).listProducts();
  assert.equal(tv.images.length, 4, 'la principal, dos fotos cargadas y la ruta de assets');
  assert.equal(tv.images[0], tv.imageUrl);
  assert.match(tv.images[1], /^\/bff\/images\/products\/p-1\/gallery\/0\?v=[A-Za-z0-9_-]{12}$/);
  assert.equal(tv.images[2], 'assets/brand/living-room-v2.jpg');
  assert.match(tv.images[3], /^\/bff\/images\/products\/p-1\/gallery\/3\?v=/);
  assert.ok(!JSON.stringify(tv).includes('data:'), 'ninguna Data URL en la ficha pública');
});

test('lote 25: la imagen cargada de la categoría llega por dirección; la SVG anterior, tal cual', () => {
  const [tv, antigua, sinImagen] = createCatalogoQueries({ store: { state: conGaleria() } }).listCategories();
  assert.match(tv.imageUrl, /^\/bff\/images\/categories\/cat-tv\/image\?v=[A-Za-z0-9_-]{12}$/);
  assert.equal(antigua.imageUrl, svg);
  assert.equal(sinImagen.imageUrl, null);
});

test('lote 25: sirve una foto de la galería por su posición y la imagen de la categoría', () => {
  const imagenes = createImagenesQueries({ store: { state: conGaleria() } });
  const foto = imagenes.obtener('products', 'p-1', 'gallery/3');
  assert.equal(foto.tipo, 'png');
  assert.deepEqual(foto.bytes, Buffer.from(foto2.split(',')[1], 'base64'));
  assert.equal(imagenes.obtener('categories', 'cat-tv', 'image').tipo, 'webp');
  for (const [coleccion, id, campo] of [
    ['products', 'p-1', 'gallery/1'],
    ['products', 'p-1', 'gallery/9'],
    ['products', 'p-1', 'gallery/x'],
    ['categories', 'cat-old', 'image'],
    ['categories', 'cat-none', 'image'],
    ['categories', 'cat-tv', 'thumbnail'],
    ['banners', 'bn 1', 'gallery/0'],
  ])
    assert.throws(
      () => imagenes.obtener(coleccion, id, campo),
      (error) => error.code === 'IMAGE_NOT_FOUND',
      `${coleccion}/${id}/${campo}`,
    );
});

/*
 * Lote 50 (ADR-0037, PBI-0289; decisión de Sebastián Avila del 2026-11-27): el logo cargado se sirve por dirección,
 * como las demás imágenes (ADR-0026): los ajustes públicos traen `/bff/images/logo?v={versión}` en lugar de la Data
 * URL. Una dirección escrita en el campo, o un logo guardado antes como SVG, llegan tal cual.
 */
const conLogo = (logoUrl) => estado({ config: { storeName: 'Mi tienda', logoUrl } });

test('PBI-0289: los ajustes públicos traen la dirección del logo cargado, con su versión', () => {
  const logo = dataUrl('png', png(64, 64));
  const ajustes = createContenidoQueries({ store: { state: conLogo(logo) } }).getSettings();
  assert.match(ajustes.logoUrl, /^\/bff\/images\/logo\?v=[A-Za-z0-9_-]{12}$/);
  assert.ok(!JSON.stringify(ajustes).includes('data:'), 'ninguna Data URL en los ajustes públicos');
  const otro = createContenidoQueries({
    store: { state: conLogo(dataUrl('png', png(32, 32))) },
  }).getSettings();
  assert.notEqual(otro.logoUrl, ajustes.logoUrl, 'la versión cambia con el logo');
});

test('PBI-0289: una dirección escrita, un logo SVG guardado antes o ninguno llegan tal cual', () => {
  for (const logo of ['https://cdn.example.com/logo.png', svg, ''])
    assert.equal(createContenidoQueries({ store: { state: conLogo(logo) } }).getSettings().logoUrl, logo);
});

test('PBI-0289: sirve el logo cargado; sin uno cargado PNG, JPG o WebP responde IMAGE_NOT_FOUND', () => {
  const logo = dataUrl('webp', webp(400, 200));
  const imagen = createImagenesQueries({ store: { state: conLogo(logo) } }).obtenerLogo();
  assert.equal(imagen.tipo, 'webp');
  assert.deepEqual(imagen.bytes, Buffer.from(logo.split(',')[1], 'base64'));
  assert.match(imagen.version, VERSION);
  for (const otro of ['https://cdn.example.com/logo.png', svg, ''])
    assert.throws(
      () => createImagenesQueries({ store: { state: conLogo(otro) } }).obtenerLogo(),
      (error) => error.code === 'IMAGE_NOT_FOUND' && error.kind === 'not-found',
      otro || '(vacío)',
    );
});
