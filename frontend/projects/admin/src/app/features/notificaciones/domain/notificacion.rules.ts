import type { Permiso } from '../../sesion/domain/rol.rules';
import { Aviso, ConteoDeAvisos, PresentacionDelAviso } from './notificacion.model';

/**
 * Campana de notificaciones del Admin (lote 07b, ADR-0017, PBI-0033; confirmada por Daniel el 2026-11-18): cuántos
 * avisos nuevos hay desde la última vez que la persona abrió el menú y hasta cuál se vieron. Lote 13 (ADR-0021,
 * PBI-0173; confirmado por Sebastián Avila): además de los pedidos nuevos, los reclamos nuevos y los errores de compra.
 */

/** Cada cuánto se pone al día la campana mientras la pestaña está visible (lote 08, PBI-0160). */
export const INTERVALO_DE_ACTUALIZACION_MS = 60_000;

/** Permisos que dan avisos: pedidos (`orders.view`), reclamos y errores de compra; el BFF repite la regla. */
const PERMISOS_DE_LA_CAMPANA: readonly Permiso[] = ['orders.view', 'complaints.manage', 'orders.manage'];

/** La campana existe para quien recibe al menos un tipo de aviso. */
export function puedeVerLaCampana(puede: (permiso: Permiso) => boolean): boolean {
  return PERMISOS_DE_LA_CAMPANA.some((permiso) => puede(permiso));
}

/** Encabezado del menú: «Pedidos nuevos» para quien solo recibe pedidos (el vendedor), «Avisos nuevos» si hay más. */
export function tituloDelMenu(puede: (permiso: Permiso) => boolean): { titulo: string; vacio: string } {
  const masQuePedidos = puede('complaints.manage') || puede('orders.manage');
  return masQuePedidos
    ? { titulo: 'Avisos nuevos', vacio: 'No hay avisos nuevos.' }
    : { titulo: 'Pedidos nuevos', vacio: 'No hay pedidos nuevos.' };
}

/** Número que se ve sobre la campana: nada sin avisos nuevos y «9+» desde 10, para que quepa en el círculo. */
export function contadorDeLaCampana(total: number): string {
  if (total <= 0) return '';
  return total > 9 ? '9+' : String(total);
}

const cuantos = (cantidad: number, singular: string, plural: string) =>
  `${cantidad} ${cantidad === 1 ? singular : plural}`;

/** Nombre accesible del botón: cuántos avisos nuevos hay de cada tipo, también cuando el número no se ve. */
export function nombreDeLaCampana(conteo: ConteoDeAvisos): string {
  const partes = [
    conteo.orders ? cuantos(conteo.orders, 'pedido nuevo', 'pedidos nuevos') : '',
    conteo.complaints ? cuantos(conteo.complaints, 'reclamo nuevo', 'reclamos nuevos') : '',
    conteo.checkoutErrors ? cuantos(conteo.checkoutErrors, 'error de compra', 'errores de compra') : '',
  ].filter(Boolean);
  if (!partes.length) return 'Notificaciones: no hay avisos nuevos';
  const lista = partes.length < 2 ? partes[0] : `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`;
  return `Notificaciones: ${lista}`;
}

/** `at` del aviso más reciente que se mostró: el BFF marca «visto» hasta él (no hasta ahora). */
export function hastaDelMasReciente(avisos: readonly Pick<Aviso, 'at'>[]): string | null {
  return avisos.reduce<string | null>(
    (masReciente, aviso) =>
      !masReciente || new Date(aviso.at) > new Date(masReciente) ? aviso.at : masReciente,
    null,
  );
}

/**
 * Cada error de compra, con lo que pasó y la página donde se resuelve: el stock en Inventario, un producto fuera de
 * venta en Productos, un distrito sin tarifa en Tarifas de envío y un total que cambió (precio o envío) en Pedidos.
 */
const ERRORES_DE_COMPRA: Readonly<
  Record<string, { titulo: string; detalle?: string; ruta: string; filtro?: string }>
> = {
  INSUFFICIENT_STOCK: {
    titulo: 'Compra no completada: sin stock suficiente',
    ruta: '/inventario',
    filtro: 'texto',
  },
  PRODUCT_UNAVAILABLE: {
    titulo: 'Compra no completada: producto fuera de venta',
    ruta: '/productos',
    filtro: 'nombre',
  },
  ORDER_TOTAL_CHANGED: {
    titulo: 'Compra no completada: el total cambió',
    detalle: 'Cambió un precio o el envío mientras el cliente compraba',
    ruta: '/pedidos',
  },
  SHIPPING_UNAVAILABLE: { titulo: 'Compra no completada: distrito sin tarifa de envío', ruta: '/envios' },
};

/** Cómo se muestra un aviso en el menú de la campana y a qué página lleva. */
export function presentacionDelAviso(aviso: Aviso): PresentacionDelAviso {
  switch (aviso.type) {
    case 'order':
      return {
        titulo: `${aviso.id} · ${aviso.customer}`,
        detalle: null,
        ruta: '/pedidos',
        parametros: { pedido: aviso.id },
      };
    case 'complaint':
      return {
        titulo: `${aviso.complaintType === 'queja' ? 'Queja' : 'Reclamo'} ${aviso.id}`,
        detalle: 'Libro de reclamaciones',
        ruta: '/reclamaciones',
        parametros: { texto: aviso.id },
      };
    case 'checkout-error': {
      const error = ERRORES_DE_COMPRA[aviso.code] ?? { titulo: 'Compra no completada', ruta: '/pedidos' };
      return {
        titulo: error.titulo,
        detalle: aviso.product ?? error.detalle ?? null,
        ruta: error.ruta,
        parametros: error.filtro && aviso.product ? { [error.filtro]: aviso.product } : null,
      };
    }
  }
}
