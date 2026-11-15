/**
 * Cookie de la vista previa de la tuerca (modo demo, ADR-0012). La tienda y el Admin no pueden importarse entre
 * sí, así que cada uno tiene esta copia: `tests/architecture/paridad-entre-aplicaciones.test.mjs` comprueba que
 * las dos son iguales (PBI-0080). Se escribe sin `Domain`: la tienda y el Admin solo la comparten en el mismo
 * host, como `localhost` (PBI-0072).
 */

/** Cookie con el id del tema en vista previa (modo demo). */
export const COOKIE_VISTA_PREVIA = 'ws_tema_vista_previa';

const VIGENCIA_VISTA_PREVIA_SEGUNDOS = 2592000;

/** Id del tema en vista previa, o null si no hay cookie o su valor no se puede decodificar. */
export function leerVistaPrevia(documento: Document): string | null {
  const prefijo = `${COOKIE_VISTA_PREVIA}=`;
  const entrada = documento.cookie
    .split(';')
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(prefijo));
  if (entrada === undefined) return null;
  try {
    return decodeURIComponent(entrada.slice(prefijo.length));
  } catch {
    return null;
  }
}

/** Recuerda el tema en vista previa durante 30 días. */
export function escribirVistaPrevia(documento: Document, id: string): void {
  documento.cookie = atributos(documento, encodeURIComponent(id), VIGENCIA_VISTA_PREVIA_SEGUNDOS);
}

/** Olvida la vista previa: se vuelve al tema activo. */
export function borrarVistaPrevia(documento: Document): void {
  documento.cookie = atributos(documento, '', 0);
}

function atributos(documento: Document, valor: string, maxAge: number): string {
  const seguro = documento.location.protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_VISTA_PREVIA}=${valor}; Path=/; SameSite=Lax; Max-Age=${maxAge}${seguro}`;
}
