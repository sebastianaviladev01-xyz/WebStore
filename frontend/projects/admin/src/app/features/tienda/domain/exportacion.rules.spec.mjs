import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 43 (ADR-0033, PBI-0265): «Exportar» → «CSV (Excel)» de cada listado del backoffice. El archivo se abre bien en
// Excel con tildes (BOM UTF-8), con los campos entre comillas cuando hace falta, y con las filas que cumplen los filtros.
const fuente = await readFile(new URL('./exportacion.rules.ts', import.meta.url), 'utf8');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { generarCsv, nombreDeArchivoCsv } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

const BOM = '﻿';

test('el CSV empieza con el BOM UTF-8 y separa las filas con CRLF, como lo espera Excel', () => {
  const csv = generarCsv({ columnas: ['N°', 'Producto'], filas: [[1, 'Cámara']] });
  assert.equal(csv, `${BOM}N°,Producto\r\n1,Cámara\r\n`);
  assert.ok(csv.startsWith(BOM));
});

test('sin filas, el CSV lleva solo los encabezados', () => {
  assert.equal(generarCsv({ columnas: ['N°', 'Marca'], filas: [] }), `${BOM}N°,Marca\r\n`);
});

test('un campo con coma, comillas o salto de línea va entre comillas, con las comillas dobladas', () => {
  const csv = generarCsv({
    columnas: ['Nombre', 'Detalle'],
    filas: [
      ['Lima, Perú', 'Dice "hola"'],
      ['Línea 1\nLínea 2', 'Con\r\nretorno'],
      ['  espacios  ', 'normal'],
    ],
  });
  assert.equal(
    csv,
    `${BOM}Nombre,Detalle\r\n"Lima, Perú","Dice ""hola"""\r\n"Línea 1\nLínea 2","Con\r\nretorno"\r\n"  espacios  ",normal\r\n`,
  );
});

test('los números van tal cual y un campo vacío queda vacío', () => {
  const csv = generarCsv({
    columnas: ['Precio', 'Stock', 'Nota'],
    filas: [
      [1299.9, 0, null],
      [5, -3, undefined],
    ],
  });
  assert.equal(csv, `${BOM}Precio,Stock,Nota\r\n1299.9,0,\r\n5,-3,\r\n`);
});

test('un texto que Excel leería como fórmula se escribe como texto (comienza con un apóstrofo)', () => {
  const csv = generarCsv({
    columnas: ['Nombre'],
    filas: [['=HYPERLINK("x")'], ['+51 999'], ['-oferta'], ['@usuario'], ['\tcon tabulador']],
  });
  assert.equal(
    csv,
    `${BOM}Nombre\r\n"'=HYPERLINK(""x"")"\r\n'+51 999\r\n'-oferta\r\n'@usuario\r\n'\tcon tabulador\r\n`,
  );
});

test('el nombre del archivo es el del listado, sin tildes ni espacios, con la fecha', () => {
  assert.equal(nombreDeArchivoCsv('Productos', '2026-11-26'), 'productos-2026-11-26.csv');
  assert.equal(nombreDeArchivoCsv('Tarifas de envío', '2026-11-26'), 'tarifas-de-envio-2026-11-26.csv');
  assert.equal(nombreDeArchivoCsv('Usuarios y roles', '2026-01-05'), 'usuarios-y-roles-2026-01-05.csv');
});
