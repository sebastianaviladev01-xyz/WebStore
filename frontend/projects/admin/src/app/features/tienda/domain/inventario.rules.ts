/** Lectura del campo de stock de Inventario (lote 06, ADR-0017; PBI-0127). */
export type LecturaStock =
  { readonly valido: true; readonly stock: number } | { readonly valido: false; readonly mensaje: string };

const MENSAJE_STOCK = 'Usa un número entero desde 0. No se guardó.';

/** Solo un entero mayor o igual a 0: vacío, decimales, negativos o texto no se guardan (antes, vacío era 0). */
export function leerStock(texto: string): LecturaStock {
  const limpio = texto.trim();
  return /^\d+$/.test(limpio)
    ? { valido: true, stock: Number(limpio) }
    : { valido: false, mensaje: MENSAJE_STOCK };
}
