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
 * Imagen pequeña de una categoría (lote 07b, ADR-0017, PBI-0052). Desde el lote 11 (ADR-0021, PBI-0176; provisional)
 * se guarda una sola versión de 100 × 100 px, el lado que exige el BFF (`LADO_IMAGEN_DE_CATEGORIA`), y debe caber en
 * el máximo que acepta (`MAX_IMAGEN_DE_CATEGORIA`); la prueba los compara. El BFF de prueba no reduce imágenes, así
 * que esa versión la genera el Admin.
 */
export const LADO_IMAGEN_CATEGORIA = 100;
export const MAX_CARACTERES_IMAGEN_CATEGORIA = 100_000;

/** La foto original de la categoría debe pesar menos de 1 MB (Daniel, 2026-11-19). */
export const LIMITE_ARCHIVO_CATEGORIA = 1024 * 1024;
const TIPOS_FOTO_CATEGORIA: readonly string[] = ['image/png', 'image/jpeg', 'image/webp'];

/** Por qué no se puede usar el archivo elegido como foto de la categoría, o `null` si se puede. */
export function motivoParaNoUsarFotoDeCategoria(archivo: {
  readonly type: string;
  readonly size: number;
}): string | null {
  if (!TIPOS_FOTO_CATEGORIA.includes(archivo.type)) return 'Usa una foto PNG, JPG o WebP.';
  if (archivo.size >= LIMITE_ARCHIVO_CATEGORIA) return 'La foto pesa 1 MB o más. Usa una de menos de 1 MB.';
  return null;
}

/**
 * Dónde dibujar una foto de `ancho` × `alto` dentro de un cuadrado de `lado` px: entera (sin recortarla), centrada y sin
 * agrandarla. Lo que sobra queda transparente (o del color de la superficie, si el navegador no genera WebP).
 */
export function encajeEnCuadrado(
  ancho: number,
  alto: number,
  lado: number,
): { x: number; y: number; ancho: number; alto: number } {
  const medidas = medidasReducidas(ancho, alto, lado);
  return {
    x: Math.round((lado - medidas.ancho) / 2),
    y: Math.round((lado - medidas.alto) / 2),
    ...medidas,
  };
}

/** Fotos adicionales de un producto además de la principal (lote 08, PBI-0134: antes era una constante de la página). */
export const MAXIMO_FOTOS_DE_GALERIA = 6;

/** ¿Entra otra foto en la galería que ya tiene `cantidad`? */
export const hayLugarEnLaGaleria = (cantidad: number): boolean => cantidad < MAXIMO_FOTOS_DE_GALERIA;

export const mensajeDeGaleriaLlena = (): string => `Máximo ${MAXIMO_FOTOS_DE_GALERIA} fotos adicionales.`;
