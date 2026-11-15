import { DomainError } from '../comun/domain-error.mjs';

/**
 * Notificaciones del Admin (lote 07b, ADR-0017, PBI-0033; provisional, por confirmar con Daniel): los pedidos nuevos
 * (estado «confirmado») creados después de la última vez que la persona abrió el menú de la campana. «Visto» se guarda
 * por usuario en `adminNotificationsSeen` (`[{ userId, seenAt }]`).
 */
export const MAX_PEDIDOS_EN_NOTIFICACIONES = 20;

const instante = (iso) => new Date(iso).getTime();

/** Vista de la campana: cuántos pedidos nuevos hay y los 20 más recientes, sin datos de contacto. */
export function notificacionesDe(orders, seenAt) {
  const desde = seenAt ? instante(seenAt) : -Infinity;
  const nuevos = orders
    .filter((order) => order.status === 'confirmed' && instante(order.createdAt) > desde)
    .sort((a, b) => instante(b.createdAt) - instante(a.createdAt));
  return {
    seenAt: seenAt ?? null,
    total: nuevos.length,
    orders: nuevos.slice(0, MAX_PEDIDOS_EN_NOTIFICACIONES).map((order) => ({
      id: order.id,
      customer: order.customer?.fullName ?? '',
      total: order.total,
      createdAt: order.createdAt,
    })),
  };
}

export const vistoDe = (vistos, userId) => vistos.find((item) => item.userId === userId)?.seenAt ?? null;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/**
 * Anota «visto hasta» del usuario: el `createdAt` del pedido más reciente que vio en el menú, así un pedido que llegó
 * mientras tanto sigue siendo nuevo. Nunca retrocede ni pasa de `ahora`.
 */
export function conVisto(vistos, userId, hasta, ahora) {
  if (typeof hasta !== 'string' || !ISO.test(hasta) || Number.isNaN(instante(hasta)))
    throw new DomainError(
      'validation',
      'INVALID_SEEN_AT',
      'Indica hasta qué pedido se vieron las notificaciones.',
    );
  const anterior = vistoDe(vistos, userId);
  let seenAt = instante(hasta) > instante(ahora) ? ahora : new Date(instante(hasta)).toISOString();
  if (anterior && instante(anterior) > instante(seenAt)) seenAt = anterior;
  return [...vistos.filter((item) => item.userId !== userId), { userId, seenAt }];
}

/** Al cargar el estado: solo entradas bien formadas. Sin migración (una lista ausente queda vacía). */
export const normalizarVistos = (vistos) =>
  Array.isArray(vistos)
    ? vistos.filter((item) => item && typeof item.userId === 'string' && typeof item.seenAt === 'string')
    : [];
