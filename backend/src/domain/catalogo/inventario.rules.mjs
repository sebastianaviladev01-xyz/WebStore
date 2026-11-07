import { DomainError } from '../comun/domain-error.mjs';

/** Valida todo el pedido antes de descontar: o se reserva completo o no se toca el stock. */
export function reserveStock(products, items) {
  for (const item of items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || product.stock < item.quantity)
      throw new DomainError(
        'conflict',
        'INSUFFICIENT_STOCK',
        'No hay stock suficiente para completar el pedido.',
        { productId: item.productId },
      );
  }
  return products.map((product) => {
    const item = items.find((candidate) => candidate.productId === product.id);
    return item ? { ...product, stock: product.stock - item.quantity } : product;
  });
}

/** Devuelve al stock las unidades de las líneas (acepta líneas de pedido con `product` embebido). */
export function releaseStock(products, items) {
  return products.map((product) => {
    const item = items.find((candidate) => (candidate.productId ?? candidate.product?.id) === product.id);
    return item ? { ...product, stock: product.stock + item.quantity } : product;
  });
}
