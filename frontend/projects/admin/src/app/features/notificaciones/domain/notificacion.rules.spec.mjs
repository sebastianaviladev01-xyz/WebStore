import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 07b (ADR-0017), PBI-0033: la campana del Admin con los pedidos nuevos desde la última vez que se abrió.
const source = await readFile(new URL('./notificacion.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { contadorDeLaCampana, nombreDeLaCampana, hastaDelMasReciente } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0033: el número de la campana se oculta sin pedidos nuevos y pasa a «9+» desde 10', () => {
  assert.equal(contadorDeLaCampana(0), '');
  assert.equal(contadorDeLaCampana(1), '1');
  assert.equal(contadorDeLaCampana(9), '9');
  assert.equal(contadorDeLaCampana(10), '9+');
});

test('PBI-0033: el nombre accesible de la campana dice cuántos pedidos nuevos hay', () => {
  assert.equal(nombreDeLaCampana(0), 'Notificaciones: no hay pedidos nuevos');
  assert.equal(nombreDeLaCampana(1), 'Notificaciones: 1 pedido nuevo');
  assert.equal(nombreDeLaCampana(12), 'Notificaciones: 12 pedidos nuevos');
});

test('PBI-0033: al abrir el menú se marca como visto hasta el pedido más reciente que se mostró', () => {
  assert.equal(hastaDelMasReciente([]), null);
  assert.equal(
    hastaDelMasReciente([
      { id: 'WS-1', createdAt: '2026-11-15T10:00:00.000Z' },
      { id: 'WS-3', createdAt: '2026-11-15T12:00:00.000Z' },
      { id: 'WS-2', createdAt: '2026-11-15T11:00:00.000Z' },
    ]),
    '2026-11-15T12:00:00.000Z',
  );
});
