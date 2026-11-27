/**
 * Acceso a WhatsApp de la tienda (lote 49, ADR-0035, PBI-0241; decidido por Sebastián Avila el 2026-11-27, sin esperar
 * a Daniel). El BFF guarda el número solo con sus dígitos y el mensaje recortado; la tienda arma el enlace `wa.me` y
 * descarta lo que no podría abrir, por si llega un contenido de antes o incompleto.
 */

const MINIMO_DIGITOS = 8;
const MAXIMO_DIGITOS = 15;

/**
 * `https://wa.me/<dígitos>`, con `?text=<mensaje codificado>` si hay mensaje, o `null` si no hay un número de 8 a 15
 * dígitos: sin número no hay botón.
 */
export function enlaceDeWhatsapp(numero: unknown, mensaje: unknown): string | null {
  if (typeof numero !== 'string' || /[^\d\s+().-]/.test(numero)) return null;
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length < MINIMO_DIGITOS || digitos.length > MAXIMO_DIGITOS) return null;
  const texto = typeof mensaje === 'string' ? mensaje.trim() : '';
  return `https://wa.me/${digitos}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

/** El botón va en todas las páginas menos el checkout, para no tapar «Finalizar compra» ni distraer del pago. */
export function muestraWhatsappEn(url: string): boolean {
  const ruta = url.split(/[?#]/)[0] ?? '';
  return ruta !== '/checkout' && !ruta.startsWith('/checkout/');
}
