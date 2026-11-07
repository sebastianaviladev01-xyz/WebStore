import { releaseStock, reserveStock } from '../catalogo/inventario.rules.mjs';
import { nowIso } from '../comun/reloj.mjs';
import { normalizeEmail } from '../comun/validacion.rules.mjs';

/** El cliente puede cambiar despacho, fecha o cancelar dentro de las 24 horas posteriores a la compra. */
export const ORDER_MODIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export const roundMoney = (value) => Math.round(value * 100) / 100;

export function canModify(order) {
  return (
    Date.now() - new Date(order.createdAt).getTime() <= ORDER_MODIFICATION_WINDOW_MS &&
    order.status !== 'cancelled'
  );
}

/** Un pedido pertenece a la cuenta que lo hizo o a la cuenta verificada con el mismo correo. */
export const orderBelongsTo = (order, account) =>
  order.accountId === account.id ||
  (account.verified && normalizeEmail(order.customer.email) === account.email);

/**
 * Cambia el estado del pedido: cancelar libera su stock y reactivar un cancelado lo vuelve a reservar.
 * Devuelve la lista de productos resultante.
 */
export function changeOrderStatus(order, status, products) {
  if (order.status === status) return products;
  let nextProducts = products;
  if (status === 'cancelled') nextProducts = releaseStock(products, order.items);
  else if (order.status === 'cancelled')
    nextProducts = reserveStock(
      products,
      order.items.map((item) => ({ productId: item.productId ?? item.product?.id, quantity: item.quantity })),
    );
  order.status = status;
  order.updatedAt = nowIso();
  return nextProducts;
}
