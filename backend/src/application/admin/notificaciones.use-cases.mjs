import { nowIso } from '../../domain/comun/reloj.mjs';
import { conVisto, notificacionesDe, vistoDe } from '../../domain/admin/notificaciones.rules.mjs';

/** Campana del Admin (lote 07b, ADR-0017, PBI-0033): pedidos nuevos desde lo último que vio cada usuario. */
export function createNotificacionesUseCases({ store }) {
  const vista = (user) =>
    notificacionesDe(store.state.orders, vistoDe(store.state.adminNotificationsSeen, user.id));
  return {
    get: vista,
    /** `{ until }`: el `createdAt` del pedido más reciente que la persona vio en el menú. No cambia la revisión. */
    marcarVisto(user, command) {
      store.state.adminNotificationsSeen = conVisto(
        store.state.adminNotificationsSeen,
        user.id,
        command?.until,
        nowIso(),
      );
      store.save();
      return vista(user);
    },
  };
}
