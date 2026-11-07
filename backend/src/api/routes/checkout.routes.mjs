import { bearerToken, created, readJsonBody } from '../http.mjs';

/** Checkout como invitado o con sesión de cliente (el pedido queda asociado a la cuenta). */
export const checkoutRoutes = (checkout) => [
  {
    method: 'POST',
    path: '/bff/checkout/orders',
    handle: async ({ req }) => created(checkout.placeOrder(await readJsonBody(req), bearerToken(req))),
  },
];
