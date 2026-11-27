/**
 * La sección «WhatsApp» de Contenido (lote 49, ADR-0035, PBI-0241; decidido por Sebastián Avila el 2026-11-27). Son las
 * reglas del BFF (`domain/admin/whatsapp.rules.mjs`), que es quien decide; aquí sirven para avisar en el formulario
 * antes de enviar y para el enlace «Probar». Cada motivo dice qué hacer, o es `null`.
 */

export const MAXIMO_MENSAJE_DE_WHATSAPP = 200;

const FORMA_DE_TELEFONO = /^\+?[\d\s().-]+$/;
const CELULAR_PERUANO_SIN_CODIGO = /^9\d{8}$/;
export const EJEMPLO_DE_WHATSAPP = '51 987 654 321';

/** El número es opcional (sin él, la tienda no muestra el botón); con él, de 8 a 15 dígitos y el código de país. */
export function motivoDeNumeroDeWhatsapp(valor: string): string | null {
  const numero = valor.trim();
  if (!numero) return null;
  const digitos = numero.replace(/\D/g, '');
  if (!FORMA_DE_TELEFONO.test(numero) || digitos.length < 8 || digitos.length > 15)
    return `Usa el código de país y el número, de 8 a 15 dígitos; por ejemplo, ${EJEMPLO_DE_WHATSAPP}.`;
  if (CELULAR_PERUANO_SIN_CODIGO.test(digitos))
    return `Falta el código de país: escribe el 51 delante, por ejemplo ${EJEMPLO_DE_WHATSAPP}.`;
  return null;
}

export function motivoDeMensajeDeWhatsapp(valor: string): string | null {
  return valor.trim().length > MAXIMO_MENSAJE_DE_WHATSAPP
    ? `Usa hasta ${MAXIMO_MENSAJE_DE_WHATSAPP} caracteres.`
    : null;
}

/** El enlace que abre «Probar»: el mismo que tendrá la tienda, o `null` si el número no es válido o falta. */
export function enlaceDePruebaDeWhatsapp(numero: string, mensaje: string): string | null {
  if (!numero.trim() || motivoDeNumeroDeWhatsapp(numero)) return null;
  const texto = mensaje.trim();
  return `https://wa.me/${numero.replace(/\D/g, '')}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}
