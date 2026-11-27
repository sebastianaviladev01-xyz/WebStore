/**
 * Imágenes del producto y del banner cargadas como archivo (lote 24, ADR-0025 y ADR-0026, PBI-0214; confirmado por
 * Sebastián Avila). El backoffice genera las versiones y el BFF comprueba en los bytes que una imagen nueva o cambiada
 * es un PNG, un JPEG o un WebP que no pasa de su lado máximo ni de su peso, y que la miniatura es la reducción de la
 * imagen principal. Una imagen guardada antes (una ruta como `assets/...`) sigue valiendo mientras no cambie. Una URL
 * nueva ya no se acepta.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  requireValidBanners,
  requireValidProducts,
} from '../../../../src/domain/admin/colecciones.rules.mjs';
import {
  LADO_IMAGEN_DE_BANNER,
  LADO_IMAGEN_DE_PRODUCTO,
  LADO_IMAGEN_MOVIL_DE_BANNER,
  LADO_MINIATURA_DE_PRODUCTO,
  MAX_IMAGEN_DE_BANNER,
  MAX_IMAGEN_DE_PRODUCTO,
  MAX_IMAGEN_MOVIL_DE_BANNER,
  MAX_MINIATURA_DE_PRODUCTO,
} from '../../../../src/domain/catalogo/imagen.rules.mjs';
import { dataUrl, jpeg, png, webp } from '../../../apoyo/imagenes.mjs';

const producto = (cambios = {}) => ({
  id: 'p-1',
  name: 'Televisor',
  sku: 'TV-1',
  price: 100,
  stock: 0,
  active: true,
  categoryId: 'cat-tv',
  brandId: 'b-1',
  ...cambios,
});

const rechazaEn = (field, patron) => (error) => {
  assert.equal(error.code, 'INVALID_COLLECTION');
  assert.equal(error.details.field, field);
  if (patron) assert.match(error.message, patron);
  return true;
};

test('PBI-0214: los lados y pesos máximos de cada versión', () => {
  assert.equal(LADO_IMAGEN_DE_PRODUCTO, 1600);
  assert.equal(MAX_IMAGEN_DE_PRODUCTO, 250 * 1024);
  assert.equal(LADO_MINIATURA_DE_PRODUCTO, 480);
  assert.equal(MAX_MINIATURA_DE_PRODUCTO, 60 * 1024);
  assert.equal(LADO_IMAGEN_DE_BANNER, 2560);
  assert.equal(MAX_IMAGEN_DE_BANNER, 550 * 1024);
  assert.equal(LADO_IMAGEN_MOVIL_DE_BANNER, 1200);
  assert.equal(MAX_IMAGEN_MOVIL_DE_BANNER, 200 * 1024);
});

test('PBI-0214: acepta un producto nuevo con su imagen y la miniatura que es su reducción', () => {
  for (const [principal, miniatura] of [
    [dataUrl('webp', webp(1600, 1200)), dataUrl('webp', webp(480, 360))],
    [dataUrl('jpeg', jpeg(1448, 1086)), dataUrl('jpeg', jpeg(480, 360))],
    [dataUrl('png', png(300, 200)), dataUrl('png', png(300, 200))],
    // El redondeo de la reducción puede diferir en un píxel.
    [dataUrl('webp', webp(1000, 333)), dataUrl('webp', webp(480, 159))],
  ])
    assert.doesNotThrow(() =>
      requireValidProducts([producto({ imageUrl: principal, thumbnailUrl: miniatura })], []),
    );
});

test('PBI-0214: rechaza en un producto nuevo una URL, una imagen más grande o con otro tipo que el de sus bytes', () => {
  const miniatura = dataUrl('webp', webp(480, 360));
  for (const principal of [
    'assets/products/tv-studio.jpg',
    'https://example.com/tv.jpg',
    dataUrl('webp', webp(1601, 1200)),
    dataUrl('jpeg', png(1600, 1200)),
    `${dataUrl('webp', webp(1600, 1200))}${'A'.repeat(MAX_IMAGEN_DE_PRODUCTO)}`,
  ])
    assert.throws(
      () => requireValidProducts([producto({ imageUrl: principal, thumbnailUrl: miniatura })], []),
      rechazaEn('imageUrl', /imagen principal/),
    );
});

test('PBI-0214: la miniatura nueva es la reducción de la imagen principal, de hasta 480 px', () => {
  const principal = dataUrl('webp', webp(1600, 1200));
  for (const miniatura of [
    undefined,
    'assets/products/tv-studio-480.jpg',
    dataUrl('webp', webp(640, 480)),
    dataUrl('webp', webp(480, 480)),
    `${dataUrl('webp', webp(480, 360))}${'A'.repeat(MAX_MINIATURA_DE_PRODUCTO)}`,
  ])
    assert.throws(
      () => requireValidProducts([producto({ imageUrl: principal, thumbnailUrl: miniatura })], []),
      rechazaEn('thumbnailUrl', /miniatura/),
    );
});

test('PBI-0214: si cambia la imagen principal, cambia también la miniatura', () => {
  const antes = producto({
    imageUrl: 'assets/products/tv-studio.jpg',
    thumbnailUrl: 'assets/products/tv-studio-480.jpg',
  });
  const despues = { ...antes, imageUrl: dataUrl('webp', webp(1600, 1200)) };
  assert.throws(() => requireValidProducts([despues], [antes]), rechazaEn('thumbnailUrl'));
});

test('PBI-0214: las imágenes guardadas antes (rutas de assets) siguen valiendo mientras no cambien', () => {
  const antes = producto({
    imageUrl: 'assets/products/tv-studio.jpg',
    thumbnailUrl: 'assets/products/tv-studio-480.jpg',
  });
  assert.doesNotThrow(() => requireValidProducts([{ ...antes, name: 'Otro nombre' }], [antes]));
  const sinMiniatura = producto({ imageUrl: 'assets/products/tv.svg' });
  assert.doesNotThrow(() => requireValidProducts([sinMiniatura], [sinMiniatura]));
});

const banner = (cambios = {}) => ({
  id: 'bn-1',
  title: 'Campaña',
  placement: 'hero',
  active: true,
  startAt: '2026-12-01T00:00:00.000-05:00',
  endAt: '2026-12-31T23:59:59.999-05:00',
  ...cambios,
});

test('PBI-0214: acepta un banner nuevo con su imagen de escritorio y, si tiene, la del celular', () => {
  for (const cambios of [
    { imageUrl: dataUrl('webp', webp(2560, 1024)) },
    { imageUrl: dataUrl('jpeg', jpeg(1920, 768)), mobileImageUrl: dataUrl('webp', webp(1100, 586)) },
    { imageUrl: dataUrl('png', png(1200, 480)), mobileImageUrl: '' },
  ])
    assert.doesNotThrow(() => requireValidBanners([banner(cambios)], []));
});

test('PBI-0214: rechaza en un banner nuevo una URL o una imagen de escritorio más grande', () => {
  for (const imagen of [
    'assets/brand/hero.svg',
    'https://example.com/banner.jpg',
    dataUrl('webp', webp(2561, 1024)),
    `${dataUrl('webp', webp(2560, 1024))}${'A'.repeat(MAX_IMAGEN_DE_BANNER)}`,
  ])
    assert.throws(
      () => requireValidBanners([banner({ imageUrl: imagen })], []),
      rechazaEn('imageUrl', /imagen de escritorio/),
    );
});

test('PBI-0214: rechaza una imagen del celular por URL o más grande', () => {
  const imageUrl = dataUrl('webp', webp(2560, 1024));
  for (const movil of [
    'assets/brand/hero-mobile.webp',
    dataUrl('webp', webp(1201, 600)),
    `${dataUrl('webp', webp(1100, 586))}${'A'.repeat(MAX_IMAGEN_MOVIL_DE_BANNER)}`,
  ])
    assert.throws(
      () => requireValidBanners([banner({ imageUrl, mobileImageUrl: movil })], []),
      rechazaEn('mobileImageUrl', /imagen del celular/),
    );
});

test('PBI-0214: las imágenes del banner guardadas antes siguen valiendo mientras no cambien', () => {
  const antes = banner({
    imageUrl: 'assets/brand/living-room-v4.webp',
    mobileImageUrl: 'assets/brand/living-room-v4-mobile.webp',
  });
  assert.doesNotThrow(() => requireValidBanners([{ ...antes, title: 'Otro título' }], [antes]));
});

/*
 * Lote 25 (ADR-0025 y ADR-0026; confirmado por Sebastián Avila): las fotos de la galería también se cargan como
 * archivo, nunca como URL (Daniel: «no adjuntas como URL»). Una foto nueva es un PNG, un JPEG o un WebP de hasta 1600
 * px por lado y 250 KB, como la imagen principal; las que el producto ya tenía guardadas siguen valiendo mientras sigan
 * en la galería.
 */
