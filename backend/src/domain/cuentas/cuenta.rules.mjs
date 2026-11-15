import { DomainError } from '../comun/domain-error.mjs';

/** Vigencia de los códigos de verificación y de recuperación de contraseña. */
export const CODE_TTL_MS = 15 * 60 * 1000;

export function requirePassword(value) {
  const password = String(value ?? '');
  if (password.length < 10 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(password) || !/\d/.test(password)) {
    throw new DomainError(
      'validation',
      'WEAK_PASSWORD',
      'Usa al menos 10 caracteres e incluye una letra y un número.',
    );
  }
  return password;
}

/** Intentos fallidos que admite un código de seis dígitos antes de anularse (PBI-0100). */
export const MAX_CODE_ATTEMPTS = 5;

/** El código venció (o no hay vencimiento guardado). */
export const codeExpired = (expiresAt) => !expiresAt || new Date(expiresAt).getTime() < Date.now();

/** Un código temporal vale si coincide con el emitido y todavía no venció. */
export const codeIsValid = (expectedHash, expiresAt, candidateHash) =>
  Boolean(expectedHash) && expectedHash === candidateHash && !codeExpired(expiresAt);

/**
 * Credencial ficticia con la forma de una real: el ingreso la compara cuando el correo no existe, para tardar lo
 * mismo que con uno que sí (PBI-0100). Ninguna contraseña coincide con ella.
 */
export const DUMMY_CREDENTIAL = Object.freeze({ salt: '0'.repeat(32), hash: '0'.repeat(128) });
