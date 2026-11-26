import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 40 (ADR-0032), PBI-0256: al abrir la edición de un registro se vuelve a pedir el snapshot. Solo se dice que el
// registro ya no existe si la consulta respondió y no está; si la consulta falló, se usan los datos que ya tenía el
// panel o, si no los tenía, se avisa del fallo y se ofrece reintentar.
const source = await readFile(new URL('./edicion.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { estadoDeLaEdicion } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('PBI-0256: la consulta respondió y el registro está: el formulario, sin aviso', () => {
  assert.equal(estadoDeLaEdicion({ consultaRespondio: true, registroEncontrado: true }), 'lista');
});

test('PBI-0256: la consulta respondió y el registro no está: ya no existe', () => {
  assert.equal(estadoDeLaEdicion({ consultaRespondio: true, registroEncontrado: false }), 'no-existe');
});

test('PBI-0256: la consulta falló y el panel tenía el registro: el formulario con los datos anteriores y su aviso', () => {
  assert.equal(estadoDeLaEdicion({ consultaRespondio: false, registroEncontrado: true }), 'desactualizada');
});

test('PBI-0256: la consulta falló y el panel no tenía el registro: no se dice que no existe, se avisa del fallo', () => {
  assert.equal(estadoDeLaEdicion({ consultaRespondio: false, registroEncontrado: false }), 'sin-datos');
});
