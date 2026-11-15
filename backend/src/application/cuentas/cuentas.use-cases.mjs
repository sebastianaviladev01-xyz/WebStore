import { DomainError } from '../../domain/comun/domain-error.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import { normalizeEmail, requireEmail, requireFields } from '../../domain/comun/validacion.rules.mjs';
import {
  CODE_TTL_MS,
  codeExpired,
  codeIsValid,
  DUMMY_CREDENTIAL,
  MAX_CODE_ATTEMPTS,
  requirePassword,
} from '../../domain/cuentas/cuenta.rules.mjs';
import { findAliveSession } from '../../domain/sesion/sesion.rules.mjs';
import { openSession } from '../sesion/sesiones.mjs';

export const accountToPublic = (account) => ({
  id: account.id,
  fullName: account.fullName,
  email: account.email,
  phone: account.phone,
  document: account.document,
  verified: account.verified,
});

/** Cuenta de cliente asociada al token de sesión, o null si no hay sesión vigente. */
export function accountForToken(state, token, security) {
  if (!token) return null;
  const session = findAliveSession(state.accountSessions, security.digest(token));
  return session ? (state.accounts.find((account) => account.id === session.accountId) ?? null) : null;
}

export function requireAccount(state, token, security) {
  const account = accountForToken(state, token, security);
  if (!account)
    throw new DomainError('unauthenticated', 'AUTHENTICATION_REQUIRED', 'Inicia sesión para continuar.');
  return account;
}

/** Campos de cada código temporal guardado en la cuenta (solo su hash, su vencimiento y los intentos fallidos). */
const CODES = {
  verification: {
    hash: 'verificationCodeHash',
    expiresAt: 'verificationExpiresAt',
    attempts: 'verificationAttempts',
    error: ['INVALID_VERIFICATION_CODE', 'El código es incorrecto o venció. Solicita uno nuevo.'],
  },
  reset: {
    hash: 'resetCodeHash',
    expiresAt: 'resetExpiresAt',
    attempts: 'resetAttempts',
    error: ['INVALID_RESET_CODE', 'El código es incorrecto o venció. Solicita uno nuevo.'],
  },
};

/** Respuestas uniformes: no revelan si el correo tiene una cuenta, ni si está verificada (PBI-0098 y PBI-0100). */
const REGISTRATION_MESSAGE = 'Si el correo puede registrarse, enviaremos un código para verificar la cuenta.';
const RESEND_MESSAGE = 'Si la cuenta existe y falta verificarla, enviaremos un código nuevo.';
const RESET_MESSAGE = 'Si el correo está registrado, enviaremos un código de recuperación.';

/**
 * Casos de uso de cuentas de cliente: registro, verificación, sesión, recuperación de contraseña y perfil.
 * `exposeTestCodes` devuelve los códigos temporales en la respuesta (solo para desarrollo y pruebas).
 */
