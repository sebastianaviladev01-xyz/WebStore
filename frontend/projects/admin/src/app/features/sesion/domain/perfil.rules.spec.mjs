import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 07b (ADR-0017), PBI-0034: el perfil propio del Admin valida la contraseña nueva con la misma política del BFF.
const source = await readFile(new URL('./perfil.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { esContrasenaSegura, MENSAJE_CONTRASENA_DEBIL } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);
const { requirePassword } =
  await import('../../../../../../../../backend/src/domain/cuentas/cuenta.rules.mjs');

const aceptaElBff = (valor) => {
  try {
    requirePassword(valor);
    return true;
  } catch {
    return false;
  }
};

test('PBI-0034: la contraseña nueva del perfil es segura exactamente cuando el BFF la acepta', () => {
  for (const valor of ['', 'corta1', 'sinnumeros', '1234567890', 'Clave2026x', 'ñandú12345', '          1a'])
    assert.equal(esContrasenaSegura(valor), aceptaElBff(valor), valor);
});

test('PBI-0034: el mensaje de la contraseña débil es el del BFF', () => {
  assert.throws(
    () => requirePassword('x'),
    (error) => error.message === MENSAJE_CONTRASENA_DEBIL,
  );
});
