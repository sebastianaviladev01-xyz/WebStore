/** El BFF rechazó la solicitud o no respondió; el mensaje ya está listo para mostrarse al cliente. */
export class BffRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export function messageOf(error: unknown, fallback: string): string {
  return error instanceof BffRequestError ? error.message : fallback;
}
