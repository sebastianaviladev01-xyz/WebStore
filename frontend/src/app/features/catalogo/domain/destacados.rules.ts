import type { Producto } from './producto.model';

/**
 * Cuántos destacados caben en el inicio sin carrusel (lote 22, ADR-0025, PBI-0215; confirmado por Sebastián Avila): los
 * cuatro de una fila, como la demo de siempre.
 */
export const MAXIMO_SIN_CARRUSEL = 4;

/** Los que el Admin marcó como destacados, con stock y en el orden del catálogo, sin tope (PBI-0215). */
export function productosDestacados<T extends Pick<Producto, 'featured' | 'stock'>>(
  productos: readonly T[],
): readonly T[] {
  return productos.filter((producto) => producto.featured && producto.stock > 0);
}

/** Con más de `MAXIMO_SIN_CARRUSEL` destacados, el inicio los muestra en un carrusel. */
export function necesitaCarrusel(cantidad: number): boolean {
  return cantidad > MAXIMO_SIN_CARRUSEL;
}
