import { pedidosSinDataUrl } from '../../domain/pedidos/fotos-del-pedido.rules.mjs';
import { direccionDeImagen } from '../catalogo/imagenes.queries.mjs';

/**
 * Migración al arrancar de las fotos de los pedidos anteriores al lote 25 (lote 27, ADR-0025, PBI-0236; ADR-0026,
 * confirmado por Sebastián Avila). Esos pedidos guardaban las fotos de la galería como Data URL; aquí pasan a la
 * dirección vigente del BFF (`direccionDeImagen`, la misma de un pedido nuevo) o se quitan (`pedidosSinDataUrl`). Se
 * aplica en cada arranque, sin `schemaVersion`: no hace nada si ya no quedan, y vuelve a limpiar lo que guarde un BFF
 * anterior si se revierte y se vuelve a este. Guarda solo si cambió algo y lo deja en el log (`avisar`).
 */
export function migrarFotosDePedidosAnteriores(store, avisar) {
  const { orders, aDireccion, quitadas } = pedidosSinDataUrl(
    store.state.orders,
    store.state.products,
    direccionDeImagen,
  );
  if (aDireccion + quitadas === 0) return;
  store.state.orders = orders;
  store.save();
  avisar(
    `[pedidos] Fotos de pedidos anteriores al lote 25 (PBI-0236): ${aDireccion} pasan a su dirección y ${quitadas} se quitan, porque su producto ya no las tiene.`,
  );
}
