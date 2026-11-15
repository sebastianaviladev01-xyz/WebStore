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

// Lote 02 (PBI-0102): el ciclo completo de la cuenta, con el correo escrito de cualquier forma.

/** Cuenta ya verificada, con una sesión abierta. */
function cuentaVerificada(opciones) {
  const entorno = crear(opciones);
  const { testCode } = entorno.cuentas.register(alta());
  entorno.cuentas.verify({ email: 'ana@example.com', code: testCode });
  return entorno;
}

test('el correo se reconoce sin importar mayúsculas ni espacios en cada operación', () => {
  const { store, cuentas } = crear();
  const registro = cuentas.register(alta({ email: '  ANA@Example.COM ' }));
  assert.equal(store.state.accounts[0].email, 'ana@example.com');
  // Registrarse otra vez con otra escritura del mismo correo no crea otra cuenta.
  cuentas.register(alta({ email: 'ana@EXAMPLE.com' }));
  assert.equal(store.state.accounts.length, 1);
  const reenvio = cuentas.resendVerification({ email: ' Ana@example.com' });
  assert.notEqual(reenvio.testCode, registro.testCode);
  cuentas.verify({ email: 'ANA@example.com  ', code: reenvio.testCode });
  assert.ok(cuentas.signIn({ email: ' ANA@example.com', password: 'Prueba2026x' }).token);
  const { testCode } = cuentas.requestPasswordReset({ email: 'Ana@Example.com' });
  cuentas.resetPassword({ email: ' ANA@example.com ', code: testCode, password: 'NuevaClave2026' });
  assert.ok(cuentas.signIn({ email: 'ana@example.com', password: 'NuevaClave2026' }).token);
});

test('un alta incompleta, con un correo inválido o con una contraseña débil se rechaza sin crear la cuenta', () => {
  const { store, cuentas } = crear();
  assert.throws(() => cuentas.register(alta({ phone: '  ' })), {
    code: 'VALIDATION_ERROR',
    details: { fields: ['phone'] },
  });
  assert.throws(() => cuentas.register(alta({ email: 'ana@' })), { code: 'INVALID_EMAIL' });
  assert.throws(() => cuentas.register(alta({ password: 'corta1' })), { code: 'WEAK_PASSWORD' });
  assert.equal(store.state.accounts.length, 0);
});

test('el alta deja su actividad sin el nombre ni el correo de la persona', () => {
  const { store, cuentas } = crear();
  cuentas.register(alta());
  assert.equal(store.state.activity.length, 1);
  assert.doesNotMatch(JSON.stringify(store.state.activity), /Ana|ana@example/);
});

test('verificar con el código correcto activa la cuenta y el código no se puede usar dos veces', () => {
  const { store, cuentas } = crear();
  const { testCode } = cuentas.register(alta());
  assert.equal(store.state.accounts[0].verified, false);
  cuentas.verify({ email: 'ana@example.com', code: testCode });
  assert.equal(store.state.accounts[0].verified, true);
  assert.equal('verificationCodeHash' in store.state.accounts[0], false);
  assert.throws(() => cuentas.verify({ email: 'ana@example.com', code: testCode }), {
    code: 'INVALID_VERIFICATION_CODE',
  });
});

test('un código vencido, de otro correo o de un correo sin cuenta responde lo mismo', () => {
  const { store, cuentas } = crear();
  const { testCode } = cuentas.register(alta());
  cuentas.register(alta({ email: 'luis@example.com' }));
  store.state.accounts[0].verificationExpiresAt = new Date(Date.now() - 1000).toISOString();
  const mensajes = new Set();
  for (const comando of [
    { email: 'ana@example.com', code: testCode },
    { email: 'luis@example.com', code: testCode },
    { email: 'nadie@example.com', code: testCode },
  ])
    assert.throws(
      () => cuentas.verify(comando),
      (error) => {
        mensajes.add(error.message);
        return error.code === 'INVALID_VERIFICATION_CODE';
      },
    );
  assert.equal(mensajes.size, 1);
});

test('el ingreso exige la contraseña antes de decir que falta verificar la cuenta', () => {
  const { cuentas } = crear();
  cuentas.register(alta());
  assert.throws(() => cuentas.signIn({ email: 'ana@example.com', password: 'Incorrecta2026' }), {
    code: 'INVALID_CREDENTIALS',
    kind: 'unauthenticated',
  });
  assert.throws(() => cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' }), {
    code: 'ACCOUNT_NOT_VERIFIED',
    kind: 'forbidden',
  });
});

test('una contraseña incorrecta y un correo sin cuenta responden con el mismo mensaje', () => {
  const { cuentas } = cuentaVerificada();
  const mensajes = [
    { email: 'ana@example.com', password: 'Incorrecta2026' },
    { email: 'nadie@example.com', password: 'Prueba2026x' },
  ].map((comando) => {
    try {
      cuentas.signIn(comando);
    } catch (error) {
      return `${error.code}|${error.message}`;
    }
    return 'sin error';
  });
  assert.equal(mensajes[0], mensajes[1]);
  assert.match(mensajes[0], /^INVALID_CREDENTIALS\|/);
});

test('el ingreso abre una sesión que identifica a la cuenta y no expone su contraseña ni sus códigos', () => {
  const { store, cuentas } = cuentaVerificada();
  const { token, user } = cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' });
  assert.deepEqual(Object.keys(user).sort(), ['document', 'email', 'fullName', 'id', 'phone', 'verified']);
  assert.equal(cuentas.currentUser(token).user.id, user.id);
  assert.equal(store.state.accountSessions.length, 1);
  assert.notEqual(store.state.accountSessions[0].tokenHash, token);
  assert.throws(() => cuentas.currentUser('otro-token'), { code: 'AUTHENTICATION_REQUIRED' });
  assert.throws(() => cuentas.currentUser(''), { code: 'AUTHENTICATION_REQUIRED' });
});

