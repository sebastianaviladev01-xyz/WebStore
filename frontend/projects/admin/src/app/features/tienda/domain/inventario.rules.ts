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

/** Estado del stock de un producto (lote 07): el que muestra Inventario y por el que se filtra (PBI-0139). */
export type EstadoStock = 'sin-stock' | 'stock-bajo' | 'disponible';

/** Unidades hasta las que el stock es bajo, como el Dashboard («Productos con 5 unidades o menos»). */
export const STOCK_BAJO = 5;

/** Texto del Dashboard bajo la cifra de «Stock bajo»; dice el umbral que se usa (PBI-0079). */
export const NOTA_STOCK_BAJO = `Productos con ${STOCK_BAJO} unidades o menos`;

/** Agotado o con stock bajo: los productos que cuenta «Stock bajo» del Dashboard (PBI-0079). */
export const conPocoStock = (stock: number): boolean => stock <= STOCK_BAJO;

export function estadoDeStock(stock: number): EstadoStock {
  return stock === 0 ? 'sin-stock' : stock <= STOCK_BAJO ? 'stock-bajo' : 'disponible';
}

/** Stock con que empieza un producto nuevo (lote 23, PBI-0226): se carga después, en Inventario. */
export const STOCK_INICIAL = 0;

/**
 * Lote 23 (ADR-0025, PBI-0226; confirmado por Sebastián Avila): el stock sale del registro del producto y se
 * gestiona solo en Inventario. El producto que guarda la ficha lleva el stock con que se abrió (`base`), así el
 * guardado no lo envía ni choca si Inventario o una venta lo cambiaron mientras tanto; uno nuevo empieza sin stock.
 */
export function productoDeLaFicha<T extends { readonly stock: number }>(
  base: T | null,
  ficha: Omit<T, 'stock'>,
): T {
  return { ...ficha, stock: base?.stock ?? STOCK_INICIAL } as T;
}
