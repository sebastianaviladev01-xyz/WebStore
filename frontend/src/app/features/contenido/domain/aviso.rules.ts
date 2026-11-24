import type { AvisoTienda } from './contenido.model';

/**
 * Avisos de la barra superior (lote 15, ADR-0021; PBI-0175, provisional): la «Navegación superior» de Contenido pasa
 * a ser una lista de avisos generales para los clientes (mantenimiento, próximas ofertas…), cada uno con su texto y un
 * enlace opcional. Sustituye la deducción del destino a partir de las palabras (PBI-0118 y PBI-0153).
 */

/** Cada cuánto pasa al siguiente aviso, si hay varios: más de 5 s y con pausa (WCAG 2.2.2). */
export const INTERVALO_DE_AVISOS_MS = 6000;

/** Enlace de un aviso: una ruta de la tienda (por el router) o una dirección `https://` (en otra pestaña). */
export type EnlaceDeAviso =
  { readonly tipo: 'ruta'; readonly url: string } | { readonly tipo: 'externo'; readonly url: string };

export interface AvisoVisible {
  readonly texto: string;
  readonly enlace: EnlaceDeAviso | null;
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');

function enlaceDe(url: string): EnlaceDeAviso | null {
  if (/^\/(?!\/)[^\s\\]*$/.test(url)) return { tipo: 'ruta', url };
  if (/^https:\/\/[^\s/]+\S*$/i.test(url)) return { tipo: 'externo', url };
  return null;
}

/** Los avisos con texto, en su orden; un enlace que no es de la tienda ni `https://` se ignora. */
export function avisosVisibles(avisos: readonly AvisoTienda[] | unknown): readonly AvisoVisible[] {
  if (!Array.isArray(avisos)) return [];
  return avisos
    .filter(esObjeto)
    .map((aviso) => ({ texto: texto(aviso['text']), enlace: enlaceDe(texto(aviso['url'])) }))
    .filter((aviso) => aviso.texto);
}

/** Posición del aviso siguiente, dando la vuelta; también si la lista se acortó. */
export function avisoSiguiente(indice: number, total: number): number {
  return total > 0 ? (indice + 1) % total : 0;
}

/** Posición del aviso anterior, dando la vuelta. */
export function avisoAnterior(indice: number, total: number): number {
  return total > 0 ? (Math.min(indice, total) - 1 + total) % total : 0;
}
