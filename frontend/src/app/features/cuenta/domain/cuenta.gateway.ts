import { CuentaCliente, RegistrarCuentaCommand } from './cuenta.model';

export interface SesionCuenta {
  readonly token: string;
  readonly user: CuentaCliente;
}

/** En desarrollo el BFF puede devolver el código de verificación para probar sin correo real. */
export interface EntregaCodigo {
  readonly testCode?: string;
}

export type CambioPerfil = Pick<CuentaCliente, 'fullName' | 'phone' | 'document'>;

/**
 * Puerto de cuentas de cliente. Los fallos llegan como BffRequestError; una sesión vencida o revocada, con
 * `status` 401 (PBI-0114).
 */
export abstract class CuentaGateway {
  abstract register(command: RegistrarCuentaCommand): Promise<EntregaCodigo>;
  /** Pide un código nuevo para una cuenta sin verificar; la respuesta es la misma exista o no (PBI-0098). */
  abstract resendVerification(email: string): Promise<EntregaCodigo>;
  abstract verify(email: string, code: string): Promise<void>;
  abstract login(email: string, password: string): Promise<SesionCuenta>;
  abstract logout(token: string): Promise<void>;
  abstract current(token: string): Promise<CuentaCliente>;
  abstract requestPasswordReset(email: string): Promise<EntregaCodigo>;
  abstract resetPassword(email: string, code: string, password: string): Promise<void>;
  abstract updateProfile(token: string, update: CambioPerfil): Promise<CuentaCliente>;
  abstract deleteAccount(token: string): Promise<void>;
}
