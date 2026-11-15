import { bearerToken, created, idempotencyKey, ok, readJsonBody } from '../http.mjs';

/**
 * Checkout como invitado o con sesión de cliente (el pedido queda asociado a la cuenta). Con `Idempotency-Key`, un
 * intento ya registrado devuelve `200` con el mismo pedido en lugar de crear otro (PBI-0086). Leído el cuerpo, la
 * búsqueda y la creación son síncronas: dos peticiones con la misma clave no pueden crear dos pedidos.
 */
export const checkoutRoutes = (checkout) => [
  {
    method: 'POST',
    path: '/bff/checkout/orders',
    handle: async ({ req }) => {
      const command = await readJsonBody(req);
      const key = idempotencyKey(req);
      const previous = checkout.replay(key);
      return previous ? ok(previous) : created(checkout.placeOrder(command, bearerToken(req), key));
    },
  },
];
