/**
 * Cuándo puede el cliente cambiar o cancelar su pedido (PBI-0143; lote 04, ADR-0017): la misma regla que el BFF,
 * dentro de las 24 horas posteriores a la compra y solo si el pedido no se envió, no se entregó ni se canceló.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./pedido.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { sePuedeModificar, modificableHasta, estaAbierto } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const compra = new Date('2026-11-14T15:00:00Z');
const pedido = (status) => ({ status, createdAt: compra.toISOString() });
const horasDespues = (horas) => new Date(compra.getTime() + horas * 60 * 60 * 1000);

test('confirmado o en preparación, dentro de las 24 horas, se puede cambiar', () => {
  for (const status of ['confirmed', 'processing'])
    assert.equal(sePuedeModificar(pedido(status), horasDespues(1)), true, status);
  assert.equal(sePuedeModificar(pedido('confirmed'), horasDespues(24)), true);
});

test('enviado, entregado o cancelado ya no se puede cambiar, aunque sigan las 24 horas', () => {
  for (const status of ['shipped', 'delivered', 'cancelled']) {
    assert.equal(sePuedeModificar(pedido(status), horasDespues(1)), false, status);
    assert.equal(estaAbierto(pedido(status)), false, status);
  }
});

test('pasadas las 24 horas no se puede cambiar, aunque siga abierto', () => {
  assert.equal(sePuedeModificar(pedido('confirmed'), horasDespues(24.01)), false);
  assert.equal(estaAbierto(pedido('confirmed')), true);
});

test('modificableHasta: 24 horas después de la compra', () => {
  assert.equal(modificableHasta(pedido('confirmed')).toISOString(), '2026-11-15T15:00:00.000Z');
});
