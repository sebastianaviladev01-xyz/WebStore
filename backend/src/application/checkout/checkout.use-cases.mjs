import { reserveStock } from '../../domain/catalogo/inventario.rules.mjs';
import { DomainError } from '../../domain/comun/domain-error.mjs';
import { limaDate, nowIso } from '../../domain/comun/reloj.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { normalizeEmail } from '../../domain/comun/validacion.rules.mjs';
import { bestShippingRate } from '../../domain/envios/tarifa-envio.rules.mjs';
import {
  pickCustomer,
  pickShipping,
  requireDeliveryDate,
  requireOrderLines,
  requirePaymentMethod,
} from '../../domain/pedidos/datos-del-pedido.rules.mjs';
import { roundMoney } from '../../domain/pedidos/pedido.rules.mjs';
import { toPublicProduct } from '../catalogo/catalogo.queries.mjs';
import { accountForToken } from '../cuentas/cuentas.use-cases.mjs';
import { orderToPublic } from '../pedidos/pedidos.use-cases.mjs';

/**
 * Valida el pedido y se queda solo con lo conocido (PBI-0096). El Storefront envía CartItem ({product, quantity})
 * y sus montos; precios, stock y envío salen siempre del estado del BFF.
 */
function requireOrderCommand(command) {
  return {
    customer: pickCustomer(command.customer),
    shipping: pickShipping(command.shipping),
    deliveryDate: requireDeliveryDate(command.deliveryDate, limaDate()),
    paymentMethod: requirePaymentMethod(command.paymentMethod),
    requested: requireOrderLines(command.items),
  };
}

/** Cada compra actualiza (o crea) la ficha del cliente que ve el Admin. */
function registerCustomer(state, customer, security) {
  const email = normalizeEmail(customer.email);
  const existing = state.customers.find((candidate) => normalizeEmail(candidate.email) === email);
  if (existing) {
    existing.name = customer.fullName;
    existing.document = customer.document;
    existing.orders = (existing.orders ?? 0) + 1;
  } else
    state.customers.push({
      id: security.newId(),
      name: customer.fullName,
      email: customer.email,
      document: customer.document,
      orders: 1,
    });
}

/** Checkout: reserva stock, toma el envío de la tabla de tarifas y emite el token de acceso del pedido. */
export function createCheckoutUseCases({ store, security }) {
  function placeOrder(command, bearerToken) {
    const { customer, shipping, deliveryDate, paymentMethod, requested } = requireOrderCommand(command);
    const rate = bestShippingRate(store.state.rates, shipping.district);
    if (!rate)
      throw new DomainError(
        'validation',
        'SHIPPING_UNAVAILABLE',
        'Todavía no contamos con una tarifa para ese destino.',
      );
    store.state.products = reserveStock(store.state.products, requested, { requireActive: true });
    const { state } = store;
    const items = requested.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      product: toPublicProduct(state)(
        state.products.find((product) => product.id === item.productId),
        0,
      ),
    }));
    const subtotal = roundMoney(items.reduce((total, item) => total + item.product.price * item.quantity, 0));
    const account = accountForToken(state, bearerToken, security);
    const accessToken = security.createToken();
    const createdAt = nowIso();
    const order = {
      id: `WS-${Date.now().toString().slice(-8)}`,
      createdAt,
      updatedAt: createdAt,
      status: 'confirmed',
      customer,
      shipping,
      shippingOrigin: rate.origin,
      deliveryDate,
      paymentMethod,
      items,
      subtotal,
      igv: roundMoney(subtotal - subtotal / 1.18),
      shippingCost: rate.price,
      total: roundMoney(subtotal + rate.price),
      accessTokenHash: security.digest(accessToken),
      ...(account ? { accountId: account.id } : {}),
    };
    state.orders.unshift(order);
    registerCustomer(state, customer, security);
    bumpRevision(state);
    store.save();
    return { ...orderToPublic(order), accessToken };
  }

  return { placeOrder };
}
