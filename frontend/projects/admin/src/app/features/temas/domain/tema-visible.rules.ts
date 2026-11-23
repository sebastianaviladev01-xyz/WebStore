import type { Apariencia, Tema } from './tema.model';

/** Tema que se pinta si el activo ya no existe; es el mismo que `TEMA_POR_DEFECTO` del BFF (lo comprueba la prueba). */
export const TEMA_POR_DEFECTO = 'b';

/** Tema que se pinta y qué hacer con la cookie de vista previa. */
export interface TemaVisible {
  readonly tema: Tema;
  readonly esVistaPrevia: boolean;
  readonly borrarVistaPrevia: boolean;
}

/**
 * Elige el tema que se pinta (AC-16 y AC-21). `idVistaPrevia` es la cookie `ws_tema_vista_previa`
 * (`null`, `undefined` o `''` significan que no hay). Solo con el modo demo activo la vista previa
 * manda, y solo si su tema sigue existiendo y es un predefinido, los únicos que ofrece la tuerca (PBI-0188,
 * ADR-0022); en cualquier otro caso se pinta el tema activo (o el de por defecto, o el primero, si el activo ya no
 * existe) y `borrarVistaPrevia` pide borrar una cookie que ya no sirve.
 * Es pura: no muta la apariencia ni lee cookies ni el DOM.
 */
export function temaVisible(apariencia: Apariencia, idVistaPrevia: string | null | undefined): TemaVisible {
  const { themes } = apariencia;
  if (themes.length === 0) throw new Error('La apariencia no trae temas.');
  const activo =
    themes.find((tema) => tema.id === apariencia.activeThemeId) ??
    themes.find((tema) => tema.id === TEMA_POR_DEFECTO) ??
    themes[0];
  const hayCookie = idVistaPrevia !== null && idVistaPrevia !== undefined && idVistaPrevia !== '';
  if (!apariencia.demoMode || !hayCookie) {
    return { tema: activo, esVistaPrevia: false, borrarVistaPrevia: hayCookie };
  }
  const vistaPrevia = themes.find((tema) => tema.id === idVistaPrevia && tema.kind === 'predefined');
  return vistaPrevia
    ? { tema: vistaPrevia, esVistaPrevia: true, borrarVistaPrevia: false }
    : { tema: activo, esVistaPrevia: false, borrarVistaPrevia: true };
}
