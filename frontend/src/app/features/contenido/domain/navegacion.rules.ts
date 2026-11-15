import type { ConfiguracionTienda } from './contenido.model';

/**
 * Navegación de la cabecera de la tienda a partir del CMS (PBI-0118, lote 05). La «Navegación superior» es una lista
 * de textos: la ruta de cada uno se deduce de sus palabras, y lo que no se reconoce no se muestra.
 */
export interface EnlaceNavegacion {
  readonly label: string;
  readonly route: string;
  /** Ícono opcional delante del texto (por ahora, el camión de Envíos). */
  readonly icon?: 'truck';
}

export type PaginasHabilitadas = Pick<
  ConfiguracionTienda,
  'contactPageEnabled' | 'shippingPageEnabled' | 'privacyPageEnabled' | 'termsPageEnabled'
>;

/** Sin tildes, sin espacios en los extremos y en minúsculas. */
export function normalizarEtiqueta(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-PE');
}

function rutaDeEtiqueta(clave: string, paginas: PaginasHabilitadas): string | null {
  if (clave.includes('envio')) return paginas.shippingPageEnabled ? '/info/envios' : null;
  if (clave.includes('contacto') || clave.includes('ayuda'))
    return paginas.contactPageEnabled ? '/info/contacto' : null;
  if (clave.includes('privacidad')) return paginas.privacyPageEnabled ? '/info/privacidad' : null;
  if (clave.includes('termino')) return paginas.termsPageEnabled ? '/info/terminos' : null;
  if (clave.includes('reclamacion')) return '/libro-reclamaciones';
  if (clave.includes('cuenta')) return '/cuenta/login';
  return null;
}

/**
 * El enlace de un texto de la «Navegación superior», o `null` si la cabecera ya lo ofrece (Inicio, Productos,
 * Pedidos), si su página está desactivada o si no se reconoce.
 */
export function enlaceDeNavegacion(etiqueta: string, paginas: PaginasHabilitadas): EnlaceNavegacion | null {
  const clave = normalizarEtiqueta(etiqueta);
  const route = rutaDeEtiqueta(clave, paginas);
  if (route === null) return null;
  return clave.includes('envio') ? { label: etiqueta, route, icon: 'truck' } : { label: etiqueta, route };
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
