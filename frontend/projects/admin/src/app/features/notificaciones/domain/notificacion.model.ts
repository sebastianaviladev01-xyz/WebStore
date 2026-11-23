/** Un pedido nuevo de la campana, sin datos de contacto (lote 07b, PBI-0033). `at` es su `createdAt`. */
export interface AvisoDePedido {
  readonly type: 'order';
  readonly id: string;
  readonly at: string;
  readonly customer: string;
  readonly total: number;
}

/** Un reclamo nuevo (estado «recibido»), sin datos de quien reclama (lote 13, PBI-0173). */
export interface AvisoDeReclamo {
  readonly type: 'complaint';
  readonly id: string;
  readonly at: string;
  readonly complaintType: 'reclamo' | 'queja';
}

/**
 * Un error de compra: un checkout que el BFF rechazó porque la tienda cambió (lote 13, PBI-0173). `code` es el del
 * BFF (`ORDER_TOTAL_CHANGED`, `INSUFFICIENT_STOCK`, `PRODUCT_UNAVAILABLE` o `SHIPPING_UNAVAILABLE`) y `product`, el
 * nombre del producto del catálogo, si lo hay.
 */
export interface AvisoDeErrorDeCompra {
  readonly type: 'checkout-error';
  readonly id: string;
  readonly at: string;
  readonly code: string;
  readonly product: string | null;
}

export type Aviso = AvisoDePedido | AvisoDeReclamo | AvisoDeErrorDeCompra;

/** Avisos nuevos de cada tipo; 0 en los que el rol no recibe. */
export interface ConteoDeAvisos {
  readonly orders: number;
  readonly complaints: number;
  readonly checkoutErrors: number;
}

/** Lo que trae el BFF en `GET /bff/admin/notifications`. */
export interface Notificaciones {
  /** Hasta qué aviso vio la persona; `null` si nunca abrió el menú. */
  readonly seenAt: string | null;
  /** Cuántos avisos nuevos hay (pueden ser más que los de `items`). */
  readonly total: number;
  readonly counts: ConteoDeAvisos;
  /** Los 20 más recientes, de todos los tipos que recibe el rol. */
  readonly items: readonly Aviso[];
}

/** Cómo se muestra un aviso en el menú y a qué página lleva. */
export interface PresentacionDelAviso {
  readonly titulo: string;
  /** Segunda línea antes de la fecha; `null` en un pedido (lleva su total) o sin nada que añadir. */
  readonly detalle: string | null;
  readonly ruta: string;
  readonly parametros: Readonly<Record<string, string>> | null;
}
