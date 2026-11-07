/**
 * Revisión de los datos de negocio. Sube con cada venta, cambio de pedido, reclamo o guardado del Admin;
 * un guardado del Admin con una revisión vieja se rechaza para no pisar stock vendido mientras tanto.
 */
export function bumpRevision(state) {
  state.revision = (state.revision ?? 0) + 1;
}
