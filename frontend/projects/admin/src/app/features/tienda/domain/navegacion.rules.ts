import { ConfiguracionTienda } from './tienda.model';

/**
 * Aviso de Contenido sobre la «Navegación superior» (lote 07, ADR-0017; PBI-0153). La tienda deduce el destino de
 * cada texto por sus palabras (`navegacion.rules.ts` de `contenido` en el Storefront, lote 05) y no muestra lo que no
 * reconoce. El Admin no importa código de la tienda: replica la deducción, y `navegacion.rules.spec.mjs` comprueba que
 * las dos dan el mismo destino. El aviso no impide guardar.
 */
export type PaginasHabilitadas = Pick<
  ConfiguracionTienda,
  'contactPageEnabled' | 'shippingPageEnabled' | 'privacyPageEnabled' | 'termsPageEnabled'
>;

const normalizar = (valor: string) =>
  valor.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase('es-PE');

/** Lo que la cabecera de la tienda ya ofrece por su cuenta (el logo, «Todas las categorías» y «Pedidos»). */
const DE_LA_CABECERA = ['inicio', 'producto', 'pedido'];

interface Destino {
  readonly ruta: string;
  readonly activa: boolean;
}

function destino(clave: string, paginas: PaginasHabilitadas): Destino | null {
  if (clave.includes('envio')) return { ruta: '/info/envios', activa: paginas.shippingPageEnabled };
  if (clave.includes('contacto') || clave.includes('ayuda'))
    return { ruta: '/info/contacto', activa: paginas.contactPageEnabled };
  if (clave.includes('privacidad')) return { ruta: '/info/privacidad', activa: paginas.privacyPageEnabled };
  if (clave.includes('termino')) return { ruta: '/info/terminos', activa: paginas.termsPageEnabled };
  if (clave.includes('reclamacion')) return { ruta: '/libro-reclamaciones', activa: true };
  if (clave.includes('cuenta')) return { ruta: '/cuenta/login', activa: true };
  return null;
}

/** Ruta de la tienda a la que lleva un texto, como la deduce la tienda; `null` si no lleva a ninguna. */
export function destinoDeTexto(texto: string, paginas: PaginasHabilitadas): string | null {
  const encontrado = destino(normalizar(texto), paginas);
  return encontrado?.activa ? encontrado.ruta : null;
}

/** Textos de la navegación (separados por comas) que la tienda no mostrará, sin contar los de su cabecera. */
export function textosSinDestino(
  navegacion: string,
  paginas: PaginasHabilitadas,
): { readonly sinPagina: readonly string[]; readonly desactivados: readonly string[] } {
  const textos = navegacion
    .split(',')
    .map((texto) => texto.trim())
    .filter(Boolean)
    .filter((texto) => !DE_LA_CABECERA.some((palabra) => normalizar(texto).includes(palabra)));
  return {
    sinPagina: textos.filter((texto) => !destino(normalizar(texto), paginas)),
    desactivados: textos.filter((texto) => destino(normalizar(texto), paginas)?.activa === false),
  };
}

const enumerar = (textos: readonly string[]) => {
  const citados = textos.map((texto) => `«${texto}»`);
  return citados.length > 1 ? `${citados.slice(0, -1).join(', ')} y ${citados.at(-1)}` : citados[0];
};

/** Aviso para el campo «Navegación superior»; `null` si todos los textos llevan a alguna parte. */
export function avisoDeNavegacion(navegacion: string, paginas: PaginasHabilitadas): string | null {
  const { sinPagina, desactivados } = textosSinDestino(navegacion, paginas);
  const partes: string[] = [];
  if (sinPagina.length)
    partes.push(
      `${enumerar(sinPagina)} ${sinPagina.length > 1 ? 'no llevan' : 'no lleva'} a ninguna página de la tienda y no ` +
        `${sinPagina.length > 1 ? 'se mostrarán' : 'se mostrará'}. La tienda enlaza los textos con Envíos, Contacto ` +
        'o Ayuda, Privacidad, Términos, Reclamaciones o Cuenta; Inicio, Productos y Pedidos ya están en su cabecera.',
    );
  if (desactivados.length)
    partes.push(
      `${enumerar(desactivados)} ${desactivados.length > 1 ? 'llevan a páginas desactivadas' : 'lleva a una página desactivada'} ` +
        `y no ${desactivados.length > 1 ? 'se mostrarán' : 'se mostrará'}. Activa la página o quita el texto.`,
    );
  return partes.length ? partes.join(' ') : null;
}
