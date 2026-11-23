import { Notificaciones } from './notificacion.model';

/**
 * Puerto de la campana del Admin (lote 07b, PBI-0033; lote 13, PBI-0173): `GET /bff/admin/notifications` y
 * `PUT /bff/admin/notifications/seen`. Un `401` llega como `SesionVencidaError` (feature `sesion`).
 */
export abstract class NotificacionesGateway {
  abstract consultar(token: string): Promise<Notificaciones>;
  /** Marca como vistos los avisos hasta `hasta` (el `at` del más reciente que se mostró). */
  abstract marcarVisto(hasta: string, token: string): Promise<Notificaciones>;
}
