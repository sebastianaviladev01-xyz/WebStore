import type { PaginasHabilitadas } from './contenido.model';

/**
 * Navegación de la cabecera de la tienda (PBI-0118, lote 05): el orden de las categorías sigue la «Navegación lateral»
 * del CMS. Desde el lote 15 (PBI-0175) la «Navegación superior» es una lista de avisos (`aviso.rules.ts`) y la tienda
 * ya no deduce rutas de las palabras.
 */
export interface EnlaceNavegacion {
  readonly label: string;
  readonly route: string;
  /** Ícono opcional delante del texto (por ahora, el camión de Envíos). */
  readonly icon?: 'truck';
}

/** Sin tildes, sin espacios en los extremos y en minúsculas. */
export function normalizarEtiqueta(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-PE');
}

/**
 * Enlaces fijos junto a las categorías (lote 15, PBI-0175): Envíos, si su página está activa. Hasta el lote 15 salía
 * de la «Navegación superior» de Contenido, que ahora es una lista de avisos.
 */
export function enlacesDeLaCabecera(paginas: PaginasHabilitadas): readonly EnlaceNavegacion[] {
  return paginas.shippingPageEnabled ? [{ label: 'Envíos', route: '/info/envios', icon: 'truck' }] : [];
}

/**
 * Ordena las categorías como la «Navegación lateral» del CMS; las que no figuran van después, por su orden y su
 * nombre.
 */
export function ordenarPorNavegacion<T extends { readonly name: string; readonly order?: number }>(
  categorias: readonly T[],
  navegacion: readonly string[],
): readonly T[] {
  const preferidas = navegacion.map(normalizarEtiqueta);
  return [...categorias].sort((a, b) => {
    const ai = preferidas.indexOf(normalizarEtiqueta(a.name));
    const bi = preferidas.indexOf(normalizarEtiqueta(b.name));
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return (
      (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
      a.name.localeCompare(b.name, 'es')
    );
  });
}
