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
 * Imagen pequeña de una categoría (lote 07b, ADR-0017, PBI-0052). Desde el lote 11 (ADR-0021, PBI-0176; confirmado por
 * Sebastián Avila) se guarda una sola versión de 100 × 100 px, el lado que exige el BFF (`LADO_IMAGEN_DE_CATEGORIA`), y
 * debe caber en el máximo que acepta (`MAX_IMAGEN_DE_CATEGORIA`); la prueba los compara. El BFF de prueba no reduce
 * imágenes, así que esa versión la genera el Admin.
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

/**
 * Imágenes cargadas como archivo (lote 24, ADR-0025 y ADR-0026, PBI-0214; confirmado por Sebastián Avila). La imagen
 * principal del producto se carga una vez: el Admin genera la de la ficha (`LADO_MAXIMO_FOTO`, `BYTES_MAXIMOS_FOTO`) y,
 * a partir de ella, la miniatura de los listados. El banner tiene su imagen de escritorio y, opcional, la del celular.
 * Los lados y pesos (caracteres de la Data URL) son los que valida el BFF; la prueba los compara.
 */
export const LADO_MINIATURA = 480;
export const MAX_CARACTERES_MINIATURA = 60 * 1024;
export const LADO_IMAGEN_BANNER = 2560;
export const MAX_CARACTERES_IMAGEN_BANNER = 550 * 1024;
export const LADO_IMAGEN_MOVIL_BANNER = 1200;
export const MAX_CARACTERES_IMAGEN_MOVIL_BANNER = 200 * 1024;

/** Medidas de la miniatura: la imagen principal reducida a `LADO_MINIATURA` px de lado mayor, sin agrandarla. */
export const medidasDeMiniatura = (ancho: number, alto: number): { ancho: number; alto: number } =>
  medidasReducidas(ancho, alto, LADO_MINIATURA);

/** Peso máximo del archivo que se elige (antes de reducirlo): el mismo que el de las fotos de la galería. */
export const LIMITE_ARCHIVO_FOTO = 15 * 1024 * 1024;

/** Por qué no se puede usar el archivo elegido como imagen del producto o del banner, o `null` si se puede. */
export function motivoParaNoUsarFoto(archivo: {
  readonly type: string;
  readonly size: number;
}): string | null {
  if (!TIPOS_FOTO_CATEGORIA.includes(archivo.type)) return 'Usa una foto PNG, JPG o WebP.';
  if (archivo.size > LIMITE_ARCHIVO_FOTO) return 'La foto pesa más de 15 MB. Usa una más liviana.';
  return null;
}

/**
 * Por qué no se puede usar el archivo elegido como logo de la tienda, o `null` si se puede (lote 50, ADR-0037, PBI-0289;
 * decisión de Sebastián Avila del 2026-11-27): se carga como las demás imágenes (ADR-0026), así que es un PNG, un JPG o
 * un WebP; un SVG no, porque la tienda lo recibe por dirección. El campo «URL/Data URL del logo» se queda para escribir
 * la dirección de otro.
 */
export function motivoParaNoUsarLogo(archivo: {
  readonly type: string;
  readonly size: number;
}): string | null {
  if (!TIPOS_FOTO_CATEGORIA.includes(archivo.type))
    return 'Usa un logo PNG, JPG o WebP, o escribe su dirección en «URL/Data URL del logo».';
  if (archivo.size > LIMITE_ARCHIVO_FOTO) return 'El logo pesa más de 15 MB. Usa uno más liviano.';
  return null;
}
