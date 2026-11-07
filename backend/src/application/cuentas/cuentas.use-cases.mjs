import { DomainError } from '../../domain/comun/domain-error.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import { normalizeEmail, requireEmail, requireFields } from '../../domain/comun/validacion.rules.mjs';
import { CODE_TTL_MS, codeIsValid, requirePassword } from '../../domain/cuentas/cuenta.rules.mjs';
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

/**
 * Casos de uso de cuentas de cliente: registro, verificación, sesión, recuperación de contraseña y perfil.
 * `exposeTestCodes` devuelve los códigos temporales en la respuesta (solo para desarrollo y pruebas).
 */
export function createCuentasUseCases({ store, security, exposeTestCodes }) {
  const findByEmail = (email) => store.state.accounts.find((item) => item.email === normalizeEmail(email));

  function register(command) {
    requireFields(command, ['fullName', 'email', 'phone', 'document', 'password']);
    const email = requireEmail(command.email);
    const password = requirePassword(command.password);
    if (store.state.accounts.some((account) => account.email === email))
      throw new DomainError('conflict', 'ACCOUNT_EXISTS', 'Ya existe una cuenta con ese correo.');
    const verificationCode = security.createCode();
    const credential = security.hashPassword(password);
    const account = {
      id: security.newId(),
      fullName: String(command.fullName).trim(),
      email,
      phone: String(command.phone).trim(),
      document: String(command.document).trim(),
      verified: false,
      passwordSalt: credential.salt,
      passwordHash: credential.hash,
      verificationCodeHash: security.digest(verificationCode),
      verificationExpiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    store.state.accounts.push(account);
    store.save();
    return {
      account: accountToPublic(account),
      verificationRequired: true,
      ...(exposeTestCodes ? { testCode: verificationCode } : {}),
    };
  }

  function verify(command) {
    requireFields(command, ['email', 'code']);
    const account = findByEmail(command.email);
    if (
      !account ||
      !codeIsValid(account.verificationCodeHash, account.verificationExpiresAt, security.digest(command.code))
    )
      throw new DomainError(
        'validation',
        'INVALID_VERIFICATION_CODE',
        'El código es incorrecto o venció. Solicita uno nuevo.',
      );
    account.verified = true;
    delete account.verificationCodeHash;
    delete account.verificationExpiresAt;
    account.updatedAt = nowIso();
    store.save();
  }

  function signIn(command) {
    requireFields(command, ['email', 'password']);
    const account = findByEmail(command.email);
    if (
      !account ||
      !security.passwordMatches(command.password, { salt: account.passwordSalt, hash: account.passwordHash })
    )
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
    let resetCode;
    if (account) {
      resetCode = security.createCode();
      account.resetCodeHash = security.digest(resetCode);
      account.resetExpiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
      account.updatedAt = nowIso();
      store.save();
    }
    return {
      message: 'Si el correo está registrado, enviaremos un código de recuperación.',
      ...(exposeTestCodes && resetCode ? { testCode: resetCode } : {}),
    };
  }

  /** Cambiar la contraseña revoca todas las sesiones abiertas de la cuenta. */
  function resetPassword(command) {
    requireFields(command, ['email', 'code', 'password']);
    const password = requirePassword(command.password);
    const account = findByEmail(command.email);
    if (
      !account ||
      !codeIsValid(account.resetCodeHash, account.resetExpiresAt, security.digest(command.code))
    )
      throw new DomainError(
        'validation',
        'INVALID_RESET_CODE',
        'El código es incorrecto o venció. Solicita uno nuevo.',
      );
    const credential = security.hashPassword(password);
    account.passwordSalt = credential.salt;
    account.passwordHash = credential.hash;
    delete account.resetCodeHash;
    delete account.resetExpiresAt;
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
    verify,
    signIn,
    signOut,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    deleteAccount,
  };
}
