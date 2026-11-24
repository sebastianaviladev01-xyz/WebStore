import type { AccesoInferior, PaginasHabilitadas } from './contenido.model';

/**
 * Pie de la tienda a partir de los «Accesos inferiores» de Contenido (lote 15, ADR-0021; PBI-0185). Cada grupo es una
 * columna, después de «Productos», en el orden en que aparece. Un acceso a una página informativa desactivada no se
 * muestra, como hacía el pie escrito en el código hasta el lote 15, y un grupo sin accesos visibles tampoco.
 */

/** Como el BFF: hasta tres grupos, además de «Productos». */
export const MAXIMO_GRUPOS_DEL_PIE = 3;

export interface EnlaceDelPie {
  readonly label: string;
  readonly url: string;
  /** Una dirección `https://`: se abre en otra pestaña. */
  readonly externo: boolean;
}

export interface GrupoDelPie {
  readonly titulo: string;
  readonly enlaces: readonly EnlaceDelPie[];
}

const PAGINAS: Readonly<Record<string, keyof PaginasHabilitadas>> = {
  '/info/contacto': 'contactPageEnabled',
  '/info/envios': 'shippingPageEnabled',
  '/info/privacidad': 'privacyPageEnabled',
  '/info/terminos': 'termsPageEnabled',
};

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');
const esRuta = (url: string) => /^\/(?!\/)[^\s\\]*$/.test(url);
const esExterno = (url: string) => /^https:\/\/[^\s/]+\S*$/i.test(url);

/** `false` si el acceso lleva a una página informativa que el Admin desactivó. */
function paginaActiva(url: string, paginas: PaginasHabilitadas): boolean {
  const pagina = PAGINAS[url.split(/[?#]/)[0]];
  return pagina ? paginas[pagina] : true;
}

/** Columnas del pie con sus enlaces visibles. */
export function gruposDelPie(
  accesos: readonly AccesoInferior[] | unknown,
  paginas: PaginasHabilitadas,
): readonly GrupoDelPie[] {
  if (!Array.isArray(accesos)) return [];
  const grupos = new Map<string, EnlaceDelPie[]>();
  for (const acceso of accesos.filter(esObjeto)) {
    const titulo = texto(acceso['group']);
    const label = texto(acceso['label']);
    const url = texto(acceso['url']);
    if (!titulo || !label || !(esRuta(url) || esExterno(url))) continue;
    if (!grupos.has(titulo) && grupos.size >= MAXIMO_GRUPOS_DEL_PIE) continue;
    const enlaces = grupos.get(titulo) ?? [];
    grupos.set(titulo, enlaces);
    if (paginaActiva(url, paginas)) enlaces.push({ label, url, externo: esExterno(url) });
  }
  return [...grupos]
    .filter(([, enlaces]) => enlaces.length > 0)
    .map(([titulo, enlaces]) => ({ titulo, enlaces }));
}
