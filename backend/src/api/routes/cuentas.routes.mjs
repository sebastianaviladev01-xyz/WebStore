import { accepted, bearerToken, created, noContent, ok, readJsonBody } from '../http.mjs';

/** Cuentas de cliente: registro, verificación, sesión, recuperación de contraseña y perfil. */
export const cuentasRoutes = (cuentas) => [
  {
    method: 'POST',
    path: '/bff/accounts',
    handle: async ({ req }) => created(cuentas.register(await readJsonBody(req))),
  },
  {
    method: 'POST',
    path: '/bff/account-verification-requests',
    handle: async ({ req }) => accepted(cuentas.resendVerification(await readJsonBody(req))),
  },
  {
    method: 'POST',
    path: '/bff/account-verifications',
    handle: async ({ req }) => {
      cuentas.verify(await readJsonBody(req));
      return noContent();
    },
  },
  {
    method: 'POST',
    path: '/bff/account-sessions',
    handle: async ({ req }) => created(cuentas.signIn(await readJsonBody(req))),
  },
  {
    method: 'GET',
    path: '/bff/account-sessions/current',
    handle: ({ req }) => ok(cuentas.currentUser(bearerToken(req))),
  },
  {
    method: 'DELETE',
    path: '/bff/account-sessions/current',
    handle: ({ req }) => {
      cuentas.signOut(bearerToken(req));
      return noContent();
    },
  },
  {
    method: 'POST',
    path: '/bff/password-reset-requests',
    handle: async ({ req }) => accepted(cuentas.requestPasswordReset(await readJsonBody(req))),
  },
  {
    method: 'POST',
    path: '/bff/password-resets',
    handle: async ({ req }) => {
      cuentas.resetPassword(await readJsonBody(req));
      return noContent();
    },
  },
  {
    method: 'PATCH',
    path: '/bff/accounts/current',
    handle: async ({ req }) => {
      // La sesión se valida antes de leer el cuerpo.
      const account = cuentas.requireAccount(bearerToken(req));
      return ok(cuentas.updateProfile(account, await readJsonBody(req)));
    },
  },
  {
    method: 'DELETE',
    path: '/bff/accounts/current',
    handle: ({ req }) => {
      cuentas.deleteAccount(cuentas.requireAccount(bearerToken(req)));
      return noContent();
    },
  },
];
