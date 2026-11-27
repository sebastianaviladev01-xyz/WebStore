/**
 * Exportación de un listado del backoffice (lote 43, ADR-0033, PBI-0265): «Exportar» → «CSV (Excel)» e «Imprimir o
 * PDF» llevan las filas que cumplen los filtros, de todas las páginas, con las columnas de la tabla. Sin Angular.
 */

/** Valor de una celda exportada: los números van tal cual; `null` o `undefined`, vacío. */
export type CeldaExportada = string | number | null | undefined;

/** Lo que exporta un listado: su título, las columnas de su tabla y las filas filtradas de todas las páginas. */
export interface TablaExportable {
  /** Título del listado («Productos»): nombre del archivo y encabezado de la vista para imprimir. */
  readonly titulo: string;
  readonly columnas: readonly string[];
  readonly filas: readonly (readonly CeldaExportada[])[];
}

/** Marca de orden de bytes de UTF-8: sin ella, Excel abre el CSV en otra codificación y rompe las tildes. */
const BOM = '﻿';
/** Caracteres con los que Excel lee un texto como fórmula (inyección de fórmulas en CSV). */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;
/** Lo que obliga a poner un campo entre comillas: el separador, comillas, saltos de línea o espacios en los extremos. */
const NECESITA_COMILLAS = /[",\r\n]|^\s|\s$/;

function campoCsv(valor: CeldaExportada): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'number') return String(valor);
  const texto = INICIO_DE_FORMULA.test(valor) ? `'${valor}` : valor;
  return NECESITA_COMILLAS.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

/**
 * CSV que Excel abre bien con tildes: BOM UTF-8, coma como separador, filas separadas por CRLF y los campos entre
 * comillas cuando hace falta. Un texto que Excel leería como fórmula (`=`, `+`, `-`, `@`) empieza con un apóstrofo.
 */
export function generarCsv(tabla: Pick<TablaExportable, 'columnas' | 'filas'>): string {
  const lineas = [tabla.columnas, ...tabla.filas].map((fila) => fila.map(campoCsv).join(','));
  return `${BOM}${lineas.map((linea) => `${linea}\r\n`).join('')}`;
}

/** Nombre del archivo CSV: el título del listado sin tildes ni espacios y la fecha («tarifas-de-envio-2026-11-26.csv»). */
export function nombreDeArchivoCsv(titulo: string, fechaIso: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${fechaIso}.csv`;
}
