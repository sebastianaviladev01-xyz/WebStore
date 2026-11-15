import { DomainError } from '../comun/domain-error.mjs';

/**
 * Personas en línea en la tienda (lote 07b, ADR-0017, PBI-0027; provisional, por confirmar con Daniel). La tienda
 * envía un latido con un identificador aleatorio de su pestaña; aquí solo se recuerda ese identificador y la hora del
 * último latido, en memoria (un `Map`), sin IP, agente de usuario ni cookie. Cuenta lo de los últimos 5 minutos.
 */
export const VENTANA_EN_LINEA_MS = 5 * 60 * 1000;

/** Tope de pestañas recordadas: un cliente que inventa identificadores no hace crecer la memoria sin límite. */
export const MAX_VISITAS_EN_MEMORIA = 10_000;

const ID_DE_VISITA = /^[A-Za-z0-9_-]{16,128}$/;

export function exigirIdDeVisita(valor) {
  if (typeof valor !== 'string' || !ID_DE_VISITA.test(valor))
    throw new DomainError('validation', 'INVALID_VISIT_ID', 'El identificador de la visita no es válido.');
  return valor;
}

/** Olvida las pestañas cuyo último latido ya salió de la ventana. */
function olvidarVencidas(visitas, ahora) {
  for (const [id, ultimo] of visitas) if (ahora - ultimo >= VENTANA_EN_LINEA_MS) visitas.delete(id);
}

/** Anota el latido de una pestaña. Con la memoria llena, una pestaña nueva no se anota hasta que vencen otras. */
export function registrarLatido(visitas, id, ahora) {
  if (!visitas.has(id) && visitas.size >= MAX_VISITAS_EN_MEMORIA) olvidarVencidas(visitas, ahora);
  if (!visitas.has(id) && visitas.size >= MAX_VISITAS_EN_MEMORIA) return;
  visitas.set(id, ahora);
}

/** Pestañas con un latido en los últimos 5 minutos; las vencidas se olvidan. */
export function personasEnLinea(visitas, ahora) {
  olvidarVencidas(visitas, ahora);
  return visitas.size;
}
