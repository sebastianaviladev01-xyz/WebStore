/**
 * Actividad reciente del Resumen del Admin (lote 07b, ADR-0017, PBI-0028; Daniel no pidió cambios el 2026-11-20). Un
 * evento `{ id, at, type, description }` al crear un pedido, al cambiar su estado, al registrar una cuenta y al
 * registrar un reclamo. La descripción no lleva más datos personales que el nombre que el Admin ya muestra (el del
 * comprador en Pedidos y el de quien reclama en Reclamaciones): ni correo, ni teléfono, ni documento, ni dirección.
 * Las cuentas no se ven en el Admin, así que su evento no dice de quién es.
 */
export const MAX_EVENTOS_DE_ACTIVIDAD = 50;

const ESTADOS = {
  confirmed: 'Confirmado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

/**
 * `marca`: `{ at }` (y `id` en las pruebas). El id se forma con la hora, el tipo y el código del pedido o del reclamo,
 * así no depende de un generador y no se repite entre dos eventos distintos.
 */
const evento = ({ id, at }, type, description, sujeto = '') => ({
  id: id ?? [at, type, sujeto].filter(Boolean).join(':'),
  at,
  type,
  description,
});

export const eventoPedidoCreado = (marca, order) =>
  evento(
    marca,
    'order-created',
    `Nuevo pedido ${order.id} de ${order.customer.fullName} por S/ ${Number(order.total).toFixed(2)}.`,
    order.id,
  );

/** `quien`: `'equipo'` (desde el Admin) o `'cliente'` (desde la tienda). No nombra a la persona. */
export function eventoEstadoDePedido(marca, order, status, quien) {
  const description =
    quien === 'cliente' && status === 'cancelled'
      ? `El cliente canceló el pedido ${order.id}.`
      : `El ${quien === 'cliente' ? 'cliente' : 'equipo'} pasó el pedido ${order.id} a «${ESTADOS[status] ?? status}».`;
  return evento(marca, 'order-status-changed', description, `${order.id}:${status}`);
}

/** El id interno de la cuenta solo forma el id del evento: la descripción no dice de quién es. */
export const eventoCuentaRegistrada = (marca, account) =>
  evento(marca, 'account-registered', 'Se registró una cuenta nueva en la tienda.', account?.id);

export const eventoReclamoRegistrado = (marca, complaint) =>
  evento(
    marca,
    'complaint-registered',
    `${complaint.type === 'queja' ? 'Nueva queja' : 'Nuevo reclamo'} ${complaint.id} de ${complaint.name}.`,
    complaint.id,
  );

/** La actividad con el evento nuevo primero, recortada a los últimos 50. */
export const conEvento = (actividad, nuevo) => [nuevo, ...actividad].slice(0, MAX_EVENTOS_DE_ACTIVIDAD);

const esEvento = (item) =>
  item !== null &&
  typeof item === 'object' &&
  ['id', 'at', 'type', 'description'].every((campo) => typeof item[campo] === 'string');

/** Al cargar el estado: solo eventos bien formados, como mucho 50. Sin migración (una lista ausente queda vacía). */
export const normalizarActividad = (actividad) =>
  Array.isArray(actividad) ? actividad.filter(esEvento).slice(0, MAX_EVENTOS_DE_ACTIVIDAD) : [];
