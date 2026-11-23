import { DomainError } from '../../domain/comun/domain-error.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import {
  conVisto,
  notificacionesDe,
  puedeVerNotificaciones,
  vistoDe,
} from '../../domain/admin/notificaciones.rules.mjs';

/**
 * Campana del Admin (lote 07b, ADR-0017, PBI-0033): avisos nuevos desde lo último que vio cada usuario. Desde el
 * lote 13 (ADR-0021, PBI-0173), pedidos, reclamos y errores de compra, cada tipo para el rol que lo gestiona.
 */
export function createNotificacionesUseCases({ store }) {
  const requireCampana = (user) => {
    if (!puedeVerNotificaciones(user.role))
      throw new DomainError('forbidden', 'INSUFFICIENT_ROLE', 'Tu rol no permite realizar esta acción.');
  };
  const vista = (user) =>
    notificacionesDe(store.state, user.role, vistoDe(store.state.adminNotificationsSeen, user.id));
  return {
    get(user) {
      requireCampana(user);
      return vista(user);
    },
    /** `{ until }`: el instante del aviso más reciente que la persona vio en el menú. No cambia la revisión. */
    marcarVisto(user, command) {
      requireCampana(user);
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
