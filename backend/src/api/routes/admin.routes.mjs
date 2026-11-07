import { bearerToken, created, noContent, ok, readJsonBody } from '../http.mjs';

/** Panel administrativo: sesión, snapshot por rol, guardado con control de revisión y reinicio. */
export const adminRoutes = (adminSesiones, snapshot) => [
  {
    method: 'POST',
    path: '/bff/admin/sessions',
    handle: async ({ req }) => created(adminSesiones.signIn(await readJsonBody(req))),
  },
  {
    method: 'GET',
    path: '/bff/admin/sessions/current',
    handle: ({ req }) => ok(adminSesiones.currentUser(bearerToken(req))),
  },
  {
    method: 'DELETE',
    path: '/bff/admin/sessions/current',
    handle: ({ req }) => {
      adminSesiones.signOut(bearerToken(req));
      return noContent();
    },
  },
  {
    method: 'GET',
    path: '/bff/admin/snapshot',
    handle: ({ req }) => ok(snapshot.get(adminSesiones.requireAdmin(bearerToken(req)).user)),
  },
  {
    method: 'PUT',
    path: '/bff/admin/snapshot',
    handle: async ({ req }) => {
      // La sesión se valida antes de leer el cuerpo.
      const { user } = adminSesiones.requireAdmin(bearerToken(req));
      return ok(snapshot.save(user, await readJsonBody(req)));
    },
  },
  {
    method: 'POST',
    path: '/bff/admin/reset',
    handle: ({ req }) => ok(snapshot.reset(adminSesiones.requireAdmin(bearerToken(req), 'store.reset').user)),
  },
];
