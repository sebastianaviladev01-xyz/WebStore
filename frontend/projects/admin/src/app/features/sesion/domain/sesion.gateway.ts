import { UsuarioAdmin } from './usuario-admin.model';

export interface SesionConcedida {
  readonly token: string;
  readonly user: UsuarioAdmin;
}

/** Credenciales rechazadas o BFF inalcanzable; el mensaje ya está listo para mostrarse. */
export class SesionError extends Error {}

/**
 * El BFF ya no reconoce la sesión (`401`: venció, se cerró o se desactivó el usuario) a mitad de una operación
 * (lote 06, PBI-0124). Lo lanzan los adaptadores de las features; la facade lo traduce en `SesionFacade.expirar()`.
 */
export class SesionVencidaError extends Error {
  constructor() {
    super('ADMIN_AUTHENTICATION_REQUIRED');
  }
}

/** Aviso del acceso cuando la sesión venció a mitad de una operación (PBI-0124). */
export const AVISO_SESION_VENCIDA = 'Tu sesión venció. Vuelve a iniciar sesión para continuar.';

/** Puerto de autenticación del Admin: la capa de aplicación no conoce HTTP. */
export abstract class SesionGateway {
  abstract login(email: string, password: string): Promise<SesionConcedida>;
  abstract current(token: string): Promise<UsuarioAdmin>;
  abstract logout(token: string): Promise<void>;
}
