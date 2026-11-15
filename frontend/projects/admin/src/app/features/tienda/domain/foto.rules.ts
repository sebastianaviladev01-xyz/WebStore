/**
 * Fotos que el Admin guarda como Data URL dentro del producto (lote 06, ADR-0017; PBI-0119). Antes de guardarla,
 * cada foto se reduce (lado mayor de `LADO_MAXIMO_FOTO` px) y se comprime probando `CALIDADES_FOTO` de mayor a
 * menor hasta que cabe en `BYTES_MAXIMOS_FOTO`; si ni con la menor cabe, se rechaza. Con seis fotos adicionales y
 * la principal al máximo, un producto sigue cabiendo en un guardado (el BFF corta a 2 MB).
 */
export const LADO_MAXIMO_FOTO = 1600;
export const BYTES_MAXIMOS_FOTO = 250 * 1024;
export const CALIDADES_FOTO: readonly number[] = [0.85, 0.75, 0.6, 0.45];

/** Medidas con el lado mayor reducido a `ladoMaximo`, conservando la proporción; una foto chica no se agranda. */
export function medidasReducidas(
  ancho: number,
  alto: number,
  ladoMaximo = LADO_MAXIMO_FOTO,
): { ancho: number; alto: number } {
  const escala = Math.min(1, ladoMaximo / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

/** La primera versión (de mayor a menor calidad) que cabe en `maximo` caracteres, o `null` si ninguna. */
export const primeraQueCabe = (versiones: readonly string[], maximo = BYTES_MAXIMOS_FOTO): string | null =>
  versiones.find((dataUrl) => dataUrl.length <= maximo) ?? null;

/**
 * Imagen pequeña de una categoría (lote 07b, ADR-0017, PBI-0052): se reduce a 160 px de lado mayor y debe caber en el
 * máximo que acepta el BFF (`MAX_IMAGEN_DE_CATEGORIA`, la prueba los compara).
 */
export const LADO_IMAGEN_CATEGORIA = 160;
export const MAX_CARACTERES_IMAGEN_CATEGORIA = 100_000;
