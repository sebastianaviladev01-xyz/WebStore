import { reserveStock } from '../../domain/catalogo/inventario.rules.mjs';
import { DomainError } from '../../domain/comun/domain-error.mjs';
import { conEvento, eventoPedidoCreado } from '../../domain/admin/actividad.rules.mjs';
import { conErrorDeCompra, errorDeCompraDe } from '../../domain/admin/errores-de-compra.rules.mjs';
import { requireTermsVersion, terminosVigentes } from '../../domain/admin/terminos.rules.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { normalizeEmail } from '../../domain/comun/validacion.rules.mjs';
import { requireShippingRate } from '../../domain/envios/tarifa-envio.rules.mjs';
import {
  pickCustomer,
  pickShipping,
  requireDeliveryDate,
  requireIdempotencyKey,
  requireOrderLines,
  requirePaymentMethod,
  requireTermsAccepted,
} from '../../domain/pedidos/datos-del-pedido.rules.mjs';
import {
  destinosDelPedido,
  direccionesDeLasLineas,
  envioPorDestinos,
} from '../../domain/pedidos/direcciones-por-producto.rules.mjs';
import { nextOrderId, orderAmounts, roundMoney } from '../../domain/pedidos/pedido.rules.mjs';
import { primeraFechaDeLaTienda } from '../../domain/pedidos/primera-fecha-de-entrega.rules.mjs';
import { toPublicProduct } from '../catalogo/catalogo.queries.mjs';
import { accountForToken } from '../cuentas/cuentas.use-cases.mjs';
import { orderToPublic } from '../pedidos/pedidos.use-cases.mjs';

/**
 * Valida el pedido y se queda solo con lo conocido (PBI-0096). El Storefront envía CartItem ({product, quantity})
 * y sus montos; precios, stock y envío salen siempre del estado del BFF. Lote 17 (ADR-0021): la fecha de entrega desde
 * la primera que permite la tienda en `instante` (PBI-0178) y la versión de los términos que el comprador aceptó, que
 * debe ser la vigente (PBI-0177), después de comprobar que los aceptó.
 */
function requireOrderCommand(command, state, instante) {
  const shipping = pickShipping(command.shipping);
  const pedido = {
    customer: pickCustomer(command.customer),
    shipping,
    deliveryDate: requireDeliveryDate(command.deliveryDate, primeraFechaDeLaTienda(state, instante)),
    paymentMethod: requirePaymentMethod(command.paymentMethod),
    requested: requireOrderLines(command.items),
    // Lote 19 (PBI-0006): con una dirección por producto, la de cada línea que la trae; si no, ninguna.
    lineAddresses: direccionesDeLasLineas(command.items, state.config?.deliveryAddressMode, shipping),
    termsAccepted: requireTermsAccepted(command.termsAccepted),
  };
  return {
    ...pedido,
    termsVersion: requireTermsVersion(
      command.termsVersion,
      terminosVigentes(state.termsVersions).termsVersion,
    ),
  };
}

/**
 * El total que el comprador vio (`command.total`), si llega, debe ser el que cobra el BFF (PBI-0106, lote 04): si
 * el precio, el stock o el envío cambiaron, responde `409 ORDER_TOTAL_CHANGED` con los montos vigentes y no crea
 * nada. Sin `total` no se compara.
 */
