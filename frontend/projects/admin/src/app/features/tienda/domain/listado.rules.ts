/** Elementos por página de los listados del Admin con paginación (feature 008, D2). */
export const ELEMENTOS_POR_PAGINA = 25;

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
