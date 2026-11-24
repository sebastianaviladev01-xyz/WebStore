import { bearerToken, created, idempotencyKey, ok, readJsonBody } from '../http.mjs';

/**
 * Checkout como invitado o con sesión de cliente (el pedido queda asociado a la cuenta). Con `Idempotency-Key`, un
 * intento ya registrado devuelve `200` con el mismo pedido en lugar de crear otro (PBI-0086). Leído el cuerpo, la
 * búsqueda y la creación son síncronas: dos peticiones con la misma clave no pueden crear dos pedidos.
 */
export const checkoutRoutes = (checkout) => [
  // Lote 17 (ADR-0021, PBI-0178): la primera fecha de entrega que el comprador puede elegir ahora.
  { method: 'GET', path: '/bff/checkout/delivery-dates', handle: () => ok(checkout.firstDeliveryDate()) },
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
