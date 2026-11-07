import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./resumen.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { fechaEnLima } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('la fecha de Lima de un instante no depende de la zona del equipo', () => {
  assert.deepEqual(fechaEnLima('2026-11-01T03:00:00Z'), { anio: 2026, mes: 10, dia: 31 }, '22:00 del 31/10');
  assert.deepEqual(fechaEnLima('2026-11-01T05:00:00Z'), { anio: 2026, mes: 11, dia: 1 }, '00:00 del 01/11');
  assert.deepEqual(fechaEnLima(new Date('2027-01-01T04:59:59Z')), { anio: 2026, mes: 12, dia: 31 });
});
