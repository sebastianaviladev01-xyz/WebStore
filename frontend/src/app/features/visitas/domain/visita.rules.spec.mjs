import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 07b (ADR-0017), PBI-0027: el latido de la tienda para «Personas en línea» del Admin, sin cookie ni datos
// personales: un identificador aleatorio de la pestaña, con el mismo formato que exige el BFF.
const source = await readFile(new URL('./visita.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { idDeVisitaValido, nuevoIdDeVisita, INTERVALO_DE_LATIDO_MS } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);
const { exigirIdDeVisita, VENTANA_EN_LINEA_MS } =
  await import('../../../../../../backend/src/domain/visitas/visitas.rules.mjs');

const aceptaElBff = (valor) => {
  try {
    exigirIdDeVisita(valor);
    return true;
  } catch {
    return false;
  }
};

test('PBI-0027: el identificador nuevo es aleatorio y el BFF lo acepta', () => {
  const uno = nuevoIdDeVisita();
  const otro = nuevoIdDeVisita();
  assert.notEqual(uno, otro);
  assert.ok(aceptaElBff(uno), uno);
  assert.ok(idDeVisitaValido(uno));
});

test('PBI-0027: un identificador guardado solo se reutiliza si el BFF lo aceptaría', () => {
  for (const valor of [null, '', 'corto', 'x'.repeat(129), 'con espacios 1234567', 'a1b2c3d4e5f6a7b8c9d0'])
    assert.equal(idDeVisitaValido(valor), aceptaElBff(valor), String(valor));
});

test('PBI-0027: el latido se repite antes de que la visita salga de la ventana del BFF', () => {
  assert.ok(INTERVALO_DE_LATIDO_MS < VENTANA_EN_LINEA_MS / 2);
});
