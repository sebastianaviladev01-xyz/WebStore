import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017): SKU, dirección de ficha (PBI-0129) y correo de usuario (PBI-0123) únicos, comprobados en
// el Admin antes de enviar. La dirección se calcula como el slug del BFF (`backend/src/domain/catalogo/slug.mjs`).
// La regla del correo se antepone porque el archivo se transpila sin sus import (PBI-0080).
const source = [
  await readFile(new URL('./correo.rules.ts', import.meta.url), 'utf8'),
  await readFile(new URL('./registro-unico.rules.ts', import.meta.url), 'utf8'),
].join('\n');
const moduleSource = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { slugDe, motivoDeProductoRepetido, usuarioConElMismoCorreo } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const productos = [
  { id: 'p-001', sku: 'TV-OLED-55-VSN', name: 'OLED Vision 55” 4K' },
  { id: 'p-002', sku: 'WM-SW-18', name: 'Lavadora SmartWash 18 kg' },
];

test('PBI-0129: slugDe da la misma dirección que el BFF', () => {
  assert.equal(slugDe('OLED Vision 55” 4K'), 'oled-vision-55-4k');
  assert.equal(slugDe('  Oled Visión 55 4K '), 'oled-vision-55-4k');
  assert.equal(slugDe('Ñandú & Cía.'), 'nandu-cia');
});

test('PBI-0129: un SKU de otro producto, sin distinguir mayúsculas ni espacios, se rechaza diciendo cuál', () => {
  assert.deepEqual(
    motivoDeProductoRepetido(productos, { id: 'p-nuevo', sku: ' tv-oled-55-vsn ', name: 'Otro' }),
    {
      campo: 'sku',
      mensaje: 'Ya hay un producto con el SKU tv-oled-55-vsn: «OLED Vision 55” 4K». Usa otro SKU.',
    },
  );
});

test('PBI-0129: un nombre con la dirección de ficha de otro producto se rechaza diciendo cuál', () => {
  assert.deepEqual(
    motivoDeProductoRepetido(productos, { id: 'p-nuevo', sku: 'NUEVO', name: 'Oled Visión 55 4K' }),
    {
      campo: 'name',
      mensaje:
        'Ya hay un producto con la dirección de ficha oled-vision-55-4k: «OLED Vision 55” 4K». Cambia el nombre.',
    },
  );
});

test('PBI-0129: el mismo producto en edición no choca consigo mismo', () => {
  assert.equal(motivoDeProductoRepetido(productos, { ...productos[0], name: 'OLED Vision 55 4K' }), null);
  assert.equal(motivoDeProductoRepetido(productos, { id: 'p-nuevo', sku: 'NUEVO', name: 'Otro' }), null);
});

test('PBI-0123: el correo de otro usuario, sin distinguir mayúsculas ni espacios, se detecta', () => {
  const usuarios = [
    { id: 'u-1', email: 'owner@webstore.demo', name: 'Dueño' },
    { id: 'u-3', email: 'admin@webstore.demo', name: 'Administración' },
  ];
  assert.equal(
    usuarioConElMismoCorreo(usuarios, { id: 'u-nuevo', email: ' Admin@WebStore.demo ' })?.id,
    'u-3',
  );
  assert.equal(usuarioConElMismoCorreo(usuarios, { id: 'u-3', email: 'admin@webstore.demo' }), null);
  assert.equal(usuarioConElMismoCorreo(usuarios, { id: 'u-nuevo', email: 'nuevo@webstore.demo' }), null);
});
