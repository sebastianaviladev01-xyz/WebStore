/** Lo que se sabe de la lista al eliminar una fila y después de volver a pintarla. */
export interface ListaTrasEliminar {
  /** Lugar de la fila eliminada entre las filas visibles antes de eliminar (`-1` si no se sabe). */
  readonly lugar: number;
  /** Filas visibles después de eliminar. */
  readonly quedan: number;
  /** Página que se veía al eliminar (1 en una lista sin páginas). */
  readonly paginaAntes: number;
  /** Página que se ve después de eliminar. */
  readonly paginaDespues: number;
}

/**
 * A qué fila va el foco tras eliminar una (lote 43, PBI-0269; PBI-0273): su lugar entre las filas que quedan a la vista,
 * o `-1` para el título de la página. Es la que ocupa su lugar; si era la última, la anterior; si la lista quedó vacía,
 * el título. Si la lista volvió a una página anterior (se eliminó la única fila de la última página), la última fila de
 * esa página, la más cercana a la eliminada.
 */
export function lugarTrasEliminar({ lugar, quedan, paginaAntes, paginaDespues }: ListaTrasEliminar): number {
  if (lugar < 0 || quedan <= 0) return -1;
  if (paginaDespues < paginaAntes) return quedan - 1;
  return Math.min(lugar, quedan - 1);
}
