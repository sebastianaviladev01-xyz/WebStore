import { DomainError } from '../../domain/comun/domain-error.mjs';
import { limaDate, nowIso } from '../../domain/comun/reloj.mjs';
import { conEvento, eventoEstadoDePedido } from '../../domain/admin/actividad.rules.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { bestShippingRate } from '../../domain/envios/tarifa-envio.rules.mjs';
import { pickShipping, requireDeliveryDate } from '../../domain/pedidos/datos-del-pedido.rules.mjs';
import {
  canModify,
  changeOrderStatus,
  isOrderOpen,
  orderBelongsTo,
  roundMoney,
} from '../../domain/pedidos/pedido.rules.mjs';
import { accountForToken, requireAccount } from '../cuentas/cuentas.use-cases.mjs';

/** Vista pública del pedido: nunca expone el hash del token de acceso, el de la clave de idempotencia ni la cuenta. */
export const orderToPublic = ({ accessTokenHash, idempotencyKeyHash, accountId, ...order }) => order;

/**
 * Consulta y modificación de pedidos por su dueño: la cuenta (token Bearer) o el invitado
 * con el token de acceso entregado en el checkout.
 */
export function createPedidosUseCases({ store, security }) {
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
    if (!canModify(order))
      throw new DomainError('conflict', 'ORDER_WINDOW_EXPIRED', 'La ventana de modificación ya venció.');
    return order;
  }

  function changeShipping(order, data) {
    const shipping = pickShipping(data);
    const rate = bestShippingRate(store.state.rates, shipping.district);
    if (!rate)
      throw new DomainError(
        'validation',
        'SHIPPING_UNAVAILABLE',
        'Todavía no contamos con una tarifa para ese destino.',
      );
    order.shipping = shipping;
    order.shippingOrigin = rate.origin;
    order.shippingCost = rate.price;
    order.total = roundMoney(order.subtotal + rate.price);
    order.updatedAt = nowIso();
  }

  /** Desde hoy en Lima; la fecha vigente del pedido se acepta sin cambios (la tienda la reenvía con la dirección). */
  function changeDeliveryDate(order, data) {
    order.deliveryDate = requireDeliveryDate(data.deliveryDate, limaDate(), order.deliveryDate);
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
