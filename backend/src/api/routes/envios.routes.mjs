import { ok } from '../http.mjs';

/** Tarifas de envío compartidas y cotización por destino. */
export const enviosRoutes = (envios) => [
  { method: 'GET', path: '/bff/shipping/rates', handle: () => ok(envios.listRates()) },
  {
    method: 'GET',
    path: '/bff/shipping/quote',
    handle: ({ url }) =>
      ok(envios.quote(url.searchParams.get('destination'), url.searchParams.get('origin'))),
  },
];
