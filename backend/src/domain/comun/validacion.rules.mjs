import { DomainError } from './domain-error.mjs';

export const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

export function requireFields(value, fields) {
  const missing = fields.filter((field) => !String(value?.[field] ?? '').trim());
  if (missing.length)
    throw new DomainError('validation', 'VALIDATION_ERROR', 'Completa los campos obligatorios.', {
      fields: missing,
    });
}

export function requireEmail(value) {
  const email = normalizeEmail(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new DomainError('validation', 'INVALID_EMAIL', 'Ingresa un correo válido.');
  return email;
}
