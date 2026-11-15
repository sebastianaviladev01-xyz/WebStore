import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 07 (ADR-0017), PBI-0132: el mensaje que cada campo de un formulario del Admin muestra junto a su borde rojo.
const fuente = await readFile(new URL('./formulario.rules.ts', import.meta.url), 'utf8');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { mensajeDeError } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

test('PBI-0132: sin errores no hay mensaje', () => {
  assert.equal(mensajeDeError(null), null);
  assert.equal(mensajeDeError({}), null);
});

test('PBI-0132: cada error de Angular tiene un mensaje que dice qué hacer', () => {
  assert.equal(mensajeDeError({ required: true }), 'Completa este campo.');
  assert.equal(mensajeDeError({ email: true }), 'Escribe un correo válido, como nombre@dominio.pe.');
  assert.equal(mensajeDeError({ min: { min: 0, actual: -1 } }), 'Usa un número desde 0.');
  assert.equal(mensajeDeError({ max: { max: 100, actual: 120 } }), 'Usa un número hasta 100.');
  assert.equal(
    mensajeDeError({ maxlength: { requiredLength: 4000, actualLength: 4001 } }),
    'Usa como máximo 4000 caracteres.',
  );
  assert.equal(
    mensajeDeError({ minlength: { requiredLength: 10, actualLength: 3 } }),
    'Usa al menos 10 caracteres.',
  );
  assert.equal(mensajeDeError({ pattern: { requiredPattern: '^x$' } }), 'Revisa el formato de este campo.');
});

test('PBI-0132: un motivo propio del formulario (por ejemplo, un dato repetido) se muestra tal cual y primero', () => {
  assert.equal(
    mensajeDeError({ required: true, repetido: 'Ya hay un usuario con ese correo: Ana. Usa otro.' }),
    'Ya hay un usuario con ese correo: Ana. Usa otro.',
  );
});

test('PBI-0132: un error sin mensaje conocido pide revisar el campo', () => {
  assert.equal(mensajeDeError({ otro: true }), 'Revisa este campo.');
});
