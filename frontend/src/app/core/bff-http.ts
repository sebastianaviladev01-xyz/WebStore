import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { BffRequestError } from './bff-request.error';

const ORDER_TOKEN_HEADER = 'x-order-token';
const OFFLINE_MESSAGE = 'No pudimos conectar con la tienda. Revisa tu conexión e inténtalo nuevamente.';

/** Credenciales que acepta el BFF: sesión de cliente y, para invitados, el token de un pedido. */
export function bffHeaders(sessionToken?: string | null, orderToken?: string | null): HttpHeaders {
  let headers = new HttpHeaders();
  if (sessionToken) headers = headers.set('authorization', `Bearer ${sessionToken}`);
  if (orderToken) headers = headers.set(ORDER_TOKEN_HEADER, orderToken);
  return headers;
}

/** Traduce el problema HTTP del BFF ({ error: { code, message } }) a un error de dominio. */
export function toBffRequestError(error: unknown, fallback: string): BffRequestError {
  if (!(error instanceof HttpErrorResponse)) return new BffRequestError(fallback);
  if (error.status === 0) return new BffRequestError(OFFLINE_MESSAGE, 'OFFLINE', 0);
  const problem = error.error?.error ?? error.error;
  return new BffRequestError(problem?.message ?? fallback, problem?.code, error.status);
}

/** Ejecuta una llamada al BFF y convierte cualquier fallo en BffRequestError. */
export async function callBff<T>(request: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw toBffRequestError(error, fallback);
  }
}
