/**
 * Fecha de entrega del checkout en la fecha de Lima, no en UTC (PBI-0096, parte de la tienda; lote 04, ADR-0017).
 * Lima es UTC−5 todo el año: entre las 19:00 y las 23:59 de Lima, en UTC ya es el día siguiente.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./fecha-entrega.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fechaDeLima, fechaDeEntregaPropuesta, esFechaDeEntregaValida } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('fechaDeLima: a las 21:30 de Lima del 14 de noviembre sigue siendo el 14, aunque en UTC sea el 15', () => {
  assert.equal(fechaDeLima(new Date('2026-11-15T02:30:00Z')), '2026-11-14');
});

test('fechaDeLima: a medianoche de Lima ya es el día siguiente', () => {
  assert.equal(fechaDeLima(new Date('2026-11-15T05:00:00Z')), '2026-11-15');
  assert.equal(fechaDeLima(new Date('2026-11-15T04:59:59Z')), '2026-11-14');
});

test('fechaDeEntregaPropuesta: dos días después de hoy en Lima, también de noche', () => {
  assert.equal(fechaDeEntregaPropuesta(new Date('2026-11-14T15:00:00Z')), '2026-11-16');
  assert.equal(fechaDeEntregaPropuesta(new Date('2026-11-15T02:30:00Z')), '2026-11-16');
});

test('fechaDeEntregaPropuesta: cruza el fin de mes y de año', () => {
  assert.equal(fechaDeEntregaPropuesta(new Date('2026-12-31T03:00:00Z')), '2027-01-01');
  assert.equal(fechaDeEntregaPropuesta(new Date('2027-02-27T15:00:00Z')), '2027-03-01');
});

test('esFechaDeEntregaValida: desde hoy en Lima en adelante, y solo fechas que existen', () => {
  const hoy = '2026-11-14';
  assert.equal(esFechaDeEntregaValida('2026-11-14', hoy), true);
  assert.equal(esFechaDeEntregaValida('2026-12-01', hoy), true);
  assert.equal(esFechaDeEntregaValida('2026-11-13', hoy), false);
  assert.equal(esFechaDeEntregaValida('2026-02-30', '2026-01-01'), false);
  assert.equal(esFechaDeEntregaValida('', hoy), false);
  assert.equal(esFechaDeEntregaValida('14/11/2026', hoy), false);
});
