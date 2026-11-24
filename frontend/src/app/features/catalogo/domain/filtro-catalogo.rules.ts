import type { Categoria } from './categoria.model';
import type { Producto } from './producto.model';
import { descendientesDeCategoria } from './categoria.rules';

/**
 * Filtros del catálogo de la tienda (lote 05, ADR-0017). Viven en los parámetros de la URL (`buscar`, `categoria`,
 * `precioMin` y `precioMax`), así que el buscador de la cabecera y los enlaces de categoría los cambian igual que el
 * panel (PBI-0108). Sin precio no hay límite: un producto de más de S/ 5,000 se ve (PBI-0115). Desde el lote 16
 * (ADR-0021, PBI-0181) el precio es un rango con mínimo y máximo, los dos opcionales e incluidos.
 */
export interface FiltrosCatalogo {
  readonly buscar: string;
  readonly categoria: string;
  /** Precio mínimo, incluido; `null` es sin mínimo. */
  readonly precioMinimo: number | null;
  /** Precio máximo, incluido; `null` es sin máximo. */
  readonly precioMaximo: number | null;
}

export interface ParametrosCatalogo {
  readonly buscar?: string | null;
  readonly categoria?: string | null;
  readonly precioMin?: string | null;
  readonly precioMax?: string | null;
  /** El tope del filtro anterior (lote 05): se lee como el máximo si no llega `precioMax`. */
  readonly precio?: string | null;
}

/** Un precio escrito por la persona: vacío (`null`), un número o el motivo por el que no vale. */
export type PrecioLeido = { readonly valor: number | null } | { readonly error: string };

/** El rango de precio escrito: los dos valores, o el error de cada campo que no vale. */
export type RangoDePrecio =
  | { readonly ok: true; readonly precioMinimo: number | null; readonly precioMaximo: number | null }
  | { readonly ok: false; readonly errores: { readonly minimo?: string; readonly maximo?: string } };

export const MENSAJE_PRECIO_NEGATIVO = 'El precio no puede ser negativo.';
export const MENSAJE_PRECIO_NO_NUMERICO = 'Escribe solo números, por ejemplo 1500.';
export const MENSAJE_RANGO_INVERTIDO = 'El máximo no puede ser menor que el mínimo.';

/** Entero con o sin separador de miles (coma) y, opcionalmente, hasta dos decimales con punto, como en los precios. */
const PRECIO = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;

/** Minúsculas y sin tildes, para comparar textos como los escribe la gente. */
export function normalizarTexto(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase('es-PE');
}

/** Lee un precio escrito: vacío es «sin límite»; un número negativo o que no es un precio dice por qué. */
export function leerPrecio(texto: string): PrecioLeido {
  const limpio = texto.trim();
  if (!limpio) return { valor: null };
  if (/^-\s*\d/.test(limpio)) return { error: MENSAJE_PRECIO_NEGATIVO };
  if (!PRECIO.test(limpio)) return { error: MENSAJE_PRECIO_NO_NUMERICO };
  return { valor: Number(limpio.replaceAll(',', '')) };
}

/** El rango escrito en el panel: cada campo con su error, y el máximo no puede quedar por debajo del mínimo. */
export function validarRangoDePrecio(minimo: string, maximo: string): RangoDePrecio {
  const desde = leerPrecio(minimo);
  const hasta = leerPrecio(maximo);
  if ('error' in desde || 'error' in hasta)
    return {
      ok: false,
      errores: {
        ...('error' in desde ? { minimo: desde.error } : {}),
        ...('error' in hasta ? { maximo: hasta.error } : {}),
      },
    };
  if (desde.valor !== null && hasta.valor !== null && desde.valor > hasta.valor)
    return { ok: false, errores: { maximo: MENSAJE_RANGO_INVERTIDO } };
  return { ok: true, precioMinimo: desde.valor, precioMaximo: hasta.valor };
}

/** El precio más bajo y el más alto de unos productos, para orientar el rango; sin productos, `null`. */
export function limitesDePrecio(
  productos: readonly Producto[],
): { readonly minimo: number; readonly maximo: number } | null {
  if (!productos.length) return null;
  const precios = productos.map((producto) => producto.price);
  return { minimo: Math.min(...precios), maximo: Math.max(...precios) };
}

/** Un precio de la URL; lo que no es un precio válido se lee como «sin límite». */
function precioDeLaUrl(valor: string | null | undefined): number | null {
  const leido = leerPrecio(valor ?? '');
  return 'valor' in leido ? leido.valor : null;
}

/**
 * Los filtros de los parámetros de la URL. Un precio que no vale se lee como «sin límite»; un mínimo mayor que el
 * máximo no filtra por precio.
 */
export function leerFiltrosCatalogo(parametros: ParametrosCatalogo): FiltrosCatalogo {
  const precioMinimo = precioDeLaUrl(parametros.precioMin);
  const precioMaximo = precioDeLaUrl(parametros.precioMax ?? parametros.precio);
  const invertido = precioMinimo !== null && precioMaximo !== null && precioMinimo > precioMaximo;
  return {
    buscar: parametros.buscar ?? '',
    categoria: parametros.categoria ?? '',
    precioMinimo: invertido ? null : precioMinimo,
    precioMaximo: invertido ? null : precioMaximo,
  };
}

/** Los parámetros de la URL de unos filtros, sin los valores por defecto. */
export function parametrosDeFiltrosCatalogo(filtros: FiltrosCatalogo): Record<string, string> {
  const buscar = filtros.buscar.trim();
  return {
    ...(buscar ? { buscar } : {}),
    ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
    ...(filtros.precioMinimo !== null ? { precioMin: String(filtros.precioMinimo) } : {}),
    ...(filtros.precioMaximo !== null ? { precioMax: String(filtros.precioMaximo) } : {}),
  };
}

export function hayFiltrosCatalogo(filtros: FiltrosCatalogo): boolean {
  return (
    Boolean(filtros.buscar.trim()) ||
    Boolean(filtros.categoria) ||
    filtros.precioMinimo !== null ||
    filtros.precioMaximo !== null
  );
}

/** Los productos del nombre y de la categoría (o una de sus descendientes), sin mirar el precio. */
export function filtrarPorNombreYCategoria(
  productos: readonly Producto[],
  categorias: readonly Categoria[],
  filtros: Pick<FiltrosCatalogo, 'buscar' | 'categoria'>,
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
      (!categoria || categoriasValidas.has(producto.categoryId)),
  );
}

/** Los productos que cumplen los filtros: el nombre, la categoría o una de sus descendientes, y el rango de precio. */
export function filtrarProductos(
  productos: readonly Producto[],
  categorias: readonly Categoria[],
  filtros: FiltrosCatalogo,
): readonly Producto[] {
  return filtrarPorNombreYCategoria(productos, categorias, filtros).filter(
    (producto) =>
      (filtros.precioMinimo === null || producto.price >= filtros.precioMinimo) &&
      (filtros.precioMaximo === null || producto.price <= filtros.precioMaximo),
  );
}
