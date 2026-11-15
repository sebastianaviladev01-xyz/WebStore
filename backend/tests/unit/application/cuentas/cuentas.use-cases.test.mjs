/**
 * Cuentas de cliente (lote 01, ADR-0017), con un almacén en memoria:
 * - PBI-0098: una cuenta sin verificar tiene salida (reenviar el código o registrarse otra vez cuando venció).
 * - PBI-0100: el alta responde igual exista o no la cuenta, los códigos de seis dígitos tienen un tope de
 *   intentos y el ingreso compara la contraseña aunque el correo no exista.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createCuentasUseCases } from '../../../../src/application/cuentas/cuentas.use-cases.mjs';
import { MAX_CODE_ATTEMPTS } from '../../../../src/domain/cuentas/cuenta.rules.mjs';

function crearSeguridad() {
  let secuencia = 0;
  return {
    comparaciones: 0,
    hashPassword: (password) => ({ salt: 's', hash: `h:${password}` }),
    passwordMatches(password, credential) {
      this.comparaciones += 1;
      return Boolean(credential?.hash) && credential.hash === `h:${password}`;
    },
    digest: (valor) => `d:${valor}`,
    createCode: () => String(100000 + ++secuencia),
    createToken: () => `t${++secuencia}`,
    newId: () => `id${++secuencia}`,
  };
}

function crear({ exposeTestCodes = true } = {}) {
  const store = { state: { accounts: [], accountSessions: [] }, save() {} };
  const security = crearSeguridad();
  return { store, security, cuentas: createCuentasUseCases({ store, security, exposeTestCodes }) };
}

const alta = (cambios = {}) => ({
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '999999999',
  document: '12345678',
  password: 'Prueba2026x',
  ...cambios,
});

const sinCodigo = ({ testCode, ...resto }) => resto;

test('PBI-0100: el alta responde igual con un correo nuevo y con uno ya registrado y verificado', () => {
  const { store, cuentas } = crear();
  const primera = cuentas.register(alta());
  cuentas.verify({ email: 'ana@example.com', code: primera.testCode });
  const segunda = cuentas.register(alta({ password: 'OtraClave2026', fullName: 'Intruso' }));
  assert.deepEqual(sinCodigo(segunda), sinCodigo(primera));
  assert.equal('account' in primera, false, 'el alta no debe devolver los datos de la cuenta');
  assert.equal(segunda.testCode, undefined, 'una cuenta verificada no recibe un código nuevo');
  assert.equal(store.state.accounts.length, 1);
  assert.equal(store.state.accounts[0].fullName, 'Ana Pérez');
  assert.equal(
    cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' }).user.fullName,
    'Ana Pérez',
  );
});

test('PBI-0098: con el código vencido, registrarse otra vez rehace la cuenta sin verificar', () => {
  const { store, cuentas } = crear();
  cuentas.register(alta({ password: 'DeOtraPersona1' }));
  store.state.accounts[0].verificationExpiresAt = new Date(Date.now() - 1000).toISOString();
  const otraVez = cuentas.register(alta({ fullName: 'Ana Dueña' }));
  assert.match(otraVez.testCode, /^\d{6}$/);
  cuentas.verify({ email: 'ana@example.com', code: otraVez.testCode });
  const sesion = cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' });
  assert.equal(sesion.user.fullName, 'Ana Dueña');
  assert.equal(store.state.accounts.length, 1);
});

test('PBI-0098: con el código vigente, registrarse otra vez no cambia la contraseña de la cuenta', () => {
  const { store, cuentas } = crear();
  const primera = cuentas.register(alta());
  const intento = cuentas.register(alta({ password: 'DeOtraPersona1' }));
  assert.deepEqual(sinCodigo(intento), sinCodigo(primera));
  cuentas.verify({ email: 'ana@example.com', code: primera.testCode });
  assert.ok(cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' }).token);
  assert.equal(store.state.accounts.length, 1);
});

test('PBI-0098: reenviar el código de una cuenta sin verificar emite uno nuevo y anula el anterior', () => {
  const { cuentas } = crear();
  const primera = cuentas.register(alta());
  const reenvio = cuentas.resendVerification({ email: 'ANA@example.com ' });
  assert.match(reenvio.testCode, /^\d{6}$/);
  assert.notEqual(reenvio.testCode, primera.testCode);
  assert.throws(() => cuentas.verify({ email: 'ana@example.com', code: primera.testCode }), {
    code: 'INVALID_VERIFICATION_CODE',
  });
  cuentas.verify({ email: 'ana@example.com', code: reenvio.testCode });
});

test('PBI-0098: reenviar responde igual si la cuenta no existe o ya está verificada', () => {
  const { cuentas } = crear();
  const primera = cuentas.register(alta());
  const pendiente = cuentas.resendVerification({ email: 'ana@example.com' });
  cuentas.verify({ email: 'ana@example.com', code: pendiente.testCode });
  const verificada = cuentas.resendVerification({ email: 'ana@example.com' });
  const inexistente = cuentas.resendVerification({ email: 'nadie@example.com' });
  assert.deepEqual(verificada, inexistente);
  assert.deepEqual(sinCodigo(pendiente), inexistente);
  assert.equal(verificada.testCode, undefined);
  assert.ok(primera);
});

test('PBI-0098: sin exponer códigos, el reenvío no trae testCode', () => {
  const { cuentas } = crear({ exposeTestCodes: false });
  cuentas.register(alta());
  assert.equal(cuentas.resendVerification({ email: 'ana@example.com' }).testCode, undefined);
});

test(`PBI-0100: tras ${MAX_CODE_ATTEMPTS} intentos fallidos el código de verificación deja de servir`, () => {
  const { cuentas } = crear();
  const { testCode } = cuentas.register(alta());
  for (let intento = 0; intento < MAX_CODE_ATTEMPTS; intento++)
    assert.throws(() => cuentas.verify({ email: 'ana@example.com', code: '000000' }), {
      code: 'INVALID_VERIFICATION_CODE',
    });
  assert.throws(() => cuentas.verify({ email: 'ana@example.com', code: testCode }), {
    code: 'INVALID_VERIFICATION_CODE',
  });
  const nuevo = cuentas.resendVerification({ email: 'ana@example.com' });
  cuentas.verify({ email: 'ana@example.com', code: nuevo.testCode });
});

test(`PBI-0100: tras ${MAX_CODE_ATTEMPTS} intentos fallidos el código de recuperación deja de servir`, () => {
  const { cuentas } = crear();
  const { testCode: verificacion } = cuentas.register(alta());
  cuentas.verify({ email: 'ana@example.com', code: verificacion });
  const { testCode } = cuentas.requestPasswordReset({ email: 'ana@example.com' });
  for (let intento = 0; intento < MAX_CODE_ATTEMPTS; intento++)
    assert.throws(
      () => cuentas.resetPassword({ email: 'ana@example.com', code: '000000', password: 'NuevaClave2026' }),
      { code: 'INVALID_RESET_CODE' },
    );
  assert.throws(
    () => cuentas.resetPassword({ email: 'ana@example.com', code: testCode, password: 'NuevaClave2026' }),
    { code: 'INVALID_RESET_CODE' },
  );
});

test('PBI-0100: el ingreso compara la contraseña aunque el correo no exista', () => {
  const { security, cuentas } = crear();
  assert.throws(() => cuentas.signIn({ email: 'nadie@example.com', password: 'Prueba2026x' }), {
    code: 'INVALID_CREDENTIALS',
  });
  assert.equal(security.comparaciones, 1);
});
