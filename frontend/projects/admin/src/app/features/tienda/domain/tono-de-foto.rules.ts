/**
 * Tono de la foto del banner (lote 24, ADR-0025, PBI-0221; confirmado por Sebastián Avila). Daniel no entendía el campo
 * «Tono de la foto»: el backoffice lo calcula al cargar la imagen de escritorio. En el inicio, los controles del
 * carrusel van en la esquina inferior derecha del banner, sobre la foto; si esa zona es oscura, la tienda los pinta
 * oscuros (`dark`, vidrio oscuro con íconos claros) y, si no, claros (`light`). La persona puede corregirlo en el
 * formulario.
 */
export type TonoDeFoto = 'light' | 'dark';

/** Luminancia relativa del gris medio (L* = 50): por debajo, la zona es oscura. */
export const LUMINANCIA_DE_CORTE = 0.18;

/** Proporción de la foto, desde la derecha y desde abajo, en la que van los controles del carrusel. */
const ANCHO_DE_LA_ZONA = 0.3;
const ALTO_DE_LA_ZONA = 0.25;

/** La esquina inferior derecha de una foto de `ancho` × `alto` px, donde van los controles del carrusel. */
export function zonaDeLosControles(
  ancho: number,
  alto: number,
): { x: number; y: number; ancho: number; alto: number } {
  const x = Math.min(ancho - 1, Math.round(ancho * (1 - ANCHO_DE_LA_ZONA)));
  const y = Math.min(alto - 1, Math.round(alto * (1 - ALTO_DE_LA_ZONA)));
  return { x, y, ancho: ancho - x, alto: alto - y };
}

/** Canal sRGB (0–255) en luz lineal, como lo define WCAG para la luminancia relativa. */
function lineal(canal: number): number {
  const c = canal / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Tono de una zona dada por sus píxeles RGBA (los de `getImageData`): la luminancia relativa media, con lo transparente
 * tomado como fondo claro. Sin píxeles, los controles claros, que son los de siempre.
 */
export function tonoDeLaZona(rgba: ArrayLike<number>): TonoDeFoto {
  const pixeles = Math.floor(rgba.length / 4);
  if (!pixeles) return 'light';
  let suma = 0;
  for (let i = 0; i < pixeles * 4; i += 4) {
    const luminancia = 0.2126 * lineal(rgba[i]) + 0.7152 * lineal(rgba[i + 1]) + 0.0722 * lineal(rgba[i + 2]);
    const opacidad = rgba[i + 3] / 255;
    suma += luminancia * opacidad + (1 - opacidad);
  }
  return suma / pixeles < LUMINANCIA_DE_CORTE ? 'dark' : 'light';
}
