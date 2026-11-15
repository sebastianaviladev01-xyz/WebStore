import { DomainError } from '../comun/domain-error.mjs';
import { requireEmail, requireFields } from '../comun/validacion.rules.mjs';

/** Métodos de pago que ofrece la tienda hoy (PBI-0096): tarjeta, Yape o Plin, y transferencia. */
export const PAYMENT_METHODS = ['card', 'yape-plin', 'transfer'];

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `AAAA-MM-DD` que existe en el calendario (rechaza `2030-02-30`). */
function isCalendarDate(value) {
  const match = typeof value === 'string' ? FECHA_ISO.exec(value) : null;
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * Fecha de entrega `AAAA-MM-DD` desde `today` (la fecha de Lima de hoy) en adelante. La regla exacta de la primera
 * fecha está pendiente de Daniel (PENDING-DECISIONS, «Fecha mínima de entrega del pedido»); provisionalmente, hoy.
 * `current` es la fecha que el pedido ya tiene: reenviarla sin cambios se acepta aunque ya haya pasado.
 */
export function requireDeliveryDate(value, today, current = undefined) {
  if (current !== undefined && value === current) return value;
  if (!isCalendarDate(value) || value < today)
    throw new DomainError(
      'validation',
      'INVALID_DELIVERY_DATE',
      'Elige una fecha de entrega válida, desde hoy en adelante.',
      { minimum: today },
    );
  return value;
}

export function requirePaymentMethod(value) {
  if (!PAYMENT_METHODS.includes(value))
    throw new DomainError('validation', 'INVALID_PAYMENT_METHOD', 'Elige un método de pago disponible.');
  return value;
}

const text = (value) => String(value).trim();

/** Datos del cliente del pedido: solo los campos conocidos, recortados y con el correo normalizado (lista blanca). */
export function pickCustomer(customer) {
  requireFields(customer, ['fullName', 'email', 'phone', 'document']);
  return {
    fullName: text(customer.fullName),
    email: requireEmail(customer.email),
    phone: text(customer.phone),
    document: text(customer.document),
  };
}

/** Dirección de entrega: solo los campos conocidos; `reference` solo si trae texto (lista blanca). */
export function pickShipping(shipping) {
  requireFields(shipping, ['addressLine', 'district', 'province', 'department']);
  const reference = typeof shipping.reference === 'string' ? shipping.reference.trim() : '';
  return {
    addressLine: text(shipping.addressLine),
    district: text(shipping.district),
    province: text(shipping.province),
    department: text(shipping.department),
    ...(reference ? { reference } : {}),
  };
}

/**
 * Líneas pedidas: `{ productId, quantity }` (o `{ product: { id }, quantity }`, como las envía la tienda), con una
 * cantidad entera y positiva. Las líneas repetidas del mismo producto se unen en una (PBI-0092 y PBI-0096).
 */
export function requireOrderLines(items) {
  if (!Array.isArray(items) || items.length === 0)
    throw new DomainError('validation', 'EMPTY_ORDER', 'Agrega al menos un producto.');
  const lines = new Map();
  for (const item of items) {
    const productId = String(item?.productId ?? item?.product?.id ?? '');
    const quantity = item?.quantity;
    if (!productId || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0)
      throw new DomainError('validation', 'INVALID_ORDER_ITEMS', 'Revisa los productos del pedido.');
    lines.set(productId, (lines.get(productId) ?? 0) + quantity);
  }
  return [...lines].map(([productId, quantity]) => ({ productId, quantity }));
}
