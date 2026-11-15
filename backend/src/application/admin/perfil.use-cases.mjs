import { DomainError } from '../../domain/comun/domain-error.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { normalizeEmail, requireEmail, requireFields } from '../../domain/comun/validacion.rules.mjs';
import { requirePassword } from '../../domain/cuentas/cuenta.rules.mjs';
import { adminUserToPublic } from './admin.views.mjs';

/**
 * Perfil propio del Admin (lote 07b, ADR-0017, PBI-0034; provisional, por confirmar con Daniel): los tres roles editan
 * su nombre y su correo y cambian su contraseña, con una ruta propia que no pasa por el snapshot. La sesión se valida
 * antes de mirar los datos.
 */
export function createPerfilUseCases({ store, security, adminSesiones }) {
  function actualizarDatos(token, command) {
    const { user } = adminSesiones.requireAdmin(token);
    requireFields(command, ['name', 'email']);
    const email = requireEmail(command.email);
    const { state } = store;
    if (state.users.some((otro) => otro.id !== user.id && normalizeEmail(otro.email) === email))
      throw new DomainError('conflict', 'ADMIN_EMAIL_TAKEN', 'Ese correo ya lo usa otro usuario del panel.');
    user.name = String(command.name).trim();
    user.email = email;
    // Los usuarios viajan en el snapshot: un guardado de Usuarios abierto antes debe ver el cambio (STALE_SNAPSHOT).
    bumpRevision(state);
    store.save();
    return { user: adminUserToPublic(user) };
  }

  /** Pide la contraseña actual y una fuerte; cierra las demás sesiones de esa persona y conserva la actual. */
  function cambiarContrasena(token, command) {
    const { user, session } = adminSesiones.requireAdmin(token);
    requireFields(command, ['currentPassword', 'newPassword']);
    const { state } = store;
    const credential = state.adminCredentials.find((item) => item.userId === user.id);
    if (!credential || !security.passwordMatches(command.currentPassword, credential))
      throw new DomainError('validation', 'INVALID_CURRENT_PASSWORD', 'La contraseña actual no es correcta.');
    const password = requirePassword(command.newPassword);
    Object.assign(credential, security.hashPassword(password));
    state.adminSessions = state.adminSessions.filter(
      (item) => item.userId !== user.id || item.id === session.id,
    );
    store.save();
  }

  return { actualizarDatos, cambiarContrasena };
}
