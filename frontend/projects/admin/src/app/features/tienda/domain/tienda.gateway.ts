import { SnapshotTienda } from './tienda.model';

/** Cambios a guardar: solo las colecciones modificadas y la revisión sobre la que se trabajó. */
export type CambiosTienda = Partial<Omit<SnapshotTienda, 'revision' | 'roles'>> &
  Pick<SnapshotTienda, 'revision'>;

/** El BFF rechazó el guardado porque los datos cambiaron desde la última carga (p. ej. una venta). */
export class SnapshotDesactualizadoError extends Error {
  constructor() {
    super('STALE_SNAPSHOT');
  }
}

/** El BFF rechazó el cambio por una regla de negocio; el mensaje ya está listo para mostrarse. */
export class ReglaTiendaError extends Error {}

export abstract class TiendaGateway {
  abstract load(token: string): Promise<SnapshotTienda>;
  abstract save(update: CambiosTienda, token: string): Promise<SnapshotTienda>;
}
