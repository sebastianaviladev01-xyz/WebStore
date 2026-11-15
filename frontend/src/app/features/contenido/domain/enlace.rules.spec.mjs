import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017), PBI-0128: el enlace de un banner puede ser una ruta de la tienda o una dirección externa
// (`https://…`); la externa no pasa por el router, que la convertiría en una ruta rota de la tienda.
const source = await readFile(new URL('./enlace.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { esEnlaceExterno } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0128: http, https y mailto son enlaces externos, sin distinguir mayúsculas', () => {
  for (const url of [
    'https://example.com/promo',
    'http://example.com',
    'HTTPS://Example.com',
    ' https://x.pe ',
    'mailto:ventas@example.com',
  ])
    assert.equal(esEnlaceExterno(url), true, url);
});

test('PBI-0128: las rutas de la tienda no son externas', () => {
  for (const url of [
    '/catalogo',
    '/catalogo?categoria=tv',
    'catalogo',
    '',
    '//example.com',
    'javascript:alert(1)',
  ])
    assert.equal(esEnlaceExterno(url), false, url);
});