export function createCuentasUseCases({ store, security, exposeTestCodes }) {
  const findByEmail = (email) => store.state.accounts.find((item) => item.email === normalizeEmail(email));
  const withCode = (body, code) => ({ ...body, ...(exposeTestCodes && code ? { testCode: code } : {}) });

  /** Emite un código nuevo: anula el anterior y reinicia los intentos. Devuelve el código, que solo ve el cliente. */
  function issueCode(account, kind) {
    const fields = CODES[kind];
    const code = security.createCode();
    account[fields.hash] = security.digest(code);
    account[fields.expiresAt] = new Date(Date.now() + CODE_TTL_MS).toISOString();
    account[fields.attempts] = 0;
    account.updatedAt = nowIso();
    return code;
  }

  function clearCode(account, kind) {
    const fields = CODES[kind];
    delete account[fields.hash];
    delete account[fields.expiresAt];
    delete account[fields.attempts];
  }

  /**
   * Exige el código vigente. Cada fallo cuenta un intento; al llegar a `MAX_CODE_ATTEMPTS` el código se anula y
   * hay que pedir otro (PBI-0100). La respuesta es la misma para un código incorrecto, vencido o anulado.
   */
  function requireCode(account, kind, code) {
    const fields = CODES[kind];
    if (account && codeIsValid(account[fields.hash], account[fields.expiresAt], security.digest(code)))
      return;
    if (account?.[fields.hash]) {
      account[fields.attempts] = (account[fields.attempts] ?? 0) + 1;
      if (account[fields.attempts] >= MAX_CODE_ATTEMPTS) clearCode(account, kind);
      store.save();
    }
    throw new DomainError('validation', ...fields.error);
  }

  /**
   * Alta con respuesta uniforme (PBI-0100): nunca `ACCOUNT_EXISTS`. Con un correo ya verificado no cambia nada. Con
   * uno sin verificar, solo si su código ya venció se rehace la cuenta con los datos nuevos (PBI-0098): así quien
   * registró un correo ajeno no lo bloquea, y nadie cambia la contraseña de un alta en curso.
   */
  function register(command) {
    requireFields(command, ['fullName', 'email', 'phone', 'document', 'password']);
    const email = requireEmail(command.email);
    const password = requirePassword(command.password);
    // El hash se calcula siempre, para que el alta tarde lo mismo exista o no la cuenta.
    const credential = security.hashPassword(password);
    const existing = store.state.accounts.find((account) => account.email === email);
    if (existing && (existing.verified || !codeExpired(existing.verificationExpiresAt)))
      return withCode({ verificationRequired: true, message: REGISTRATION_MESSAGE });
    const account = existing ?? { id: security.newId(), email, verified: false, createdAt: nowIso() };
    Object.assign(account, {
      fullName: String(command.fullName).trim(),
      phone: String(command.phone).trim(),
      document: String(command.document).trim(),
      passwordSalt: credential.salt,
      passwordHash: credential.hash,
    });
    const code = issueCode(account, 'verification');
    if (!existing) store.state.accounts.push(account);
    store.save();
    return withCode({ verificationRequired: true, message: REGISTRATION_MESSAGE }, code);
  }

  /** Reenvía el código de una cuenta sin verificar (PBI-0098); responde igual en cualquier otro caso. */
  function resendVerification(command) {
    const email = requireEmail(command.email);
    const account = store.state.accounts.find((item) => item.email === email && !item.verified);
    let code;
    if (account) {
      code = issueCode(account, 'verification');
      store.save();
    }
    return withCode({ message: RESEND_MESSAGE }, code);
  }

  function verify(command) {
    requireFields(command, ['email', 'code']);
    const account = findByEmail(command.email);
    requireCode(account, 'verification', command.code);
    account.verified = true;
    clearCode(account, 'verification');
    account.updatedAt = nowIso();
    store.save();
  }

  /** La contraseña se compara siempre, con una credencial ficticia si el correo no existe (PBI-0100). */
  function signIn(command) {
    requireFields(command, ['email', 'password']);
    const account = findByEmail(command.email);
    const credential = account
      ? { salt: account.passwordSalt, hash: account.passwordHash }
      : DUMMY_CREDENTIAL;
    if (!security.passwordMatches(command.password, credential) || !account)
      throw new DomainError('unauthenticated', 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
    if (!account.verified)
      throw new DomainError('forbidden', 'ACCOUNT_NOT_VERIFIED', 'Verifica tu cuenta antes de ingresar.');
    const token = openSession(store.state.accountSessions, 'accountId', account.id, security);
    store.save();
    return { token, user: accountToPublic(account) };
  }

  function signOut(token) {
    const tokenHash = security.digest(token);
    store.state.accountSessions = store.state.accountSessions.filter((item) => item.tokenHash !== tokenHash);
    store.save();
  }

  function requestPasswordReset(command) {
    const email = requireEmail(command.email);
    const account = store.state.accounts.find((item) => item.email === email);
    let code;
    if (account) {
      code = issueCode(account, 'reset');
      store.save();
    }
    return withCode({ message: RESET_MESSAGE }, code);
  }

  /** Cambiar la contraseña revoca todas las sesiones abiertas de la cuenta. */
  function resetPassword(command) {
    requireFields(command, ['email', 'code', 'password']);
    const password = requirePassword(command.password);
    const account = findByEmail(command.email);
    requireCode(account, 'reset', command.code);
    const credential = security.hashPassword(password);
    account.passwordSalt = credential.salt;
    account.passwordHash = credential.hash;
    clearCode(account, 'reset');
    account.updatedAt = nowIso();
    store.state.accountSessions = store.state.accountSessions.filter((item) => item.accountId !== account.id);
    store.save();
  }

  function updateProfile(account, update) {
    requireFields(update, ['fullName', 'phone', 'document']);
    account.fullName = String(update.fullName).trim();
    account.phone = String(update.phone).trim();
    account.document = String(update.document).trim();
    account.updatedAt = nowIso();
    store.save();
    return { user: accountToPublic(account) };
  }

  function deleteAccount(account) {
    store.state.accounts = store.state.accounts.filter((item) => item.id !== account.id);
    store.state.accountSessions = store.state.accountSessions.filter((item) => item.accountId !== account.id);
    store.save();
  }

  return {
    requireAccount: (token) => requireAccount(store.state, token, security),
    currentUser: (token) => ({ user: accountToPublic(requireAccount(store.state, token, security)) }),
    register,
    resendVerification,
    verify,
    signIn,
    signOut,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    deleteAccount,
  };
}
