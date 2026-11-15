/**
 * Borradores de los formularios del Admin cuando la sesión vence a mitad de una edición (lote 07, ADR-0017;
 * PBI-0151). Viven solo en memoria, en `SesionFacade`: nunca en `localStorage` ni en `sessionStorage`. Se recuperan
 * al volver a ingresar en la misma pestaña, solo la misma persona y en la misma página; al recargar se pierden.
 */
export interface Borrador {
  readonly usuarioId: string;
  /** Ruta de la página, sin parámetros de consulta (por ejemplo, `/productos/p-001`). */
  readonly ruta: string;
  readonly valor: unknown;
}

/** Agrega el borrador; reemplaza el de la misma persona y la misma página. */
export function conBorrador(borradores: readonly Borrador[], nuevo: Borrador): readonly Borrador[] {
  return [
    ...borradores.filter((otro) => otro.usuarioId !== nuevo.usuarioId || otro.ruta !== nuevo.ruta),
    nuevo,
  ];
}

/** El borrador de la página para esa persona, que se quita de la lista: se recupera una sola vez. */
export function tomarBorrador(
  borradores: readonly Borrador[],
  usuarioId: string,
  ruta: string,
): { readonly borrador: Borrador | null; readonly resto: readonly Borrador[] } {
  const borrador = borradores.find((otro) => otro.usuarioId === usuarioId && otro.ruta === ruta) ?? null;
  return { borrador, resto: borradores.filter((otro) => otro !== borrador) };
}

/** Al ingresar quedan solo los borradores de quien ingresa: los de otra persona se descartan. */
export function borradoresAlIngresar(
  borradores: readonly Borrador[],
  usuarioId: string,
): readonly Borrador[] {
  return borradores.filter((borrador) => borrador.usuarioId === usuarioId);
}

/** Página a la que volver tras ingresar: la del panel donde venció la sesión; si no sirve, el Resumen. */
export function rutaDeRetorno(ruta: string | null | undefined): string {
  if (!ruta || !ruta.startsWith('/') || ruta.startsWith('//')) return '/';
  return /^\/login(?:[/?#]|$)/.test(ruta) ? '/' : ruta;
}
