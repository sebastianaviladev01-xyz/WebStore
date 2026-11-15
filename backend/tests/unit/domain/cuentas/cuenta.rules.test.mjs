/**
 * Reglas de las cuentas de cliente (lote 02, PBI-0102): la contraseña mínima, la vigencia de los códigos
 * temporales y la credencial ficticia con la que el ingreso tarda lo mismo exista o no el correo.
 */
import { afterEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CODE_TTL_MS,
  codeExpired,
  codeIsValid,
  DUMMY_CREDENTIAL,
  MAX_CODE_ATTEMPTS,
  requirePassword,
} from '../../../../src/domain/cuentas/cuenta.rules.mjs';
import { hashPassword, passwordMatches } from '../../../../src/infrastructure/seguridad/password-hasher.mjs';

afterEach(() => mock.timers.reset());

test('una contraseña de 10 caracteres con una letra y un número se acepta tal cual', () => {
  assert.equal(requirePassword('Prueba2026'), 'Prueba2026');
  assert.equal(requirePassword('1234567890a'), '1234567890a');
  assert.equal(requirePassword('ñandú123456'), 'ñandú123456');
});

test('una contraseña de 9 caracteres, sin letra o sin número responde WEAK_PASSWORD', () => {
  for (const clave of ['Prueba202', '1234567890', 'soloLetrasAqui', '!!!!!!!!!!!!', '', undefined, null])
    assert.throws(() => requirePassword(clave), { code: 'WEAK_PASSWORD', kind: 'validation' }, String(clave));
});

test('la contraseña no se recorta: los espacios cuentan como caracteres', () => {
  assert.equal(requirePassword('  a1       '), '  a1       ');
});

test('los códigos duran 15 minutos y admiten 5 intentos', () => {
  assert.equal(CODE_TTL_MS, 15 * 60 * 1000);
  assert.equal(MAX_CODE_ATTEMPTS, 5);
});

test('un código vence cuando pasa su instante de vencimiento, y sin vencimiento ya venció', () => {
  const ahora = Date.parse('2026-11-10T15:00:00.000Z');
  mock.timers.enable({ apis: ['Date'], now: ahora });
  assert.equal(codeExpired(new Date(ahora + 1).toISOString()), false);
  assert.equal(codeExpired(new Date(ahora).toISOString()), false);
  assert.equal(codeExpired(new Date(ahora - 1).toISOString()), true);
  for (const sin of [undefined, null, '']) assert.equal(codeExpired(sin), true, String(sin));
});

test('un código vale solo si coincide, existe y no venció', () => {
  const ahora = Date.parse('2026-11-10T15:00:00.000Z');
  mock.timers.enable({ apis: ['Date'], now: ahora });
  const vigente = new Date(ahora + 60_000).toISOString();
  const vencido = new Date(ahora - 60_000).toISOString();
  assert.equal(codeIsValid('h1', vigente, 'h1'), true);
  assert.equal(codeIsValid('h1', vigente, 'h2'), false);
  assert.equal(codeIsValid('h1', vencido, 'h1'), false);
  assert.equal(codeIsValid(undefined, vigente, undefined), false);
  assert.equal(codeIsValid('', vigente, ''), false);
});

test('la credencial ficticia tiene la forma de una real, no se puede modificar y nada coincide con ella', () => {
  const real = hashPassword('Prueba2026x');
  assert.equal(DUMMY_CREDENTIAL.salt.length, real.salt.length);
  assert.equal(DUMMY_CREDENTIAL.hash.length, real.hash.length);
  assert.equal(Object.isFrozen(DUMMY_CREDENTIAL), true);
  for (const clave of ['Prueba2026x', '', '0'.repeat(128)])
    assert.equal(passwordMatches(clave, DUMMY_CREDENTIAL), false, clave);
});
