import type { FechaLima } from './resumen.model';

const FORMATO_FECHA_LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha civil de Lima de un instante, sin depender de la zona del navegador o del CI. */
export function fechaEnLima(instante: string | Date): FechaLima {
  const partes = FORMATO_FECHA_LIMA.formatToParts(new Date(instante));
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((p) => p.type === tipo)?.value);
  return { anio: valor('year'), mes: valor('month'), dia: valor('day') };
}
