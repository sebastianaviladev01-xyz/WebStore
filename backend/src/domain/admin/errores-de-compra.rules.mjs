import { DomainError } from '../comun/domain-error.mjs';

/**
 * Errores de compra (lote 13, ADR-0021, PBI-0173; provisional, por confirmar con Daniel): los intentos de checkout que
 * el BFF rechaza porque la tienda cambió bajo el comprador, que el equipo puede resolver (precio o stock, un producto
 * que dejó de venderse o un distrito sin tarifa). Los errores del formulario (datos inválidos, términos sin aceptar)
 * no lo son: los corrige el propio comprador. El BFF de prueba no rechaza pagos, así que no hay «pago rechazado».
 *
 * Cada error guarda solo su código, el instante, el producto del catálogo al que se refiere (si lo hay) y el digest
 * de la clave del intento (`Idempotency-Key`), para no contar dos veces el mismo intento: ningún dato del comprador
 * ni del pago. Se guardan los 50 más recientes en `state.checkoutErrors`.
 */
export const CODIGOS_DE_ERROR_DE_COMPRA = [
  'ORDER_TOTAL_CHANGED',
  'INSUFFICIENT_STOCK',
  'PRODUCT_UNAVAILABLE',
  'SHIPPING_UNAVAILABLE',
];

export const MAX_ERRORES_DE_COMPRA = 50;

/**
 * El error de compra de un rechazo del checkout, o `null` si no lo es. `productId` solo se guarda si existe en el
 * catálogo: lo que envió la tienda nunca llega tal cual al estado.
 */
export function errorDeCompraDe(error, { id, at, products, attempt = null }) {
  if (!(error instanceof DomainError) || !CODIGOS_DE_ERROR_DE_COMPRA.includes(error.code)) return null;
  const productId = error.details?.productId;
  const conocido = typeof productId === 'string' && products.some((product) => product.id === productId);
  return { id, at, code: error.code, productId: conocido ? productId : null, attempt: attempt || null };
}

/** Añade el error al principio; el mismo intento con el mismo código no se repite. Conserva los 50 más recientes. */
export function conErrorDeCompra(errores, error) {
  const repetido =
    error.attempt !== null &&
    errores.some((item) => item.attempt === error.attempt && item.code === error.code);
  return repetido ? errores : [error, ...errores].slice(0, MAX_ERRORES_DE_COMPRA);
}

const bienFormado = (item) =>
  item !== null &&
  typeof item === 'object' &&
  typeof item.id === 'string' &&
  typeof item.at === 'string' &&
  CODIGOS_DE_ERROR_DE_COMPRA.includes(item.code) &&
  (item.productId === null || typeof item.productId === 'string') &&
  (item.attempt === null || typeof item.attempt === 'string');

/** Al cargar el estado: solo los errores bien formados. Sin migración (una lista ausente queda vacía). */
export const normalizarErroresDeCompra = (errores) =>
  Array.isArray(errores) ? errores.filter(bienFormado).slice(0, MAX_ERRORES_DE_COMPRA) : [];
