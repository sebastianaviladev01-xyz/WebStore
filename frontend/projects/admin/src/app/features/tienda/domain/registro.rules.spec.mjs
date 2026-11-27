import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 44 (ADR-0033, PBI-0268): las páginas de registro del backoffice tienen la forma de los formularios del SGC. La
// fila de cabecera dice la fecha y la hora actuales en hora de Lima («dd/mm/aaaa hh:mm»), los campos de texto con tope
// llevan su contador («27/150») y las características del producto, que antes eran un textarea «una por línea», son
// una tabla editable con «Agregar fila» y una papelera por fila. El contrato con el BFF no cambia: el producto sigue
// enviando `highlights` como una lista de textos sin vacíos. La regla de los banners se antepone porque el archivo se
// transpila sin sus import (PBI-0080).
const fuente = [
  await readFile(new URL('./banner.rules.ts', import.meta.url), 'utf8'),
  await readFile(new URL('./registro.rules.ts', import.meta.url), 'utf8'),
].join('\n');
const salida = ts.transpileModule(fuente.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fechaDeCabecera, contadorDeCaracteres, filasDeCaracteristicas, caracteristicasDeLasFilas } =
  await import(`data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`);

test('PBI-0268: la fecha de la cabecera es la de Lima, con día, mes, año, hora y minutos de dos cifras', () => {
  // 15:04 UTC son las 10:04 en Lima (UTC-5, sin horario de verano).
  assert.equal(fechaDeCabecera(new Date('2026-11-26T15:04:59Z')), '26/11/2026 10:04');
  // Antes de las 05:00 UTC, en Lima todavía es el día anterior.
  assert.equal(fechaDeCabecera(new Date('2026-12-01T03:07:00Z')), '30/11/2026 22:07');
  // El cambio de año también se cuenta en hora de Lima.
  assert.equal(fechaDeCabecera(new Date('2027-01-01T04:59:00Z')), '31/12/2026 23:59');
  assert.equal(fechaDeCabecera(new Date('2027-01-01T05:00:00Z')), '01/01/2027 00:00');
});

test('PBI-0268: la fecha de la cabecera no depende de la zona del navegador', () => {
  // El instante es el mismo en cualquier zona: la regla no lee `getHours()` ni `toLocaleString()` sin zona.
  const instante = new Date(Date.UTC(2026, 5, 9, 0, 30));
  assert.equal(fechaDeCabecera(instante), '08/06/2026 19:30');
});

test('PBI-0268: el contador dice los caracteres escritos sobre el tope', () => {
  assert.equal(contadorDeCaracteres('', 40), '0/40');
  assert.equal(contadorDeCaracteres('Ver ofertas', 40), '11/40');
  assert.equal(contadorDeCaracteres('x'.repeat(150), 150), '150/150');
  // Lo que se pasa del tope también se cuenta: el campo ya dice el error.
  assert.equal(contadorDeCaracteres('x'.repeat(42), 40), '42/40');
  // Sin valor (un control vacío de Angular) cuenta como 0.
  assert.equal(contadorDeCaracteres(null, 40), '0/40');
});

test('PBI-0268: la tabla de características empieza con las del producto o, si no tiene, con una fila vacía', () => {
  assert.deepEqual(filasDeCaracteristicas(['Tres velocidades', 'Temporizador']), [
    'Tres velocidades',
    'Temporizador',
  ]);
  assert.deepEqual(filasDeCaracteristicas([]), ['']);
  assert.deepEqual(filasDeCaracteristicas(undefined), ['']);
});

test('PBI-0268: se guardan las filas escritas, sin espacios de sobra ni filas vacías, en su orden', () => {
  assert.deepEqual(caracteristicasDeLasFilas([' Tres velocidades ', '', '   ', 'Temporizador']), [
    'Tres velocidades',
    'Temporizador',
  ]);
  assert.deepEqual(caracteristicasDeLasFilas(['', ' ']), []);
  // Una fila con un salto de línea pegado se conserva como una sola característica.
  assert.deepEqual(caracteristicasDeLasFilas(['Uno\n']), ['Uno']);
});
