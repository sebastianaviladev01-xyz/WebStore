/**
 * Reglas de color de los temas: relación de contraste WCAG 2.1, mezcla en sRGB y elección del
 * texto más legible. Funciones puras, sin I/O.
 *
 * Los colores llegan como `#RRGGBB` (mayúsculas o minúsculas). Un valor con otro formato lanza un
 * `Error`: es un error de programación, porque la validación de la entrada de usuario es de otra
 * capa.
 */

const FORMATO_HEX = /^#[0-9A-Fa-f]{6}$/;

/** Convierte `#RRGGBB` en sus tres canales (0 a 255). */
function canales(color) {
  if (typeof color !== 'string' || !FORMATO_HEX.test(color)) {
    throw new Error(`Color inválido: se esperaba #RRGGBB y llegó ${String(color)}`);
  }
  return [1, 3, 5].map((inicio) => parseInt(color.slice(inicio, inicio + 2), 16));
}

/** Luminancia relativa WCAG 2.1 de un color `#RRGGBB`. */
function luminanciaRelativa(color) {
  const [r, g, b] = canales(color).map((canal) => {
    const v = canal / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Relación de contraste WCAG 2.1 entre dos colores, entre 1 y 21. Es simétrica y se devuelve sin
 * redondear.
 */
export function relacionDeContraste(a, b) {
  const la = luminanciaRelativa(a);
  const lb = luminanciaRelativa(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Mezcla dos colores opacos como `color-mix(in srgb, a peso%, b)`: por canal, sobre los valores
 * codificados (sin linealizar). `peso` va de 0 a 1 y es la parte de `a`. Devuelve `#RRGGBB` en
 * mayúsculas.
 */
export function mezclarSrgb(a, peso, b) {
  const ca = canales(a);
  const cb = canales(b);
  const mezcla = ca.map((canal, i) => Math.round(canal * peso + cb[i] * (1 - peso)));
  return `#${mezcla.map((canal) => canal.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * Devuelve el candidato con mayor relación de contraste sobre `fondo`. En empate gana el primero y
 * se devuelve tal como llegó.
 */
export function textoMasLegible(fondo, candidatos) {
  let elegido;
  let mejorRelacion = -1;
  for (const candidato of candidatos) {
    const relacion = relacionDeContraste(fondo, candidato);
    if (relacion > mejorRelacion) {
      mejorRelacion = relacion;
      elegido = candidato;
    }
  }
  return elegido;
}