function requireShownTotal(shown, amounts) {
  if (typeof shown !== 'number' || Math.abs(shown - amounts.total) < 0.005) return;
  throw new DomainError(
    'conflict',
    'ORDER_TOTAL_CHANGED',
    'El total de tu pedido cambió. Revisa el total actualizado y vuelve a finalizar la compra.',
    amounts,
  );
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
export function createCheckoutUseCases({ store, security, now = () => new Date() }) {
  const nowIso = () => now().toISOString();
  const orderForKey = (key) =>
    key ? store.state.orders.find((order) => order.idempotencyKeyHash === security.digest(key)) : undefined;

  /**
   * Doble envío (PBI-0086, lote 04): si la clave ya creó un pedido, lo devuelve sin crear otro ni tocar el stock.
   * Como el BFF solo guarda el digest del token de acceso, emite uno nuevo que sustituye al anterior: solo quien
   * conoce la clave, que es secreta y propia del intento, puede pedirlo. Sin pedido para la clave, `null`.
   */
  function replay(idempotencyKey) {
    const order = orderForKey(requireIdempotencyKey(idempotencyKey));
    if (!order) return null;
    const accessToken = security.createToken();
    order.accessTokenHash = security.digest(accessToken);
    store.save();
    return { ...orderToPublic(order), accessToken };
  }

  /**
   * Error de compra (lote 13, ADR-0021, PBI-0173): si el checkout se rechaza porque la tienda cambió (total, stock,
   * producto fuera de venta o distrito sin tarifa), lo anota para la campana del Admin sin datos del comprador. No
   * sube la revisión: no invalida lo que el equipo está editando.
   */
  function registrarErrorDeCompra(error, key) {
    const evento = errorDeCompraDe(error, {
      id: security.newId(),
      at: nowIso(),
      products: store.state.products,
      attempt: key ? security.digest(key) : null,
    });
    if (!evento) return;
    const errores = store.state.checkoutErrors ?? [];
    const siguientes = conErrorDeCompra(errores, evento);
    if (siguientes === errores) return;
    store.state.checkoutErrors = siguientes;
    store.save();
  }

  function placeOrder(command, bearerToken, idempotencyKey = '') {
    const key = requireIdempotencyKey(idempotencyKey);
    try {
      return crearPedido(command, bearerToken, key);
    } catch (error) {
      registrarErrorDeCompra(error, key);
      throw error;
    }
  }

  function crearPedido(command, bearerToken, key) {
    const instante = now();
    const { customer, shipping, deliveryDate, paymentMethod, requested, lineAddresses, termsVersion } =
      requireOrderCommand(command, store.state, instante);
    // La dirección principal siempre necesita tarifa: es la del pedido y la que el cliente puede cambiar después.
    const rate = requireShippingRate(store.state.rates, shipping.district);
    // Lote 19 (PBI-0006): una tarifa por destino distinto que usan las líneas; con una sola dirección, la de siempre.
    const envio = envioPorDestinos(
      store.state.rates,
      destinosDelPedido(
        shipping,
        requested.map((item) => ({ shipping: lineAddresses.get(item.productId) })),
      ),
    );
    const products = reserveStock(store.state.products, requested, { requireActive: true });
    const { state } = store;
    const items = requested.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      product: toPublicProduct(state)(
        products.find((product) => product.id === item.productId),
        0,
      ),
      ...(lineAddresses.has(item.productId) ? { shipping: lineAddresses.get(item.productId) } : {}),
    }));
    const subtotal = roundMoney(items.reduce((total, item) => total + item.product.price * item.quantity, 0));
    const amounts = orderAmounts(subtotal, envio.shippingCost);
    requireShownTotal(command.total, {
      subtotal: amounts.subtotal,
      shippingCost: amounts.shippingCost,
      total: amounts.total,
    });
    state.products = products;
    const account = accountForToken(state, bearerToken, security);
    const accessToken = security.createToken();
    const createdAt = instante.toISOString();
    const order = {
      id: nextOrderId(
        state.orders.map((item) => item.id),
        instante.getTime(),
      ),
      createdAt,
      updatedAt: createdAt,
      status: 'confirmed',
      customer,
      shipping,
      shippingOrigin: rate.origin,
      deliveryDate,
      paymentMethod,
      items,
      ...amounts,
      // PBI-0177: la fecha y hora de la aceptación, con segundos, y la versión aceptada.
      termsAcceptedAt: createdAt,
      termsVersion,
      accessTokenHash: security.digest(accessToken),
      ...(key ? { idempotencyKeyHash: security.digest(key) } : {}),
      ...(account ? { accountId: account.id } : {}),
    };
    state.orders.unshift(order);
    // PBI-0028: la actividad reciente del Resumen.
    state.activity = conEvento(state.activity ?? [], eventoPedidoCreado({ at: createdAt }, order));
    registerCustomer(state, customer, security);
    bumpRevision(state);
    store.save();
    return { ...orderToPublic(order), accessToken };
  }

  /** La primera fecha de entrega que la tienda puede elegir ahora (lote 17, PBI-0178): el mínimo del checkout. */
  const firstDeliveryDate = () => ({ minimum: primeraFechaDeLaTienda(store.state, now()) });

  return { placeOrder, replay, firstDeliveryDate };
}