const imagenes = () => ({
  imageUrl: 'assets/products/tv-studio.jpg',
  thumbnailUrl: 'assets/products/tv-studio-480.jpg',
});

test('lote 25: acepta fotos nuevas de la galería cargadas como archivo', () => {
  const gallery = [
    dataUrl('webp', webp(1600, 1200)),
    dataUrl('jpeg', jpeg(1200, 1600)),
    dataUrl('png', png(300, 200)),
  ];
  const antes = producto(imagenes());
  assert.doesNotThrow(() => requireValidProducts([{ ...antes, gallery }], [antes]));
  const cargadas = {
    imageUrl: dataUrl('webp', webp(1600, 1200)),
    thumbnailUrl: dataUrl('webp', webp(480, 360)),
  };
  assert.doesNotThrow(() => requireValidProducts([producto({ ...cargadas, gallery })], []));
});

test('lote 25: rechaza en la galería una URL nueva, una foto más grande o con otro tipo que el de sus bytes', () => {
  const antes = producto(imagenes());
  for (const foto of [
    'https://example.com/foto.jpg',
    'assets/brand/living-room-v2.jpg',
    dataUrl('webp', webp(1601, 1200)),
    dataUrl('jpeg', png(800, 600)),
    `${dataUrl('webp', webp(1600, 1200))}${'A'.repeat(MAX_IMAGEN_DE_PRODUCTO)}`,
  ])
    assert.throws(
      () => requireValidProducts([{ ...antes, gallery: [foto] }], [antes]),
      rechazaEn('gallery', /fotos de la galería/),
      foto.slice(0, 40),
    );
});

test('lote 25: las fotos de la galería guardadas antes (URL o rutas de assets) siguen valiendo mientras sigan', () => {
  const antes = producto({
    ...imagenes(),
    gallery: ['assets/brand/living-room-v2.jpg', 'https://example.com/foto.jpg'],
  });
  assert.doesNotThrow(() => requireValidProducts([{ ...antes, name: 'Otro nombre' }], [antes]));
  // Quitar una o cambiar el orden no la vuelve a medir.
  assert.doesNotThrow(() =>
    requireValidProducts([{ ...antes, gallery: ['https://example.com/foto.jpg'] }], [antes]),
  );
  const nueva = dataUrl('webp', webp(800, 600));
  assert.doesNotThrow(() =>
    requireValidProducts([{ ...antes, gallery: [...antes.gallery, nueva] }], [antes]),
  );
});
