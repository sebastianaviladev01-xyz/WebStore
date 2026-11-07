import { UsuarioAdmin } from './usuario-admin.model';

export interface SesionConcedida {
  readonly token: string;
  readonly user: UsuarioAdmin;
}

/** Credenciales rechazadas o BFF inalcanzable; el mensaje ya está listo para mostrarse. */
export class SesionError extends Error {}

/** Puerto de autenticación del Admin: la capa de aplicación no conoce HTTP. */
export abstract class SesionGateway {
  abstract login(email: string, password: string): Promise<SesionConcedida>;
  abstract current(token: string): Promise<UsuarioAdmin>;
  abstract logout(token: string): Promise<void>;
}
