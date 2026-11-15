/**
 * Latido de la tienda para «Personas en línea» del Admin (lote 07b, ADR-0017, PBI-0027; provisional, por confirmar con
 * Daniel). La tienda solo envía un identificador aleatorio de su pestaña: ni cookie, ni cuenta, ni otro dato. El BFF
 * cuenta las pestañas con un latido en los últimos 5 minutos.
 */

/** Cada cuánto se repite el latido mientras la pestaña está visible: menos de la mitad de la ventana del BFF. */
export const INTERVALO_DE_LATIDO_MS = 60_000;

const ID_DE_VISITA = /^[A-Za-z0-9_-]{16,128}$/;

/** El formato que acepta el BFF (`exigirIdDeVisita`): de 16 a 128 caracteres seguros. */
export function idDeVisitaValido(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && ID_DE_VISITA.test(valor);
}

/** Identificador nuevo de la pestaña, aleatorio (sin guiones: 32 caracteres hexadecimales). */
export function nuevoIdDeVisita(): string {
  return crypto.randomUUID().replaceAll('-', '');
}
