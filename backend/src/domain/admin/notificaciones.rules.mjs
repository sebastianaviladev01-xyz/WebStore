import { DomainError } from '../comun/domain-error.mjs';
import { can } from '../sesion/rol.rules.mjs';

/**
 * Notificaciones del Admin (lote 07b, ADR-0017, PBI-0033; provisional, por confirmar con Daniel): los pedidos nuevos
 * (estado «confirmado») creados después de la última vez que la persona abrió el menú de la campana. «Visto» se guarda
 * por usuario en `adminNotificationsSeen` (`[{ userId, seenAt }]`).
 *
 * Lote 13 (ADR-0021, PBI-0173; provisional, por confirmar con Daniel): la campana avisa también de los reclamos nuevos
 * (estado «recibido», a quien gestiona Reclamaciones, `complaints.manage`) y de los errores de compra (a quien
 * gestiona los pedidos, `orders.manage`); los pedidos nuevos siguen siendo de quien los ve (`orders.view`). Un solo
 * «visto» por usuario para los tres tipos: el instante del aviso más reciente que vio.
 */
export const MAX_AVISOS_EN_NOTIFICACIONES = 20;

/** Qué tipo de aviso ve cada permiso. */
const PERMISO_DE_CADA_TIPO = {
  orders: 'orders.view',
  complaints: 'complaints.manage',
  checkoutErrors: 'orders.manage',
};

const instante = (iso) => new Date(iso).getTime();

/** La campana existe para quien ve al menos un tipo de aviso. */
export const puedeVerNotificaciones = (role) =>
  Object.values(PERMISO_DE_CADA_TIPO).some((permiso) => can(role, permiso));

/** Avisos de cada tipo, sin datos de contacto ni del pago. */
const avisosDe = {
  orders: ({ orders }, desde) =>
    orders
      .filter((order) => order.status === 'confirmed' && instante(order.createdAt) > desde)
      .map((order) => ({
        type: 'order',
        id: order.id,
        at: order.createdAt,
        customer: order.customer?.fullName ?? '',
        total: order.total,
      })),
  complaints: ({ complaints = [] }, desde) =>
    complaints
      .filter((complaint) => complaint.status === 'received' && instante(complaint.createdAt) > desde)
      .map((complaint) => ({
        type: 'complaint',
        id: complaint.id,
        at: complaint.createdAt,
        complaintType: complaint.type,
      })),
  checkoutErrors: ({ checkoutErrors = [], products = [] }, desde) =>
    checkoutErrors
      .filter((error) => instante(error.at) > desde)
      .map((error) => ({
        type: 'checkout-error',
        id: error.id,
        at: error.at,
        code: error.code,
        product: products.find((product) => product.id === error.productId)?.name ?? null,
      })),
};

/**
 * Vista de la campana para `role`: cuántos avisos nuevos hay de cada tipo que ve, cuántos en total y los 20 más
 * recientes, mezclados del más nuevo al más antiguo.
 */
export function notificacionesDe(state, role, seenAt) {
  const desde = seenAt ? instante(seenAt) : -Infinity;
  const counts = { orders: 0, complaints: 0, checkoutErrors: 0 };
  const items = [];
  for (const [tipo, permiso] of Object.entries(PERMISO_DE_CADA_TIPO)) {
    if (!can(role, permiso)) continue;
    const avisos = avisosDe[tipo](state, desde);
    counts[tipo] = avisos.length;
    items.push(...avisos);
  }
  items.sort((a, b) => instante(b.at) - instante(a.at));
  return {
    seenAt: seenAt ?? null,
    total: items.length,
    counts,
    items: items.slice(0, MAX_AVISOS_EN_NOTIFICACIONES),
  };
}

export const vistoDe = (vistos, userId) => vistos.find((item) => item.userId === userId)?.seenAt ?? null;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/**
 * Anota «visto hasta» del usuario: el instante del aviso más reciente que vio en el menú, así un aviso que llegó
 * mientras tanto sigue siendo nuevo. Nunca retrocede ni pasa de `ahora`.
 */
export function conVisto(vistos, userId, hasta, ahora) {
  if (typeof hasta !== 'string' || !ISO.test(hasta) || Number.isNaN(instante(hasta)))
    throw new DomainError(
      'validation',
      'INVALID_SEEN_AT',
      'Indica hasta qué aviso se vieron las notificaciones.',
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
