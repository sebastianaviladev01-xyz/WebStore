/**
 * Reglas de la cuenta del cliente (lote 05, ADR-0017): la política de contraseñas, la misma del BFF y antes copiada
 * en el registro y en recuperar (PBI-0117), y la página a la que se vuelve después de ingresar (PBI-0114), que solo
 * puede ser una ruta de la tienda.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./cuenta.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { esContrasenaSegura, rutaDeRetorno } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);
const { requirePassword } = await import('../../../../../../backend/src/domain/cuentas/cuenta.rules.mjs');

const aceptaElBff = (valor) => {
  try {
    requirePassword(valor);
    return true;
  } catch {
    return false;
  }
};

test('PBI-0117: la contraseña segura es la misma que acepta el BFF', () => {
  const casos = [
    '',
    'corta1',
    'SoloLetrasLargas',
    '1234567890',
    'Prueba2026x',
    'ñandúes2026',
    'Ñ123456789',
    'a 1 b 2 c 3',
  ];
  for (const valor of casos) assert.equal(esContrasenaSegura(valor), aceptaElBff(valor), valor);
  assert.equal(esContrasenaSegura('Prueba2026x'), true);
  assert.equal(esContrasenaSegura('SoloLetrasLargas'), false);
});

test('PBI-0114: se vuelve a una ruta de la tienda; cualquier otra cosa lleva al perfil', () => {
  assert.equal(rutaDeRetorno('/cuenta/perfil'), '/cuenta/perfil');
  assert.equal(rutaDeRetorno('/pedidos/WS-2026-0001?x=1'), '/pedidos/WS-2026-0001?x=1');
  for (const valor of [
    null,
    undefined,
    '',
    'cuenta/perfil',
    '//evil.example',
    'https://evil.example',
    '/\\evil.example',
    '/cuenta/login',
    '/cuenta/login?volver=/x',
  ])
    assert.equal(rutaDeRetorno(valor), '/cuenta/perfil', String(valor));
});
