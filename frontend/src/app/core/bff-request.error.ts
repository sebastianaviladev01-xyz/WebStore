/** El BFF rechazó la solicitud o no respondió; el mensaje ya está listo para mostrarse al cliente. */
export class BffRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
    /** `error.details` del problema del BFF, si lo trae (por ejemplo, `fields` y `productId`). */
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function messageOf(error: unknown, fallback: string): string {
  return error instanceof BffRequestError ? error.message : fallback;
}
