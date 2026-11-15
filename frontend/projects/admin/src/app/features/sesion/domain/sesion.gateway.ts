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

/**
 * El BFF no respondió (sin conexión, `0`) o falló (`5xx`) en una operación del panel (lote 08, PBI-0134). Es lo que
 * sale de `data/` en lugar del `HttpErrorResponse` de Angular, que no es del dominio: la facade lo trata como
 * cualquier otro fallo y muestra su aviso.
 */
export class ServicioNoDisponibleError extends Error {
  constructor(readonly status: number) {
    super(`BFF_NO_DISPONIBLE_${status}`);
  }
}

/** Aviso del acceso cuando la sesión venció a mitad de una operación (PBI-0124). */
export const AVISO_SESION_VENCIDA = 'Tu sesión venció. Vuelve a iniciar sesión para continuar.';

/**
 * El BFF rechazó un cambio del perfil propio (lote 07b, PBI-0034): el mensaje ya está listo para mostrarse y `campo`
 * dice junto a qué campo va (`email` o `currentPassword`), si corresponde a uno.
 */
export class PerfilError extends Error {
  constructor(
    message: string,
    readonly campo: 'email' | 'currentPassword' | 'newPassword' | null = null,
  ) {
    super(message);
  }
}

/** Puerto de autenticación del Admin: la capa de aplicación no conoce HTTP. */
export abstract class SesionGateway {
  abstract login(email: string, password: string): Promise<SesionConcedida>;
  abstract current(token: string): Promise<UsuarioAdmin>;
  abstract logout(token: string): Promise<void>;
  /** `PATCH /bff/admin/profile` (lote 07b, PBI-0034): devuelve el usuario con sus datos nuevos. */
  abstract actualizarPerfil(
    datos: { readonly name: string; readonly email: string },
    token: string,
  ): Promise<UsuarioAdmin>;
  /** `PUT /bff/admin/profile/password` (lote 07b, PBI-0034): cierra las demás sesiones de la persona. */
  abstract cambiarContrasena(actual: string, nueva: string, token: string): Promise<void>;
}
