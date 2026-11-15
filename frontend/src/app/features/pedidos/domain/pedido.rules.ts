import type { EstadoPedido } from './pedido.model';

/** El cliente puede cambiar la entrega o cancelar dentro de las 24 horas posteriores a la compra. */
const VENTANA_DE_CAMBIOS_MS = 24 * 60 * 60 * 1000;

/** Estados en los que el BFF ya no deja cambiar ni cancelar el pedido (`ORDER_NOT_MODIFIABLE`). */
const ESTADOS_CERRADOS: readonly EstadoPedido[] = ['shipped', 'delivered', 'cancelled'];

type PedidoConEstado = { readonly status: EstadoPedido; readonly createdAt: string };

/** El pedido no se envió, no se entregó ni se canceló. */
export function estaAbierto(pedido: PedidoConEstado): boolean {
  return !ESTADOS_CERRADOS.includes(pedido.status);
}

/** Hasta cuándo se puede cambiar la entrega o cancelar (24 horas desde la compra). */
export function modificableHasta(pedido: PedidoConEstado): Date {
  return new Date(new Date(pedido.createdAt).getTime() + VENTANA_DE_CAMBIOS_MS);
}

/** La misma regla que el BFF (PBI-0143): abierto y dentro de las 24 horas. */
export function sePuedeModificar(pedido: PedidoConEstado, ahora: Date): boolean {
  return estaAbierto(pedido) && ahora.getTime() <= modificableHasta(pedido).getTime();
}
