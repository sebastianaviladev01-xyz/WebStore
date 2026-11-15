import { PedidoNuevo } from './notificacion.model';

/**
 * Campana de notificaciones del Admin (lote 07b, ADR-0017, PBI-0033; provisional, por confirmar con Daniel): cuántos
 * pedidos nuevos hay desde la última vez que la persona abrió el menú y hasta cuál se vieron.
 */

/** Cada cuánto se pone al día la campana mientras la pestaña está visible (lote 08, PBI-0160). */
export const INTERVALO_DE_ACTUALIZACION_MS = 60_000;

/** Número que se ve sobre la campana: nada sin pedidos nuevos y «9+» desde 10, para que quepa en el círculo. */
export function contadorDeLaCampana(total: number): string {
  if (total <= 0) return '';
  return total > 9 ? '9+' : String(total);
}

/** Nombre accesible del botón: dice cuántos pedidos nuevos hay, también cuando el número no se ve. */
export function nombreDeLaCampana(total: number): string {
  if (total <= 0) return 'Notificaciones: no hay pedidos nuevos';
  return `Notificaciones: ${total} ${total === 1 ? 'pedido nuevo' : 'pedidos nuevos'}`;
}

/** `createdAt` del pedido más reciente que se mostró: el BFF marca «visto» hasta él (no hasta ahora). */
export function hastaDelMasReciente(pedidos: readonly Pick<PedidoNuevo, 'createdAt'>[]): string | null {
  return pedidos.reduce<string | null>(
    (masReciente, pedido) =>
      !masReciente || new Date(pedido.createdAt) > new Date(masReciente) ? pedido.createdAt : masReciente,
    null,
  );
}
