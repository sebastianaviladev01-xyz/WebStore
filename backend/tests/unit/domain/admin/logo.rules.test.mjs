/**
 * Lote 50 (ADR-0037, PBI-0289; decisión de Sebastián Avila del 2026-11-27, «Lotes 50 a 56»): el logo cargado con
 * «Cargar logo» se guarda como las demás imágenes (ADR-0026). Un logo nuevo o cambiado que es una Data URL debe ser un
 * PNG, un JPEG o un WebP de hasta `LADO_LOGO` px por lado y `MAX_LOGO` caracteres, comprobado en los bytes. El campo
 * «URL/Data URL del logo» se queda: una dirección escrita se sigue aceptando. Un logo guardado antes (también una SVG
 * en Data URL) sigue valiendo mientras no cambie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { requireValidConfig } from '../../../../src/domain/admin/colecciones.rules.mjs';
import { LADO_LOGO, MAX_LOGO } from '../../../../src/domain/catalogo/imagen.rules.mjs';
import { dataUrl, jpeg, png, webp } from '../../../apoyo/imagenes.mjs';

const SVG = 'data:image/svg+xml;base64,PHN2Zy8+';
const vigente = (logoUrl = '') => ({ storeName: 'Mi tienda', logoText: 'W', logoUrl });

const rechazaElLogo = (error) => {
  assert.equal(error.code, 'INVALID_COLLECTION');
  assert.equal(error.details.collection, 'config');
  assert.equal(error.details.field, 'logoUrl');
  assert.match(error.message, /PNG, JPG o WebP/);
  return true;
};

test('PBI-0289: el logo cargado es una imagen de hasta 1600 px por lado y 250 KB, como la imagen principal', () => {
  assert.equal(LADO_LOGO, 1600);
  assert.equal(MAX_LOGO, 250 * 1024);
});

test('PBI-0289: un logo cargado PNG, JPEG o WebP dentro de sus límites se guarda tal cual', () => {
  for (const logo of [
    dataUrl('png', png(64, 64)),
    dataUrl('jpeg', jpeg(1600, 400)),
    dataUrl('webp', webp(800, 800)),
  ])
    assert.equal(requireValidConfig({ logoUrl: logo }, vigente()).logoUrl, logo);
});

test('PBI-0289: un logo nuevo que no es PNG, JPEG ni WebP, que pasa de su lado o de su peso, o que miente en su tipo, se rechaza', () => {
  const pesado = dataUrl('png', Buffer.concat([png(64, 64), Buffer.alloc(MAX_LOGO)]));
  for (const logo of [
    SVG,
    dataUrl('webp', webp(1601, 200)),
    pesado,
    dataUrl('png', jpeg(64, 64)),
    'data:image/png;base64,no-es-base64',
    'data:text/html;base64,PGgxPkhvbGE8L2gxPg==',
  ])
    assert.throws(() => requireValidConfig({ logoUrl: logo }, vigente()), rechazaElLogo, logo.slice(0, 40));
});

test('PBI-0289: el campo se queda y acepta una dirección escrita, o vacío para quitar el logo', () => {
  for (const logo of ['https://cdn.example.com/logo.png', 'assets/brand/logo.svg', ''])
    assert.equal(requireValidConfig({ logoUrl: logo }, vigente(dataUrl('png', png(64, 64)))).logoUrl, logo);
});

test('PBI-0289: un logo guardado antes, también una SVG en Data URL, sigue valiendo mientras no cambie', () => {
  assert.equal(requireValidConfig({ logoUrl: SVG, storeName: 'Otra' }, vigente(SVG)).logoUrl, SVG);
  assert.equal(requireValidConfig({ storeName: 'Otra' }, vigente(SVG)).logoUrl, SVG);
});

test('PBI-0289: un logo que no es texto se rechaza', () => {
  assert.throws(
    () => requireValidConfig({ logoUrl: 42 }, vigente()),
    (error) => error.code === 'INVALID_COLLECTION' && error.details.field === 'logoUrl',
  );
});

test('PBI-0289: una Data URL con espacios o mayúsculas delante también se valida como logo cargado', () => {
  for (const logo of [` ${SVG}`, `\t${SVG}`, ` DATA:text/html;base64,PGgxPkhvbGE8L2gxPg==`])
    assert.throws(
      () => requireValidConfig({ logoUrl: logo }, vigente()),
      rechazaElLogo,
      JSON.stringify(logo.slice(0, 20)),
    );
});
