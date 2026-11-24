import { esFechaDeCalendario } from '../calendario/dias-no-laborables.rules.mjs';
import { DomainError } from '../comun/domain-error.mjs';
import { requireEmail, requireFields } from '../comun/validacion.rules.mjs';

/** Métodos de pago que ofrece la tienda hoy (PBI-0096): tarjeta, Yape o Plin, y transferencia. */
export const PAYMENT_METHODS = ['card', 'yape-plin', 'transfer'];

/**
 * Fecha de entrega `AAAA-MM-DD` desde `minimum` en adelante: la primera fecha de entrega que configura la tienda
 * (`primeraFechaDeEntrega`, lote 17, PBI-0178). `current` es la fecha que el pedido ya tiene: reenviarla sin cambios
 * se acepta aunque ya haya pasado.
 */
export function requireDeliveryDate(value, minimum, current = undefined) {
  if (current !== undefined && value === current) return value;
  if (!esFechaDeCalendario(value) || value < minimum)
    throw new DomainError(
      'validation',
      'INVALID_DELIVERY_DATE',
      `Elige una fecha de entrega válida, desde el ${minimum.split('-').reverse().join('/')}.`,
      { minimum },
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

/**
 * Aceptación de los términos y condiciones (PBI-0040, lote 04): solo el booleano `true` cuenta. Daniel no pidió
 * cambios en la casilla el 2026-11-20; pidió guardar la versión aceptada, que el pedido guarda desde el lote 17
 * (PBI-0177, `requireTermsVersion` de `terminos.rules.mjs`).
 */
export function requireTermsAccepted(value) {
  if (value !== true)
    throw new DomainError(
      'validation',
      'TERMS_NOT_ACCEPTED',
      'Acepta los términos y condiciones para finalizar la compra.',
    );
  return value;
}

const CLAVE_DE_IDEMPOTENCIA = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * Clave de idempotencia del intento de compra (PBI-0086, lote 04): opcional; si llega, de 16 a 128 caracteres
 * `A-Z`, `a-z`, `0-9`, `-` o `_` (un UUID cabe). Sin clave, `''`.
 */
export function requireIdempotencyKey(value) {
  if (value === undefined || value === '') return '';
  if (typeof value !== 'string' || !CLAVE_DE_IDEMPOTENCIA.test(value))
    throw new DomainError(
      'validation',
      'INVALID_IDEMPOTENCY_KEY',
      'La clave del intento de compra no es válida.',
    );
  return value;
}
