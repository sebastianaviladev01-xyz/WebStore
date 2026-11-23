/**
 * Lectura del formato y las medidas de una imagen a partir de sus primeros bytes (lote 11, ADR-0021, PBI-0176): el BFF
 * de prueba no tiene dependencias, así que no decodifica ni redimensiona, pero sí comprueba que la imagen de la
 * categoría es de verdad un PNG, un JPEG o un WebP de 100 × 100 px.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LADO_IMAGEN_DE_CATEGORIA,
  leerImagen,
  medidasDeImagen,
} from '../../../../src/domain/catalogo/imagen.rules.mjs';
import { dataUrl, jpeg, png, webp } from '../../../apoyo/imagenes.mjs';

test('PBI-0176: la imagen de la categoría se guarda en una sola versión de 100 × 100 px', () => {
  assert.equal(LADO_IMAGEN_DE_CATEGORIA, 100);
});

test('PBI-0176: lee el formato y las medidas de un PNG, un JPEG y los tres tipos de WebP', () => {
  assert.deepEqual(medidasDeImagen(png(100, 100)), { tipo: 'png', ancho: 100, alto: 100 });
  assert.deepEqual(medidasDeImagen(png(160, 90)), { tipo: 'png', ancho: 160, alto: 90 });
  assert.deepEqual(medidasDeImagen(jpeg(100, 100)), { tipo: 'jpeg', ancho: 100, alto: 100 });
  assert.deepEqual(medidasDeImagen(jpeg(640, 480)), { tipo: 'jpeg', ancho: 640, alto: 480 });
  for (const variante of ['VP8 ', 'VP8L', 'VP8X'])
    assert.deepEqual(
      medidasDeImagen(webp(100, 100, variante)),
      { tipo: 'webp', ancho: 100, alto: 100 },
      variante,
    );
  assert.deepEqual(medidasDeImagen(webp(120, 80, 'VP8X')), { tipo: 'webp', ancho: 120, alto: 80 });
});

test('PBI-0176: lo que no es PNG, JPEG ni WebP, o está cortado, no tiene medidas', () => {
  assert.equal(medidasDeImagen(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
  assert.equal(medidasDeImagen(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), null);
  assert.equal(medidasDeImagen(jpeg(100, 100).subarray(0, 12)), null);
  assert.equal(medidasDeImagen(webp(100, 100).subarray(0, 20)), null);
  assert.equal(medidasDeImagen(Buffer.alloc(0)), null);
});

test('PBI-0176: una Data URL se lee solo si el tipo que declara es el de sus bytes', () => {
  assert.deepEqual(leerImagen(dataUrl('png', png(100, 100))), { tipo: 'png', ancho: 100, alto: 100 });
  assert.deepEqual(leerImagen(dataUrl('webp', webp(100, 100, 'VP8L'))), {
    tipo: 'webp',
    ancho: 100,
    alto: 100,
  });
  assert.equal(leerImagen(dataUrl('jpeg', png(100, 100))), null);
  assert.equal(leerImagen(dataUrl('svg+xml', Buffer.from('<svg/>'))), null);
  assert.equal(leerImagen('https://example.com/a.png'), null);
  assert.equal(leerImagen('data:image/png;base64,***'), null);
});
