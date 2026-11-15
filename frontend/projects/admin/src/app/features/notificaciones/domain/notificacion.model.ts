/** Un pedido nuevo de la campana, sin datos de contacto (lote 07b, PBI-0033). */
export interface PedidoNuevo {
  readonly id: string;
  readonly customer: string;
  readonly total: number;
  readonly createdAt: string;
}

/** Lo que trae el BFF en `GET /bff/admin/notifications`. */
export interface Notificaciones {
  /** Hasta qué pedido vio la persona; `null` si nunca abrió el menú. */
  readonly seenAt: string | null;
  /** Cuántos pedidos nuevos hay (pueden ser más que los de `orders`). */
  readonly total: number;
  /** Los 20 más recientes. */
  readonly orders: readonly PedidoNuevo[];
}
