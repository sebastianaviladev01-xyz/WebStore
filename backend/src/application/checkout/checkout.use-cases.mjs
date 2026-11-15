import { reserveStock } from '../../domain/catalogo/inventario.rules.mjs';
import { DomainError } from '../../domain/comun/domain-error.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { normalizeEmail, requireEmail, requireFields } from '../../domain/comun/validacion.rules.mjs';
import { bestShippingRate } from '../../domain/envios/tarifa-envio.rules.mjs';
import { roundMoney } from '../../domain/pedidos/pedido.rules.mjs';
import { toPublicProduct } from '../catalogo/catalogo.queries.mjs';
import { accountForToken } from '../cuentas/cuentas.use-cases.mjs';
import { orderToPublic } from '../pedidos/pedidos.use-cases.mjs';

function requireOrderCommand(command) {
  requireFields(command.customer, ['fullName', 'email', 'phone', 'document']);
  requireEmail(command.customer.email);
  requireFields(command.shipping, ['addressLine', 'district', 'province', 'department']);
  if (!Array.isArray(command.items) || command.items.length === 0)
    throw new DomainError('validation', 'EMPTY_ORDER', 'Agrega al menos un producto.');
  // El Storefront envía CartItem ({product, quantity}); precios y stock salen siempre del estado del BFF.
  const requested = command.items.map((item) => ({
    productId: String(item?.productId ?? item?.product?.id ?? ''),
    quantity: Math.floor(Number(item?.quantity)),
  }));
  if (requested.some((item) => !item.productId || !(item.quantity > 0)))
    throw new DomainError('validation', 'INVALID_ORDER_ITEMS', 'Revisa los productos del pedido.');
  return requested;
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
    const requested = requireOrderCommand(command);
    const rate = bestShippingRate(store.state.rates, command.shipping.district);
    if (!rate)
      throw new DomainError(
        'validation',
        'SHIPPING_UNAVAILABLE',
        'Todavía no contamos con una tarifa para ese destino.',
      );
    store.state.products = reserveStock(store.state.products, requested);
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
      customer: command.customer,
      shipping: command.shipping,
      shippingOrigin: rate.origin,
      deliveryDate: command.deliveryDate,
      paymentMethod: command.paymentMethod,
      items,
      subtotal,
      igv: roundMoney(subtotal - subtotal / 1.18),
      shippingCost: rate.price,
      total: roundMoney(subtotal + rate.price),
      accessTokenHash: security.digest(accessToken),
      ...(account ? { accountId: account.id } : {}),
    };
    state.orders.unshift(order);
    registerCustomer(state, command.customer, security);
    bumpRevision(state);
    store.save();
    return { ...orderToPublic(order), accessToken };
  }

  return { placeOrder };
}
