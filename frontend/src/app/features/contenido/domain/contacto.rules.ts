import type { DatoDeContacto, RedSocial } from './contenido.model';

/**
 * Datos de contacto de la tienda (lote 15, ADR-0021; PBI-0169): varios correos, teléfonos y redes. El primero de cada
 * lista es el principal donde la tienda solo muestra uno. El BFF valida al guardar; la tienda solo descarta lo vacío
 * o lo que no podría enlazar, por si llega un contenido de antes o incompleto.
 */

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');

/** El `href` de un teléfono: `tel:` con el `+` inicial, si lo tiene, y solo los dígitos. */
export function enlaceDeTelefono(telefono: string): string {
  const limpio = telefono.trim();
  return `tel:${limpio.startsWith('+') ? '+' : ''}${limpio.replace(/\D/g, '')}`;
}

/** Correos o teléfonos con valor, en su orden y recortados. */
export function contactosVisibles(lista: unknown): readonly DatoDeContacto[] {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter(esObjeto)
    .map((item) => ({ value: texto(item['value']), label: texto(item['label']) }))
    .filter((item) => item.value);
}

/** Redes con nombre y una dirección `https://`: la tienda las abre en otra pestaña. */
export function redesVisibles(lista: unknown): readonly RedSocial[] {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter(esObjeto)
    .map((item) => ({ label: texto(item['label']), url: texto(item['url']) }))
    .filter((item) => item.label && /^https:\/\/[^\s/]+/i.test(item.url));
}
