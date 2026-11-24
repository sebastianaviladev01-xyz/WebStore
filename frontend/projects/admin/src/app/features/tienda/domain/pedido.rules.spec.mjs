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
const { ZONA_HORARIA_LIMA, fechaDeEntrega, versionDeTerminos } = await import(
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

// Lote 17 (ADR-0021, PBI-0177; provisional): el detalle del pedido dice qué versión de los términos aceptó el comprador.
test('PBI-0177: la versión aceptada, o que el pedido es anterior al registro de versiones', () => {
  assert.equal(versionDeTerminos(2), 'Versión 2');
  assert.equal(versionDeTerminos(1), 'Versión 1');
  assert.equal(versionDeTerminos(null), 'Sin registro de versión');
  assert.equal(versionDeTerminos(undefined), 'Sin registro de versión');
});
