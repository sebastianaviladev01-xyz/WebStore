import { DomainError } from '../comun/domain-error.mjs';

/** Unidades por producto, sumando las líneas repetidas (acepta líneas con `productId` o con `product` embebido). */
function unitsByProduct(items) {
  const units = new Map();
  for (const item of items) {
    const productId = item.productId ?? item.product?.id;
    units.set(productId, (units.get(productId) ?? 0) + item.quantity);
  }
  return units;
}

/**
 * Valida todo el pedido antes de descontar: o se reserva completo o no se toca el stock. Las líneas repetidas
 * del mismo producto se suman (PBI-0092). Con `requireActive`, un producto inactivo no se vende (PBI-0093): lo
 * exige el checkout; reactivar un pedido desde el Admin no, porque sus unidades ya se vendieron.
 */
export function reserveStock(products, items, { requireActive = false } = {}) {
  const units = unitsByProduct(items);
  for (const [productId, quantity] of units) {
    const product = products.find((candidate) => candidate.id === productId);
    if (product && requireActive && product.active !== true)
      throw new DomainError(
        'conflict',
        'PRODUCT_UNAVAILABLE',
        'Uno de los productos ya no está a la venta.',
        {
          productId,
        },
      );
    if (!product || product.stock < quantity)
      throw new DomainError(
        'conflict',
        'INSUFFICIENT_STOCK',
        'No hay stock suficiente para completar el pedido.',
        { productId },
      );
  }
  return products.map((product) =>
    units.has(product.id) ? { ...product, stock: product.stock - units.get(product.id) } : product,
  );
}

/** Devuelve al stock las unidades de las líneas, sumando las repetidas. */
export function releaseStock(products, items) {
  const units = unitsByProduct(items);
  return products.map((product) =>
    units.has(product.id) ? { ...product, stock: product.stock + units.get(product.id) } : product,
  );
}
