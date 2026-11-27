/**
 * Acceso a WhatsApp de la tienda (lote 49, ADR-0035, PBI-0241; decidido por Sebastián Avila el 2026-11-27, sin esperar a
 * Daniel). La tienda muestra un botón que abre `https://wa.me/<dígitos>` con el número de Contenido; sin número, no hay
 * botón.
 *
 * - `whatsappNumber`: en formato internacional con código de país (Perú: 51 y los 9 dígitos del celular). Se escribe
 *   como un teléfono de contacto (espacios, `+` al inicio, guiones, puntos o paréntesis) y se guardan solo sus dígitos,
 *   de 8 a 15. Un celular peruano sin el 51 (9 dígitos que empiezan con 9, que ningún número internacional tiene) pide
 *   el código de país: `wa.me` no lo abriría. Es un campo propio, no el primer teléfono de contacto: no todo teléfono
 *   tiene WhatsApp.
 * - `whatsappMessage`: el mensaje con que se abre la conversación, opcional, recortado y de hasta 200 caracteres.
 *
 * Cada regla devuelve `{ valor }` normalizado o `{ error }` con el motivo, que el Admin muestra tal cual.
 */

export const MAXIMO_MENSAJE_DE_WHATSAPP = 200;
export const MINIMO_DIGITOS_DE_WHATSAPP = 8;
export const MAXIMO_DIGITOS_DE_WHATSAPP = 15;

const FORMA_DE_TELEFONO = /^\+?[\d\s().-]+$/;
const EJEMPLO = '51 987 654 321';
const CELULAR_PERUANO_SIN_CODIGO = /^9\d{8}$/;

export function validarNumeroDeWhatsapp(numero) {
  if (typeof numero !== 'string') return { error: 'el número de WhatsApp no es válido' };
  const limpio = numero.trim();
  if (!limpio) return { valor: '' };
  const digitos = limpio.replace(/\D/g, '');
  if (
    !FORMA_DE_TELEFONO.test(limpio) ||
    digitos.length < MINIMO_DIGITOS_DE_WHATSAPP ||
    digitos.length > MAXIMO_DIGITOS_DE_WHATSAPP
  )
    return {
      error: `el número de WhatsApp «${limpio}» no es válido: usa el código de país y el número, de 8 a 15 dígitos (por ejemplo, ${EJEMPLO})`,
    };
  if (CELULAR_PERUANO_SIN_CODIGO.test(digitos))
    return {
      error: `al número de WhatsApp «${limpio}» le falta el código de país: escríbelo con el 51 delante (por ejemplo, ${EJEMPLO})`,
    };
  return { valor: digitos };
}

export function validarMensajeDeWhatsapp(mensaje) {
  if (typeof mensaje !== 'string') return { error: 'el mensaje de WhatsApp no es válido' };
  const limpio = mensaje.trim();
  if (limpio.length > MAXIMO_MENSAJE_DE_WHATSAPP)
    return { error: `el mensaje de WhatsApp admite hasta ${MAXIMO_MENSAJE_DE_WHATSAPP} caracteres` };
  return { valor: limpio };
}

/** Reglas de cada campo de `config`, para el guardado del Admin. */
export const CAMPOS_DE_WHATSAPP = Object.freeze({
  whatsappNumber: validarNumeroDeWhatsapp,
  whatsappMessage: validarMensajeDeWhatsapp,
});

/**
 * Los dos campos al cargar un estado, sin migración ni cambio de `schemaVersion`: sin ellos (un estado de antes del
 * lote 49) o con un número que no sirve, vacíos; un mensaje que no es texto, vacío, y uno largo, cortado a 200.
 */
export function whatsappGuardado(config) {
  const numero = validarNumeroDeWhatsapp(config.whatsappNumber ?? '');
  const mensaje =
    typeof config.whatsappMessage === 'string'
      ? config.whatsappMessage.trim().slice(0, MAXIMO_MENSAJE_DE_WHATSAPP)
      : '';
  return { whatsappNumber: numero.valor ?? '', whatsappMessage: mensaje };
}