test('una sesión vencida ya no identifica a la cuenta', () => {
  const { store, cuentas } = cuentaVerificada();
  const { token } = cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' });
  store.state.accountSessions[0].expiresAt = new Date(Date.now() - 1000).toISOString();
  assert.throws(() => cuentas.currentUser(token), { code: 'AUTHENTICATION_REQUIRED' });
});

test('cerrar sesión quita solo esa sesión', () => {
  const { store, cuentas } = cuentaVerificada();
  const primera = cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' }).token;
  const segunda = cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' }).token;
  cuentas.signOut(primera);
  assert.equal(store.state.accountSessions.length, 1);
  assert.throws(() => cuentas.currentUser(primera), { code: 'AUTHENTICATION_REQUIRED' });
  assert.ok(cuentas.currentUser(segunda).user);
});

test('recuperar la contraseña pide un código, cambia la clave, lo anula y cierra las sesiones de esa cuenta', () => {
  const { store, cuentas } = cuentaVerificada();
  const { testCode: codigoLuis } = cuentas.register(alta({ email: 'luis@example.com' }));
  cuentas.verify({ email: 'luis@example.com', code: codigoLuis });
  const deAna = cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' }).token;
  const deLuis = cuentas.signIn({ email: 'luis@example.com', password: 'Prueba2026x' }).token;
  const { testCode } = cuentas.requestPasswordReset({ email: 'ana@example.com' });
  cuentas.resetPassword({ email: 'ana@example.com', code: testCode, password: 'NuevaClave2026' });
  assert.throws(() => cuentas.currentUser(deAna), { code: 'AUTHENTICATION_REQUIRED' });
  assert.ok(cuentas.currentUser(deLuis).user);
  assert.throws(() => cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' }), {
    code: 'INVALID_CREDENTIALS',
  });
  assert.ok(cuentas.signIn({ email: 'ana@example.com', password: 'NuevaClave2026' }).token);
  assert.throws(
    () => cuentas.resetPassword({ email: 'ana@example.com', code: testCode, password: 'OtraClave2026' }),
    { code: 'INVALID_RESET_CODE' },
  );
  assert.equal('resetCodeHash' in store.state.accounts[0], false);
});

test('una contraseña débil se rechaza antes de mirar el código y no gasta intentos', () => {
  const { store, cuentas } = cuentaVerificada();
  const { testCode } = cuentas.requestPasswordReset({ email: 'ana@example.com' });
  for (let i = 0; i < MAX_CODE_ATTEMPTS + 1; i++)
    assert.throws(
      () => cuentas.resetPassword({ email: 'ana@example.com', code: testCode, password: 'corta' }),
      {
        code: 'WEAK_PASSWORD',
      },
    );
  assert.equal(store.state.accounts[0].resetAttempts, 0);
  cuentas.resetPassword({ email: 'ana@example.com', code: testCode, password: 'NuevaClave2026' });
});

test('pedir la recuperación responde igual con una cuenta que sin ella, y un correo inválido se rechaza', () => {
  const { cuentas } = cuentaVerificada();
  const existente = cuentas.requestPasswordReset({ email: 'ana@example.com' });
  const inexistente = cuentas.requestPasswordReset({ email: 'nadie@example.com' });
  assert.equal(existente.message, inexistente.message);
  assert.equal(inexistente.testCode, undefined);
  assert.throws(() => cuentas.requestPasswordReset({ email: 'no-es-correo' }), { code: 'INVALID_EMAIL' });
  assert.throws(
    () => cuentas.resetPassword({ email: 'nadie@example.com', code: '123456', password: 'NuevaClave2026' }),
    { code: 'INVALID_RESET_CODE' },
  );
});

test('el perfil se actualiza recortando los datos y exige nombre, teléfono y documento; el correo no cambia', () => {
  const { store, cuentas } = cuentaVerificada();
  const cuenta = store.state.accounts[0];
  const { user } = cuentas.updateProfile(cuenta, {
    fullName: '  Ana María  ',
    phone: ' 988 ',
    document: ' 999 ',
    email: 'otro@example.com',
  });
  assert.deepEqual(
    [user.fullName, user.phone, user.document, user.email],
    ['Ana María', '988', '999', 'ana@example.com'],
  );
  assert.throws(() => cuentas.updateProfile(cuenta, { fullName: 'Ana', phone: ' ', document: '1' }), {
    code: 'VALIDATION_ERROR',
    details: { fields: ['phone'] },
  });
  assert.equal(cuenta.phone, '988');
});

test('eliminar la cuenta quita sus sesiones y no toca las de otras cuentas', () => {
  const { store, cuentas } = cuentaVerificada();
  const { testCode } = cuentas.register(alta({ email: 'luis@example.com' }));
  cuentas.verify({ email: 'luis@example.com', code: testCode });
  cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' });
  const deLuis = cuentas.signIn({ email: 'luis@example.com', password: 'Prueba2026x' }).token;
  cuentas.deleteAccount(store.state.accounts[0]);
  assert.deepEqual(
    store.state.accounts.map((cuenta) => cuenta.email),
    ['luis@example.com'],
  );
  assert.equal(store.state.accountSessions.length, 1);
  assert.ok(cuentas.currentUser(deLuis).user);
  assert.throws(() => cuentas.signIn({ email: 'ana@example.com', password: 'Prueba2026x' }), {
    code: 'INVALID_CREDENTIALS',
  });
});
