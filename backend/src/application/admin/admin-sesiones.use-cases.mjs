import { DomainError } from '../../domain/comun/domain-error.mjs';
import { normalizeEmail, requireFields } from '../../domain/comun/validacion.rules.mjs';
import { DUMMY_CREDENTIAL } from '../../domain/cuentas/cuenta.rules.mjs';
import { can } from '../../domain/sesion/rol.rules.mjs';
import { findAliveSession } from '../../domain/sesion/sesion.rules.mjs';
import { openSession } from '../sesion/sesiones.mjs';
import { adminUserToPublic } from './admin.views.mjs';

/** Sesiones del panel administrativo: solo usuarios activos con un rol fijo. */
export function createAdminSesionesUseCases({ store, security }) {
  function adminForToken(token) {
    if (!token) return null;
    const { state } = store;
    const session = findAliveSession(state.adminSessions, security.digest(token));
    const user = session ? state.users.find((item) => item.id === session.userId && item.active) : null;
    return user ? { session, user } : null;
  }

  function requireAdmin(token, permission = 'dashboard.view') {
    const auth = adminForToken(token);
    if (!auth)
      throw new DomainError(
        'unauthenticated',
        'ADMIN_AUTHENTICATION_REQUIRED',
        'Inicia sesión en el panel administrativo.',
      );
    if (!can(auth.user.role, permission))
      throw new DomainError('forbidden', 'INSUFFICIENT_ROLE', 'Tu rol no permite realizar esta acción.');
    return auth;
  }

  function signIn(command) {
    requireFields(command, ['email', 'password']);
    const { state } = store;
    const email = normalizeEmail(command.email);
    const user = state.users.find(
      (candidate) => normalizeEmail(candidate.email) === email && candidate.active,
    );
    // La contraseña se compara siempre, con una credencial ficticia si no hay usuario activo con ese correo, para
    // que la respuesta tarde lo mismo exista o no (PBI-0100).
    const credential =
      (user && state.adminCredentials.find((candidate) => candidate.userId === user.id)) ?? DUMMY_CREDENTIAL;
    if (!security.passwordMatches(command.password, credential) || !user)
      throw new DomainError(
        'unauthenticated',
        'INVALID_ADMIN_CREDENTIALS',
        'Correo o contraseña incorrectos.',
      );
    const token = openSession(state.adminSessions, 'userId', user.id, security);
    store.save();
    return { token, user: adminUserToPublic(user) };
  }

  function signOut(token) {
    const tokenHash = security.digest(token);
    store.state.adminSessions = store.state.adminSessions.filter((item) => item.tokenHash !== tokenHash);
    store.save();
  }

  return {
    requireAdmin,
    currentUser: (token) => ({ user: adminUserToPublic(requireAdmin(token).user) }),
    signIn,
    signOut,
  };
}
