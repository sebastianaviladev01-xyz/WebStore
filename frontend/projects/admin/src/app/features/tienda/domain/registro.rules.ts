import { fechaYHoraVisible } from './banner.rules';

/**
 * Páginas de registro del backoffice con la forma de los formularios del SGC (lote 44, ADR-0033, PBI-0268; decidido por
 * Sebastián Avila el 2026-11-26, sin esperar a Daniel). Reglas sin Angular de la fila de cabecera, del contador de
 * caracteres y de la tabla de características del producto.
 */

/** La fecha y la hora de la fila de cabecera, en hora de Lima: `dd/mm/aaaa hh:mm`. No depende de la zona del navegador. */
export const fechaDeCabecera = (instante: Date): string => fechaYHoraVisible(instante.toISOString());

/** El contador bajo un campo de texto con tope: los caracteres escritos sobre el tope («27/150»). */
export const contadorDeCaracteres = (texto: string | null | undefined, maximo: number): string =>
  `${texto?.length ?? 0}/${maximo}`;

/**
 * Las filas con que empieza la tabla de características: las del producto o, si no tiene (un producto nuevo), una fila
 * vacía para escribir la primera.
 */
export function filasDeCaracteristicas(caracteristicas: readonly string[] | undefined): string[] {
  return caracteristicas?.length ? [...caracteristicas] : [''];
}

/**
 * Las características que se guardan (`highlights` del producto, el mismo contrato que antes): lo escrito en cada fila,
 * en su orden, sin espacios de sobra y sin las filas vacías.
 */
export function caracteristicasDeLasFilas(filas: readonly string[]): string[] {
  return filas.map((fila) => fila.trim()).filter(Boolean);
}

/**
 * Parámetros que se añaden a los del listado al volver de un registro (lote 44, ADR-0033, PBI-0265 y PBI-0268). Tras
 * crear un registro con «Guardar», `nuevo` lleva su id para que el listado salte a la página donde quedó (el listado lo
 * lee y lo quita de la URL). Al editar, o con «Guardar y continuar» (que abre el registro, no el listado), ninguno: los
 * filtros del listado se conservan con `queryParamsHandling: 'merge'`.
 */
export function parametrosAlVolverDelRegistro(guardado: {
  readonly creado: boolean;
  readonly continuar: boolean;
  readonly id: string;
}): Record<string, string> {
  return guardado.creado && !guardado.continuar ? { nuevo: guardado.id } : {};
}
