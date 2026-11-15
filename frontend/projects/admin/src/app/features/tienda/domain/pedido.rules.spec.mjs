import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017), PBI-0067: las fechas de los pedidos se muestran en la hora de Lima, sin depender de la zona
// del navegador; la fecha de entrega (`AAAA-MM-DD`) es un día, no un instante, y se muestra tal cual.
const source = await readFile(new URL('./pedido.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { ZONA_HORARIA_LIMA, fechaDeEntrega } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0067: la zona de Lima para el pipe date es UTC-5, sin horario de verano', () => {
  assert.equal(ZONA_HORARIA_LIMA, '-0500');
});

test('PBI-0067: la fecha de entrega se muestra como dd/MM/aaaa sin pasar por ninguna zona', () => {
  assert.equal(fechaDeEntrega('2026-11-17'), '17/11/2026');
  assert.equal(fechaDeEntrega(''), '—');
  assert.equal(fechaDeEntrega('no es fecha'), '—');
});
