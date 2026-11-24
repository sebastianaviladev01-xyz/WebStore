import { DomainError } from '../../domain/comun/domain-error.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import { conEvento, eventoEstadoDePedido } from '../../domain/admin/actividad.rules.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { requireShippingRate } from '../../domain/envios/tarifa-envio.rules.mjs';
import { pickShipping, requireDeliveryDate } from '../../domain/pedidos/datos-del-pedido.rules.mjs';
import { destinosDelPedido, envioPorDestinos } from '../../domain/pedidos/direcciones-por-producto.rules.mjs';
import {
  canModify,
  changeOrderStatus,
  isOrderOpen,
  orderAmounts,
  orderBelongsTo,
} from '../../domain/pedidos/pedido.rules.mjs';
import { primeraFechaDeLaTienda } from '../../domain/pedidos/primera-fecha-de-entrega.rules.mjs';
import { accountForToken, requireAccount } from '../cuentas/cuentas.use-cases.mjs';

/** Vista pública del pedido: nunca expone el hash del token de acceso, el de la clave de idempotencia ni la cuenta. */
export const orderToPublic = ({ accessTokenHash, idempotencyKeyHash, accountId, ...order }) => order;

/**
 * Consulta y modificación de pedidos por su dueño: la cuenta (token Bearer) o el invitado
 * con el token de acceso entregado en el checkout.
 */
export function createPedidosUseCases({ store, security, now = () => new Date() }) {
  function listMine(bearerToken) {
    const account = requireAccount(store.state, bearerToken, security);
    return store.state.orders.filter((order) => orderBelongsTo(order, account)).map(orderToPublic);
  }

  function requireOrderAccess(id, { bearerToken, orderToken }) {
    const order = store.state.orders.find((candidate) => candidate.id === id);
    const account = accountForToken(store.state, bearerToken, security);
    const allowed =
      order &&
      ((account && orderBelongsTo(order, account)) ||
        (orderToken && order.accessTokenHash === security.digest(orderToken)));
    // Misma respuesta para inexistente y no autorizado: no revela códigos de pedido válidos.
    if (!allowed) throw new DomainError('not-found', 'ORDER_NOT_FOUND', 'Pedido no encontrado.');
    return order;
  }

  function requireModifiableOrder(id, credentials) {
    const order = requireOrderAccess(id, credentials);
    if (!isOrderOpen(order))
      throw new DomainError(
        'conflict',
        'ORDER_NOT_MODIFIABLE',
        'El pedido ya se envió, se entregó o se canceló: no se puede cambiar.',
      );
    if (!canModify(order, now()))
      throw new DomainError('conflict', 'ORDER_WINDOW_EXPIRED', 'La ventana de modificación ya venció.');
    return order;
  }

  function changeShipping(order, data) {
    const shipping = pickShipping(data);
    const rate = requireShippingRate(store.state.rates, shipping.district);
    // Lote 19 (PBI-0006): las líneas con su propia dirección la conservan; el envío vuelve a cobrarse una vez por
    // destino distinto. Sin direcciones por línea, es la tarifa de la nueva dirección, como siempre.
    const { shippingCost } = envioPorDestinos(
      store.state.rates,
      destinosDelPedido(shipping, order.items ?? []),
    );
    order.shipping = shipping;
    order.shippingOrigin = rate.origin;
    order.shippingCost = shippingCost;
    order.total = orderAmounts(order.subtotal, shippingCost).total;
    order.updatedAt = nowIso();
  }

  /**
   * Desde la primera fecha de entrega de la tienda (lote 17, PBI-0178); la fecha vigente del pedido se acepta sin
   * cambios (la tienda la reenvía con la dirección).
   */
  function changeDeliveryDate(order, data) {
    order.deliveryDate = requireDeliveryDate(
      data.deliveryDate,
      primeraFechaDeLaTienda(store.state, now()),
      order.deliveryDate,
    );
    order.updatedAt = nowIso();
  }

  /** Aplica la acción (shipping, delivery-date o cancel) sobre un pedido ya autorizado y modificable. */
  function modify(order, action, data) {
    if (action === 'shipping') changeShipping(order, data.shipping);
    if (action === 'delivery-date') changeDeliveryDate(order, data);
    if (action === 'cancel') {
      store.state.products = changeOrderStatus(order, 'cancelled', store.state.products);
      // PBI-0028: el cliente canceló desde la tienda.
      store.state.activity = conEvento(
        store.state.activity ?? [],
        eventoEstadoDePedido({ at: nowIso() }, order, 'cancelled', 'cliente'),
      );
    }
    bumpRevision(store.state);
    store.save();
    return orderToPublic(order);
  }

  return {
    listMine,
    getOrder: (id, credentials) => orderToPublic(requireOrderAccess(id, credentials)),
    requireModifiableOrder,
    modify,
  };
}
