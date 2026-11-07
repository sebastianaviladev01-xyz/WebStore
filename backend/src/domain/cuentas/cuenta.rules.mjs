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

/** Un código temporal vale si coincide con el emitido y todavía no venció. */
export const codeIsValid = (expectedHash, expiresAt, candidateHash) =>
  expectedHash === candidateHash && !(new Date(expiresAt).getTime() < Date.now());
