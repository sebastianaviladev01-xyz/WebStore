import { Rol } from './rol.rules';

export interface UsuarioAdmin {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Rol;
  readonly active: boolean;
  readonly temporaryPassword?: string;
}
