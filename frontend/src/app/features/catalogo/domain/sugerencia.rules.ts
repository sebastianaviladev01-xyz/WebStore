import type { Producto } from './producto.model';

/** Cuántos productos sugiere el diálogo «Producto agregado» (PBI-0039; provisional, por confirmar con Daniel). */
export const MAXIMO_SUGERIDOS = 3;

/** Hasta `MAXIMO_SUGERIDOS` productos de la misma categoría que el agregado, con stock y en el orden del catálogo. */
export function productosSugeridos(productos: readonly Producto[], agregado: Producto): readonly Producto[] {
  return productos
    .filter(
      (producto) =>
        producto.id !== agregado.id && producto.categoryId === agregado.categoryId && producto.stock > 0,
    )
    .slice(0, MAXIMO_SUGERIDOS);
}
