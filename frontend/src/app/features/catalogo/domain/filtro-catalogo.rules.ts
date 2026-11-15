import type { Categoria } from './categoria.model';
import type { Producto } from './producto.model';
import { descendientesDeCategoria } from './categoria.rules';

/**
 * Filtros del catálogo de la tienda (lote 05, ADR-0017). Viven en los parámetros de la URL (`buscar`, `categoria` y
 * `precio`), así que el buscador de la cabecera y los enlaces de categoría los cambian igual que el panel (PBI-0108).
 * Sin `precio` no hay tope: un producto de más de S/ 5,000 se ve (PBI-0115).
 */
export interface FiltrosCatalogo {
  readonly buscar: string;
  readonly categoria: string;
  /** Tope de precio, uno de `TOPES_DE_PRECIO`; `null` es «Todos los precios». */
  readonly precioMaximo: number | null;
}

/** Los topes que ofrece el filtro de precio. */
export const TOPES_DE_PRECIO: readonly number[] = [1000, 2000, 3000, 5000];

export interface ParametrosCatalogo {
  readonly buscar?: string | null;
  readonly categoria?: string | null;
  readonly precio?: string | null;
}

/** Minúsculas y sin tildes, para comparar textos como los escribe la gente. */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-PE');
}

/** Los filtros de los parámetros de la URL. Un tope de precio que no se ofrece se lee como «sin tope». */
export function leerFiltrosCatalogo(parametros: ParametrosCatalogo): FiltrosCatalogo {
  const precio = Number(parametros.precio);
  return {
    buscar: parametros.buscar ?? '',
    categoria: parametros.categoria ?? '',
    precioMaximo: parametros.precio && TOPES_DE_PRECIO.includes(precio) ? precio : null,
  };
}

/** Los parámetros de la URL de unos filtros, sin los valores por defecto. */
export function parametrosDeFiltrosCatalogo(filtros: FiltrosCatalogo): Record<string, string> {
  const buscar = filtros.buscar.trim();
  return {
    ...(buscar ? { buscar } : {}),
    ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
    ...(filtros.precioMaximo !== null ? { precio: String(filtros.precioMaximo) } : {}),
  };
}

export function hayFiltrosCatalogo(filtros: FiltrosCatalogo): boolean {
  return Boolean(filtros.buscar.trim()) || Boolean(filtros.categoria) || filtros.precioMaximo !== null;
}

/** Los productos que cumplen los filtros: el nombre, la categoría o una de sus descendientes, y el tope de precio. */
export function filtrarProductos(
  productos: readonly Producto[],
  categorias: readonly Categoria[],
  filtros: FiltrosCatalogo,
): readonly Producto[] {
  const termino = normalizarTexto(filtros.buscar);
  const categoria = filtros.categoria;
  const categoriasValidas = new Set([
    categoria,
    ...descendientesDeCategoria(categorias, categoria).map((entrada) => entrada.category.id),
  ]);
  return productos.filter(
    (producto) =>
      (!termino || normalizarTexto(producto.name).includes(termino)) &&
      (!categoria || categoriasValidas.has(producto.categoryId)) &&
      (filtros.precioMaximo === null || producto.price <= filtros.precioMaximo),
  );
}
