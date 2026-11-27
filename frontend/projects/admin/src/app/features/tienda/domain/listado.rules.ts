/**
 * Tamaños de página que se pueden elegir en «Elementos por página» (lote 43, ADR-0033, PBI-0265), como la lista de
 * proveedores del SGC. Antes eran 25 fijos (feature 008, D2).
 */
export const TAMANOS_DE_PAGINA = [10, 25, 50] as const;
export type TamanoDePagina = (typeof TAMANOS_DE_PAGINA)[number];
/** Tamaño de página por omisión, el del SGC; no se escribe en la URL. */
export const TAMANO_DE_PAGINA_POR_OMISION: TamanoDePagina = 10;

/** Una página de un listado. Tarifas de envío la usa desde el lote 07b (PBI-0155). */
export interface Pagina<T> {
  readonly items: readonly T[];
  /** Página actual, de 1 a `pages` (se ajusta si la pedida ya no existe tras filtrar o eliminar). */
  readonly page: number;
  readonly pages: number;
  /** Posición del primer y último elemento mostrados (desde 1); 0 y 0 si no hay elementos. */
  readonly from: number;
  readonly to: number;
  readonly total: number;
}

/** Texto comparable sin mayúsculas, sin tildes y sin espacios en los extremos: «Jesús María» da «jesus maria». */
export function textoBuscable(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-PE').trim();
}

/** `true` si el filtro está vacío (o solo tiene espacios) o si el valor lo contiene, con el criterio de `textoBuscable`. */
export function contieneTexto(valor: string, filtro: string): boolean {
  const buscado = textoBuscable(filtro);
  return !buscado || textoBuscable(valor).includes(buscado);
}

/** Corta la lista en páginas de `tamano` elementos; la página pedida se ajusta a `1..pages`. */
export function paginar<T>(items: readonly T[], pagina: number, tamano: number): Pagina<T> {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / tamano));
  const page = Math.min(Math.max(1, Math.floor(pagina)), pages);
  const inicio = (page - 1) * tamano;
  const corte = items.slice(inicio, inicio + tamano);
  return { items: corte, page, pages, from: total ? inicio + 1 : 0, to: inicio + corte.length, total };
}

/** Tamaño de página del parámetro `porPagina` de la URL: 10, 25 o 50; cualquier otro valor es el de omisión. */
export function leerTamanoDePagina(valor: string | undefined): TamanoDePagina {
  const tamano = TAMANOS_DE_PAGINA.find((opcion) => String(opcion) === valor);
  return tamano ?? TAMANO_DE_PAGINA_POR_OMISION;
}

/** Rango que muestra la página, como el SGC: «1 - 8 de 8»; sin elementos, «0 de 0». */
export function rangoDePagina(pagina: Pagina<unknown>): string {
  return pagina.total ? `${pagina.from} - ${pagina.to} de ${pagina.total}` : '0 de 0';
}

/** Número de la columna «N°» de la fila `indice` (desde 0) de la página: sigue la numeración entre páginas. */
export function numeroDeFila(pagina: Pagina<unknown>, indice: number): number {
  return pagina.from + indice;
}

/** Cuántos elementos hay de cada clave (por ejemplo, de cada estado), en el orden de `claves` y también los que no tienen ninguno. */
export function contarPorClave<T, K extends string>(
  items: readonly T[],
  claveDe: (item: T) => K,
  claves: readonly K[],
): { readonly clave: K; readonly cantidad: number }[] {
  const cuentas = new Map<K, number>(claves.map((clave) => [clave, 0]));
  for (const item of items) {
    const clave = claveDe(item);
    if (cuentas.has(clave)) cuentas.set(clave, (cuentas.get(clave) ?? 0) + 1);
  }
  return claves.map((clave) => ({ clave, cantidad: cuentas.get(clave) ?? 0 }));
}

/** Texto de una ficha del resumen: la cifra con su nombre en singular o en plural («1 activo», «3 activos»). */
export function textoDeCantidad(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/** Texto de la ficha del total del resumen: «8 en total». */
export function textoDelTotal(cantidad: number): string {
  return `${cantidad} en total`;
}

/**
 * Página (desde 1) en que queda el primer elemento que cumple `es`, con páginas de `tamano`; `null` si no está. Sirve
 * para llevar el listado a la página de un registro recién creado (lote 43, PBI-0265).
 */
export function paginaDelElemento<T>(
  items: readonly T[],
  es: (item: T) => boolean,
  tamano: number,
): number | null {
  const indice = items.findIndex(es);
  return indice < 0 ? null : Math.floor(indice / tamano) + 1;
}
