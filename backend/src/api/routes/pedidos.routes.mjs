import { bearerToken, ok, orderToken, readJsonBody } from '../http.mjs';

const credentialsOf = (req) => ({ bearerToken: bearerToken(req), orderToken: orderToken(req) });

/** Pedidos del cliente: por cuenta (Bearer) o por el token de acceso del invitado (x-order-token). */
export const pedidosRoutes = (pedidos) => [
  { method: 'GET', path: '/bff/orders', handle: ({ req }) => ok(pedidos.listMine(bearerToken(req))) },
  {
    method: 'GET',
    path: /^\/bff\/orders\/[^/]+$/,
    handle: ({ req, path }) =>
      ok(pedidos.getOrder(decodeURIComponent(path.split('/').pop()), credentialsOf(req))),
  },
  {
    method: 'PATCH',
    path: /^\/bff\/orders\/[^/]+\/(shipping|delivery-date|cancel)$/,
    handle: async ({ req, path }) => {
      const parts = path.split('/');
      const id = decodeURIComponent(parts[3]);
      const action = parts[4];
      // Acceso y ventana de 24 horas se validan antes de leer el cuerpo.
      const order = pedidos.requireModifiableOrder(id, credentialsOf(req));
      return ok(pedidos.modify(order, action, await readJsonBody(req)));
    },
  },
];
