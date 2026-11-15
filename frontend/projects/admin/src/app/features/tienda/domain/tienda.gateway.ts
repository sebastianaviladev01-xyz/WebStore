import { ConfiguracionTienda, SnapshotTienda } from './tienda.model';

/** Colecciones del snapshot que el Admin cambia por registro. */
export type ColeccionEditable = Exclude<keyof SnapshotTienda, 'revision' | 'roles' | 'config'>;

/**
 * Cambios de una colección (lote 06, PBI-0119 y PBI-0120): `upsert` trae registros con `id` y solo los campos que
 * cambiaron (completos si son nuevos; `null` quita un campo) y `remove`, los `id` que se eliminan.
 */
export interface CambiosColeccion {
  readonly upsert?: readonly Readonly<Record<string, unknown>>[];
  readonly remove?: readonly string[];
}

/** Cambios a guardar: solo lo que cambió y la revisión sobre la que se trabajó. */
export type CambiosTienda = Pick<SnapshotTienda, 'revision'> &
  Partial<Record<ColeccionEditable, CambiosColeccion>> & {
    readonly config?: Partial<ConfiguracionTienda>;
  };

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
