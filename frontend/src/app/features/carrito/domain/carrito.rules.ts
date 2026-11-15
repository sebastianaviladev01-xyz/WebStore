import type { Producto } from '../../catalogo/domain/producto.model';
import type { CambioCarrito, LineaCarrito, LineaGuardada } from './carrito.model';

/** Une las líneas guardadas del mismo producto sumando sus cantidades, en el orden de la primera (PBI-0092). */
export function unirLineasGuardadas(lineas: readonly LineaGuardada[]): LineaGuardada[] {
  const unidades = new Map<string, number>();
  for (const linea of lineas)
    unidades.set(linea.productId, (unidades.get(linea.productId) ?? 0) + linea.quantity);
  return [...unidades].map(([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Agrega `cantidad` unidades sin pasar del stock y dice cuántas se agregaron de verdad (PBI-0065): 0 si el
 * producto está agotado o el carrito ya tiene todo su stock.
 */
export function agregarAlCarrito(
  items: readonly LineaCarrito[],
  producto: Producto,
  cantidad: number,
): { items: readonly LineaCarrito[]; agregadas: number } {
  const actual = items.find((item) => item.product.id === producto.id)?.quantity ?? 0;
  const agregadas = Math.max(0, Math.min(cantidad, producto.stock - actual));
  if (agregadas === 0) return { items, agregadas };
  return {
    items: actual
      ? items.map((item) =>
          item.product.id === producto.id ? { ...item, quantity: actual + agregadas } : item,
        )
      : [...items, { product: producto, quantity: agregadas }],
    agregadas,
  };
}

/**
 * Concilia el carrito con el catálogo vigente (PBI-0106): cada línea toma el producto vigente, la cantidad baja al
 * stock y sale si el producto se agotó o ya no está a la venta. Devuelve lo que cambió para avisar al comprador.
 */
export function conciliarCarrito(
  items: readonly LineaCarrito[],
  productos: readonly Producto[],
): { items: LineaCarrito[]; cambios: CambioCarrito[] } {
  const conciliados: LineaCarrito[] = [];
  const cambios: CambioCarrito[] = [];
  for (const item of items) {
    const vigente = productos.find((producto) => producto.id === item.product.id);
    const nombre = item.product.name;
    if (!vigente || vigente.stock <= 0) {
      cambios.push({ tipo: 'retirado', nombre });
      continue;
    }
    if (vigente.price !== item.product.price)
      cambios.push({ tipo: 'precio', nombre, antes: item.product.price, ahora: vigente.price });
    const cantidad = Math.min(item.quantity, vigente.stock);
    if (cantidad !== item.quantity)
      cambios.push({ tipo: 'stock', nombre, antes: item.quantity, ahora: cantidad });
    conciliados.push({ product: vigente, quantity: cantidad });
  }
  return { items: conciliados, cambios };
}
