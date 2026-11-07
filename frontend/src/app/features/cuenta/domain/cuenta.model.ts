export interface CuentaCliente {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly document: string;
  readonly verified: boolean;
}

export interface RegistrarCuentaCommand {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly document: string;
  readonly password: string;
}
