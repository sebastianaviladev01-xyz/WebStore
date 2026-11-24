import { DomainError } from '../comun/domain-error.mjs';
import { requireShippingRate } from '../envios/tarifa-envio.rules.mjs';
import { pickShipping } from './datos-del-pedido.rules.mjs';
import { roundMoney } from './pedido.rules.mjs';

/**
 * Una dirección por pedido o una por producto (lote 19, ADR-0021, PBI-0006; provisional, por confirmar con Daniel).
 * Daniel: «la configuración de la tienda decidirá si un pedido lleva una sola dirección de entrega o una por producto».
 * `config.deliveryAddressMode` es `per-order` (por defecto: lo de siempre) o `per-product`.
 */
export const MODOS_DE_DIRECCION = ['per-order', 'per-product'];
export const MODO_DE_DIRECCION_POR_DEFECTO = 'per-order';

export const esModoDeDireccion = (valor) => MODOS_DE_DIRECCION.includes(valor);

/** Texto comparable: sin tildes, sin mayúsculas y sin espacios de más. */
const comparable = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const CAMPOS_DEL_DESTINO = ['addressLine', 'district', 'province', 'department'];

/**
 * Dos direcciones son el mismo destino si coinciden la dirección, el distrito, la provincia y el departamento, sin
 * distinguir tildes, mayúsculas ni espacios de más. La referencia no cuenta: no cambia a dónde va el envío.
 */
export const mismaDireccion = (a, b) =>
  CAMPOS_DEL_DESTINO.every((campo) => comparable(a?.[campo]) === comparable(b?.[campo]));

const idDeLaLinea = (item) => String(item?.productId ?? item?.product?.id ?? '');

/**
 * La dirección de una línea, validada y recortada como la principal. Su `VALIDATION_ERROR` lleva además
 * `details.productId` (lote 18, ADR-0021), para que la tienda marque el campo de esa línea y no el de la principal.
 */
function direccionDeLaLinea(shipping, productId) {
  try {
    if (typeof shipping !== 'object' || Array.isArray(shipping))
      throw new DomainError('validation', 'VALIDATION_ERROR', 'Completa los campos obligatorios.', {
        fields: CAMPOS_DEL_DESTINO,
      });
    return pickShipping(shipping);
  } catch (error) {
    if (error instanceof DomainError && error.code === 'VALIDATION_ERROR')
      throw new DomainError(error.kind, error.code, error.message, { ...error.details, productId });
    throw error;
  }
}

/**
 * Las direcciones propias de las líneas del checkout (`items[].shipping`), por producto. Con `per-order` (o un modo
 * desconocido), una línea con dirección responde `409 PER_PRODUCT_ADDRESS_DISABLED`: la tienda cambió de modo mientras
 * el comprador llenaba el formulario. Con `per-product`, cada dirección se valida y recorta como la principal
 * (`pickShipping`); una igual a la principal no se guarda aparte. El mismo producto repetido con dos direcciones
 * distintas responde `INVALID_ORDER_ITEMS` (las líneas repetidas se unen en una).
 */
export function direccionesDeLasLineas(items, modo, principal) {
  const direcciones = new Map();
  const vistas = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const productId = idDeLaLinea(item);
    let propia = null;
    if (item?.shipping !== undefined && item?.shipping !== null) {
      if (modo !== 'per-product')
        throw new DomainError(
          'conflict',
          'PER_PRODUCT_ADDRESS_DISABLED',
          'La tienda entrega cada pedido en una sola dirección. Revisa la dirección de entrega y vuelve a finalizar la compra.',
        );
      const direccion = direccionDeLaLinea(item.shipping, productId);
      if (!mismaDireccion(direccion, principal)) propia = direccion;
    }
    if (vistas.has(productId)) {
      const anterior = vistas.get(productId);
      const iguales = anterior && propia ? mismaDireccion(anterior, propia) : anterior === propia;
      if (!iguales)
        throw new DomainError('validation', 'INVALID_ORDER_ITEMS', 'Revisa los productos del pedido.');
      continue;
    }
    vistas.set(productId, propia);
    if (propia) direcciones.set(productId, propia);
  }
  return direcciones;
}

/**
 * Los destinos de un pedido: las direcciones distintas que usan sus líneas (la propia o la principal), en el orden de
 * las líneas. Si todas van a otra dirección, la principal no es un destino.
 */
export function destinosDelPedido(principal, lineas) {
  const destinos = [];
  for (const linea of lineas) {
    const direccion = linea.shipping ?? principal;
    if (!destinos.some((destino) => mismaDireccion(destino, direccion))) destinos.push(direccion);
  }
  return destinos;
}

/**
 * El envío de un pedido: una tarifa por destino distinto, no por línea, cada una la más baja de su distrito
 * (`requireShippingRate`, que responde `SHIPPING_UNAVAILABLE` si la tienda no llega). Devuelve el total y el desglose.
 */
export function envioPorDestinos(rates, destinos) {
  const destinations = destinos.map((destino) => {
    const rate = requireShippingRate(rates, destino.district);
    return { district: destino.district, origin: rate.origin, price: rate.price };
  });
  return {
    shippingCost: roundMoney(destinations.reduce((total, destino) => total + destino.price, 0)),
    destinations,
  };
}
