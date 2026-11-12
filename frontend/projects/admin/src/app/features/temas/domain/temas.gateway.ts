import type { Apariencia, ColoresTema, TemasAdmin } from './tema.model';

/** El BFF rechazó el cambio porque los temas cambiaron desde la última carga (`409 STALE_THEMES`). */
export class TemasDesactualizadosError extends Error {
  constructor() {
    super('STALE_THEMES');
  }
}

/**
 * El BFF rechazó el cambio por una regla de negocio. `code` es el código del contrato (por ejemplo
 * `INVALID_THEME_COLOR`) y `details` su detalle (`field` o `pairs`), para marcar el campo del formulario.
 */
export class ReglaTemaError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Lo que una persona escribe para crear o editar un tema propio. */
export type EntradaTema = { readonly name: string; readonly colors: ColoresTema };

export abstract class TemasGateway {
  /** Apariencia pública: tema activo y, en modo demo, todos los temas. */
  abstract apariencia(): Promise<Apariencia>;
  abstract temasAdmin(token: string): Promise<TemasAdmin>;
  abstract crear(revision: number, entrada: EntradaTema, token: string): Promise<TemasAdmin>;
  abstract editar(id: string, revision: number, entrada: EntradaTema, token: string): Promise<TemasAdmin>;
  abstract borrar(id: string, revision: number, token: string): Promise<TemasAdmin>;
  abstract activar(themeId: string, revision: number, token: string): Promise<TemasAdmin>;
}
