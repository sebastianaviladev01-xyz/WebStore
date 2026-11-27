/**
 * Acceso a WhatsApp de la tienda (lote 49, ADR-0035, PBI-0241; decidido por Sebastián Avila el 2026-11-27): el botón
 * abre `https://wa.me/<dígitos>`, con `?text=<mensaje codificado>` si hay mensaje. Sin número que sirva no hay botón, y
 * no aparece en el checkout, para no tapar «Finalizar compra» ni distraer del pago.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./whatsapp.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { enlaceDeWhatsapp, muestraWhatsappEn } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0241: el enlace es wa.me con los dígitos del número', () => {
  assert.equal(enlaceDeWhatsapp('51987654321', ''), 'https://wa.me/51987654321');
  // El BFF guarda solo dígitos; si llegara con formato, la tienda se queda con los dígitos.
  assert.equal(enlaceDeWhatsapp('+51 987 654 321', undefined), 'https://wa.me/51987654321');
});

test('PBI-0241: con mensaje, va codificado en ?text=', () => {
  assert.equal(
    enlaceDeWhatsapp('51987654321', 'Hola, ¿tienen stock? 50% & más'),
    'https://wa.me/51987654321?text=Hola%2C%20%C2%BFtienen%20stock%3F%2050%25%20%26%20m%C3%A1s',
  );
  assert.equal(enlaceDeWhatsapp('51987654321', '  Hola  '), 'https://wa.me/51987654321?text=Hola');
  assert.equal(enlaceDeWhatsapp('51987654321', '   '), 'https://wa.me/51987654321');
});

test('PBI-0241: sin número, o con uno que no sirve, no hay enlace (ni botón)', () => {
  for (const numero of ['', '   ', undefined, null, 51987654321, '1234567', '1234567890123456', 'abc'])
    assert.equal(enlaceDeWhatsapp(numero, 'Hola'), null, String(numero));
});

test('PBI-0241: el botón aparece en todas las páginas de la tienda menos en el checkout', () => {
  for (const url of [
    '/',
    '/catalogo',
    '/catalogo/oled-vision-55',
    '/carrito',
    '/pedidos',
    '/checkout-info',
    '/info/contacto',
  ])
    assert.equal(muestraWhatsappEn(url), true, url);
  for (const url of ['/checkout', '/checkout?paso=2', '/checkout#pago', '/checkout/'])
    assert.equal(muestraWhatsappEn(url), false, url);
});
