import { DomainError } from '../comun/domain-error.mjs';
import { can, isAdminRole, managedUserRoles } from '../sesion/rol.rules.mjs';

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

const CAMPOS_DEL_USUARIO = ['name', 'email', 'role', 'active'];
const mismoUsuario = (a, b) => CAMPOS_DEL_USUARIO.every((campo) => a[campo] === b[campo]);

/**
 * Alcance de quien gestiona usuarios (lote 07, PBI-0013): solo crea, cambia o deja en un rol los usuarios de los roles
 * que gestiona (el administrador, los vendedores), los demás deben quedar como estaban, y solo elimina usuarios con
 * `users.delete`. `previous` es la lista vigente y `next`, la que resultaría del guardado.
 */
export function requireUsersInScope(previous, next, actorRole) {
  const gestionables = new Set(managedUserRoles(actorRole));
  // Un rol que no es de los fijos lo rechaza `requireValidAdminUsers` con `INVALID_ROLE`.
  const fueraDeAlcance = (role) => isAdminRole(role) && !gestionables.has(role);
  const fuera = (mensaje) => new DomainError('forbidden', 'USER_SCOPE_VIOLATION', mensaje);
  const soloVendedores = 'Tu rol solo puede gestionar usuarios con rol Vendedor.';
  const nextById = new Map(next.map((user) => [user.id, user]));
  const previousById = new Map(previous.map((user) => [user.id, user]));
  for (const user of previous) {
    const despues = nextById.get(user.id);
    if (!despues) {
      if (!can(actorRole, 'users.delete'))
        throw fuera('Tu rol no puede eliminar usuarios. Desactívalo para quitarle el acceso.');
      if (fueraDeAlcance(user.role)) throw fuera(soloVendedores);
    } else if (fueraDeAlcance(user.role) && !mismoUsuario(user, despues)) throw fuera(soloVendedores);
  }
  for (const user of next) {
    const antes = previousById.get(user.id);
    if (fueraDeAlcance(user.role) && (!antes || !mismoUsuario(antes, user))) throw fuera(soloVendedores);
  }
}
