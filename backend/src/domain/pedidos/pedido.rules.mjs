import { releaseStock, reserveStock } from '../catalogo/inventario.rules.mjs';
import { nowIso } from '../comun/reloj.mjs';
import { normalizeEmail } from '../comun/validacion.rules.mjs';

/** El cliente puede cambiar despacho, fecha o cancelar dentro de las 24 horas posteriores a la compra. */
export const ORDER_MODIFICATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export const roundMoney = (value) => Math.round(value * 100) / 100;

/** IGV de Perú: los precios del catálogo ya lo incluyen. */
export const IGV_RATE = 0.18;

/** IGV contenido en un monto que ya lo incluye. */
export const igvIncluded = (subtotal) => roundMoney(subtotal - subtotal / (1 + IGV_RATE));

/** Montos de un pedido: el subtotal incluye el IGV, el envío se suma aparte. */
export function orderAmounts(subtotal, shippingCost) {
  return { subtotal, igv: igvIncluded(subtotal), shippingCost, total: roundMoney(subtotal + shippingCost) };
}

const DIGITOS_DEL_CODIGO = 8;
const CODIGOS_POSIBLES = 10 ** DIGITOS_DEL_CODIGO;

/**
 * Código visible del pedido, `WS-` y ocho dígitos: los últimos del reloj, y si ya están tomados, el siguiente libre
 * (PBI-0103). Así dos pedidos del mismo milisegundo no comparten código.
 */
export function nextOrderId(existingIds, nowMs) {
  const taken = new Set(existingIds);
  let number = nowMs % CODIGOS_POSIBLES;
  for (let tried = 0; tried < CODIGOS_POSIBLES; tried += 1) {
    const id = `WS-${String(number).padStart(DIGITOS_DEL_CODIGO, '0')}`;
    if (!taken.has(id)) return id;
    number = (number + 1) % CODIGOS_POSIBLES;
  }
  throw new Error('No quedan códigos de pedido libres.');
}

/** Estados de un pedido; el Admin solo puede asignar estos (PBI-0095). */
export const ORDER_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

/** Estados en los que el cliente ya no puede cambiar ni cancelar el pedido (PBI-0094). */
const CLOSED_STATUSES = new Set(['shipped', 'delivered', 'cancelled']);

/**
 * El pedido sigue dentro de las 24 horas posteriores a la compra, medidas en `ahora`.
 * Quien llama pasa su reloj (PBI-0245): así la ventana usa el mismo instante que fechó el pedido.
 */
export const withinModificationWindow = (order, ahora = new Date()) =>
  new Date(ahora).getTime() - new Date(order.createdAt).getTime() <= ORDER_MODIFICATION_WINDOW_MS;

/** El pedido no se envió, no se entregó y no se canceló. */
export const isOrderOpen = (order) => !CLOSED_STATUSES.has(order.status);

export function canModify(order, ahora = new Date()) {
  return withinModificationWindow(order, ahora) && isOrderOpen(order);
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
