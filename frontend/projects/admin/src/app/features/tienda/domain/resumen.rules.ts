import type { FechaLima, TramoMes } from './resumen.model';

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

/** Último día de un mes (`mes` de 1 a 12), con el calendario gregoriano y sin depender de la zona horaria. */
function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Tramos que se comparan: del día 1 a hoy en el mes en curso y los mismos días del mes anterior,
 * recortados a su último día si es más corto (en enero, el anterior es diciembre del año anterior).
 */
export function tramosDeComparacion(hoy: FechaLima): { actual: TramoMes; anterior: TramoMes } {
  const anioAnterior = hoy.mes === 1 ? hoy.anio - 1 : hoy.anio;
  const mesAnterior = hoy.mes === 1 ? 12 : hoy.mes - 1;
  return {
    actual: { anio: hoy.anio, mes: hoy.mes, desde: 1, hasta: hoy.dia },
    anterior: {
      anio: anioAnterior,
      mes: mesAnterior,
      desde: 1,
      hasta: Math.min(hoy.dia, diasDelMes(anioAnterior, mesAnterior)),
    },
  };
}
