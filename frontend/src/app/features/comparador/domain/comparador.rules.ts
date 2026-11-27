/**
 * Comparador de productos (lote 19, ADR-0021, PBI-0001; confirmado por Sebastián Avila). La lista son ids de
 * productos, sin repetidos y en el orden en que se agregaron. Vive en memoria y en la URL (`/comparar?ids=…`, para
 * compartirla): STD-08 no permite guardar en el navegador más que el carrito y la sesión.
 */

/** Cuántos productos se comparan a la vez: los que caben legibles en una tabla de escritorio. */
export const MAXIMO_A_COMPARAR = 4;

export type ResultadoDeComparar = 'agregado' | 'quitado' | 'lleno';

/** Agrega el producto al final si no está y cabe, o lo quita si ya está. Con la lista llena, no cambia y avisa. */
export function alternarEnComparar(
  ids: readonly string[],
  id: string,
): { readonly ids: readonly string[]; readonly resultado: ResultadoDeComparar } {
  if (ids.includes(id)) return { ids: quitarDeComparar(ids, id), resultado: 'quitado' };
  if (ids.length >= MAXIMO_A_COMPARAR) return { ids, resultado: 'lleno' };
  return { ids: [...ids, id], resultado: 'agregado' };
}

export function quitarDeComparar(ids: readonly string[], id: string): readonly string[] {
  return ids.includes(id) ? ids.filter((actual) => actual !== id) : ids;
}

/** Los ids del parámetro `ids` de la URL: sin espacios, vacíos ni repetidos, y solo los primeros que caben. */
export function idsDesdeLaUrl(valor: string | null | undefined): readonly string[] {
  const ids: string[] = [];
  for (const parte of String(valor ?? '').split(',')) {
    const id = parte.trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, MAXIMO_A_COMPARAR);
}

/** El valor del parámetro `ids`; con la lista vacía, null (sin parámetro). */
export function idsParaLaUrl(ids: readonly string[]): string | null {
  return ids.length ? ids.join(',') : null;
}

/**
 * Los productos de la lista que siguen en el catálogo (que solo trae los activos), en el orden de la lista, y los ids
 * de los que ya no están (eliminados o inactivos), para quitarlos y avisar.
 */
export function productosAComparar<T extends { readonly id: string }>(
  ids: readonly string[],
  catalogo: readonly T[],
): { readonly productos: readonly T[]; readonly retirados: readonly string[] } {
  const productos: T[] = [];
  const retirados: string[] = [];
  for (const id of ids) {
    const producto = catalogo.find((candidato) => candidato.id === id);
    if (producto) productos.push(producto);
    else retirados.push(id);
  }
  return { productos, retirados };
}
