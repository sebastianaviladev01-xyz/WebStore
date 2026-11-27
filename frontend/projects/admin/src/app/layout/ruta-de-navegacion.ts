import { iconoDelModulo, type NombreIcono } from '../shared/ui/iconos';
import type { GrupoDelMenu } from './menu';

/**
 * Ruta de navegación de la barra superior (lote 44, ADR-0033, PBI-0271; decidido por Sebastián Avila el 2026-11-26, sin
 * esperar a Daniel), como el SGC: el ícono del módulo, el grupo del menú lateral y la página («Catálogo › Productos»).
 * Una página que no está en el menú y cuelga de un listado (un registro) lleva, además, su listado como enlace
 * («Catálogo › Productos › Nuevo producto»). Los nombres del grupo y del listado salen del menú y el de una página fuera
 * de él, del título de su ruta: ninguno se repite aquí.
 */
export interface TramoDeLaRuta {
  readonly etiqueta: string;
  /** Ruta del listado de un registro; `null` en el grupo, que no es una página, y en la página actual. */
  readonly enlace: string | null;
  /** La página actual: la última, con `aria-current="page"`. */
  readonly actual: boolean;
}

export interface RutaDeNavegacion {
  readonly icono: NombreIcono | null;
  readonly tramos: readonly TramoDeLaRuta[];
}

/** Prefijo que llevan los títulos de las rutas del backoffice (`WebStore Admin | Productos`). */
const PREFIJO_DEL_TITULO = /^.*\|\s*/;

/** El nombre de la página a partir del título de su ruta, sin el prefijo de la pestaña; `null` si no tiene. */
export function paginaDelTitulo(titulo: string | null | undefined): string | null {
  return titulo?.replace(PREFIJO_DEL_TITULO, '').trim() || null;
}

/**
 * La ruta de navegación de una URL del backoffice. `titulo` es el de la ruta activa (`WebStore Admin | Nuevo producto`).
 * El Dashboard solo es la raíz exacta; las demás entradas, su ruta y lo que cuelga de ella (`/productos/nuevo`), sin los
 * parámetros ni el fragmento.
 */
export function rutaDeNavegacion(
  url: string,
  menu: readonly GrupoDelMenu[],
  titulo: string | null | undefined,
): RutaDeNavegacion {
  const camino = url.split(/[?#]/, 1)[0] ?? '';
  const pagina = paginaDelTitulo(titulo);
  for (const grupo of menu) {
    for (const item of grupo.items) {
      const esLaEntrada = camino === item.path || (item.path === '/' && camino === '');
      const cuelgaDeElla = item.path !== '/' && camino.startsWith(`${item.path}/`);
      if (!esLaEntrada && !cuelgaDeElla) continue;
      const icono = iconoDelModulo(item.path);
      const delGrupo: TramoDeLaRuta = { etiqueta: grupo.label, enlace: null, actual: false };
      if (esLaEntrada || !pagina)
        return { icono, tramos: [delGrupo, { etiqueta: item.label, enlace: null, actual: true }] };
      return {
        icono,
        tramos: [
          delGrupo,
          { etiqueta: item.label, enlace: item.path, actual: false },
          { etiqueta: pagina, enlace: null, actual: true },
        ],
      };
    }
  }
  return {
    icono: pagina ? iconoDelModulo(camino) : null,
    tramos: pagina ? [{ etiqueta: pagina, enlace: null, actual: true }] : [],
  };
}
