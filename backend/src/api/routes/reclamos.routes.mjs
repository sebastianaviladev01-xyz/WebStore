import { created, readJsonBody } from '../http.mjs';

/** Libro de reclamaciones. */
export const reclamosRoutes = (reclamos) => [
  {
    method: 'POST',
    path: '/bff/complaints',
    handle: async ({ req }) => created(reclamos.register(await readJsonBody(req))),
  },
];
