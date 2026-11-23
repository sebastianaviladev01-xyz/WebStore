import { EstadoPedido } from '../domain/tienda.model';

/** Colores de la insignia del estado de un pedido, los mismos en el Dashboard y en Pedidos (PBI-0080). */
export function clasesDeEstadoPedido(status: EstadoPedido): string {
  if (status === 'cancelled') return 'bg-danger-soft text-danger';
  if (status === 'delivered') return 'bg-soft text-body';
  return 'bg-primary-soft text-on-primary-soft';
}
