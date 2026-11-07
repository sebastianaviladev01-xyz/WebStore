/**
 * Error de negocio tipado. El dominio y la aplicación no conocen HTTP: indican el tipo de falla
 * y la capa Api lo traduce a una respuesta Problem.
 *
 * Tipos: 'validation', 'unauthenticated', 'forbidden', 'not-found', 'conflict'.
 */
export class DomainError extends Error {
  constructor(kind, code, message, details = undefined) {
    super(message);
    this.kind = kind;
    this.code = code;
    this.details = details;
  }
}
