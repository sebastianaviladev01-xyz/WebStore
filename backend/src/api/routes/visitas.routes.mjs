import { noContent, readJsonBody } from '../http.mjs';

/** Latido de la tienda (lote 07b, PBI-0027): público, sin cookie; solo el identificador aleatorio de la pestaña. */
export const visitasRoutes = (visitas) => [
  {
    method: 'POST',
    path: '/bff/visits',
    handle: async ({ req }) => {
      visitas.registrar(await readJsonBody(req));
      return noContent();
    },
  },
];
