/**
 * Imagen de la categoría en el guardado del Admin (lote 11, ADR-0021, PBI-0176; confirmado por Sebastián Avila): una
 * imagen nueva o cambiada debe ser un PNG, un JPEG o un WebP de 100 × 100 px y caber en `MAX_IMAGEN_DE_CATEGORIA`. Las
 * guardadas antes (160 px o SVG, del lote 07b) siguen valiendo mientras no cambien, para no bloquear otros guardados.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_IMAGEN_DE_CATEGORIA,
  requireValidCategories,
} from '../../../../src/domain/admin/colecciones.rules.mjs';
import { dataUrl, jpeg, png, webp } from '../../../apoyo/imagenes.mjs';

const categoria = (imageUrl, id = 'cat-1') => ({
  id,
  name: 'Televisores',
  parentId: '',
  ...(imageUrl === undefined ? {} : { imageUrl }),
});

const rechazaLaImagen = (error) => {
  assert.equal(error.code, 'INVALID_COLLECTION');
  assert.deepEqual(error.details, { collection: 'categories', field: 'imageUrl', id: 'cat-1' });
  assert.match(error.message, /PNG, JPG o WebP de 100 × 100 px/);
  return true;
};

test('PBI-0176: acepta una imagen PNG, JPEG o WebP de 100 × 100 px, ninguna o null para quitarla', () => {
  for (const imagen of [
    dataUrl('png', png(100, 100)),
    dataUrl('jpeg', jpeg(100, 100)),
    dataUrl('webp', webp(100, 100)),
    null,
    undefined,
  ])
    assert.doesNotThrow(() => requireValidCategories([categoria(imagen)], []));
});

test('PBI-0176: rechaza una imagen nueva de otras medidas, SVG o con un tipo que no es el de sus bytes', () => {
  for (const imagen of [
    dataUrl('png', png(160, 160)),
    dataUrl('png', png(100, 99)),
    dataUrl('jpeg', jpeg(640, 480)),
    dataUrl('svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>')),
    dataUrl('jpeg', png(100, 100)),
    'https://example.com/categoria.png',
  ])
    assert.throws(() => requireValidCategories([categoria(imagen)], []), rechazaLaImagen);
});

test('PBI-0176: rechaza una imagen que no cabe en el máximo, aunque mida 100 × 100 px', () => {
  const enorme = `${dataUrl('png', png(100, 100))}${'A'.repeat(MAX_IMAGEN_DE_CATEGORIA)}`;
  assert.throws(() => requireValidCategories([categoria(enorme)], []), rechazaLaImagen);
});

test('PBI-0176: una imagen guardada antes (160 px o SVG) sigue valiendo mientras no cambie', () => {
  const anteriores = [dataUrl('png', png(160, 120)), 'data:image/svg+xml;base64,PHN2Zy8+'];
  for (const imagen of anteriores) {
    assert.doesNotThrow(() => requireValidCategories([categoria(imagen)], [categoria(imagen)]));
    // Cambiarla por otra que no es de 100 × 100 px sí se rechaza.
    assert.throws(
      () => requireValidCategories([categoria(dataUrl('png', png(200, 200)))], [categoria(imagen)]),
      rechazaLaImagen,
    );
  }
  // La de otra categoría no cuenta como «guardada antes».
  assert.throws(
    () => requireValidCategories([categoria(anteriores[0])], [categoria(anteriores[0], 'cat-2')]),
    rechazaLaImagen,
  );
});
