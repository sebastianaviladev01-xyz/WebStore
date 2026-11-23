import { bearerToken, created, noContent, ok, readJsonBody } from '../http.mjs';

/**
 * Panel administrativo: sesión, snapshot por rol, guardado con control de revisión y reinicio; desde el lote 07b,
 * perfil propio (PBI-0034) y notificaciones (PBI-0033; desde el lote 13, PBI-0173, el caso de uso decide qué avisos ve
 * cada rol). Cada ruta valida la sesión y el permiso antes de leer el cuerpo.
 */
export const adminRoutes = (adminSesiones, snapshot, perfil, notificaciones) => [
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
    method: 'PATCH',
    path: '/bff/admin/profile',
    handle: async ({ req }) => {
      const token = bearerToken(req);
      adminSesiones.requireAdmin(token);
      return ok(perfil.actualizarDatos(token, await readJsonBody(req)));
    },
  },
  {
    method: 'PUT',
    path: '/bff/admin/profile/password',
    handle: async ({ req }) => {
      const token = bearerToken(req);
      adminSesiones.requireAdmin(token);
      perfil.cambiarContrasena(token, await readJsonBody(req));
      return noContent();
    },
  },
  {
    method: 'GET',
    path: '/bff/admin/notifications',
    handle: ({ req }) => ok(notificaciones.get(adminSesiones.requireAdmin(bearerToken(req)).user)),
  },
  {
    method: 'PUT',
    path: '/bff/admin/notifications/seen',
    handle: async ({ req }) => {
      const { user } = adminSesiones.requireAdmin(bearerToken(req));
      return ok(notificaciones.marcarVisto(user, await readJsonBody(req)));
    },
  },
  {
    method: 'POST',
    path: '/bff/admin/reset',
    handle: ({ req }) => ok(snapshot.reset(adminSesiones.requireAdmin(bearerToken(req), 'store.reset').user)),
  },
];
