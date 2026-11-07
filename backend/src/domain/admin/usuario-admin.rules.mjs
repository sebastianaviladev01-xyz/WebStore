import { DomainError } from '../comun/domain-error.mjs';
import { isAdminRole } from '../sesion/rol.rules.mjs';

/**
 * La lista de usuarios del Admin usa solo roles fijos, conserva al menos un superadministrador activo
 * y no deja a quien guarda sin su propia cuenta ni su rol.
 */
export function requireValidAdminUsers(users, actor) {
  if (!Array.isArray(users))
    throw new DomainError('validation', 'INVALID_USERS', 'La lista de usuarios no es válida.');
  if (users.some((user) => !isAdminRole(user.role)))
    throw new DomainError(
      'validation',
      'INVALID_ROLE',
      'Asigna uno de los roles disponibles: superadmin, admin o vendedor.',
    );
  if (!users.some((user) => user.role === 'superadmin' && user.active))
    throw new DomainError(
      'conflict',
      'LAST_SUPERADMIN',
      'Debe quedar al menos un superadministrador activo.',
    );
  if (!users.some((user) => user.id === actor.id && user.active && user.role === actor.role))
    throw new DomainError(
      'conflict',
      'SELF_LOCKOUT',
      'No puedes eliminar, desactivar ni cambiar el rol de tu propia cuenta.',
    );
}
