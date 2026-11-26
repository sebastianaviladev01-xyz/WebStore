// Cada import cabe en una línea: periodo.rules.spec.mjs y resumen.rules.spec.mjs borran las líneas que empiezan por
// «import» antes de transpilar.
import type { FechaLima, TramoDeTiempo, TramoMes } from './resumen.model';

/** Zona horaria de la tienda: las fechas del Dashboard son las de Lima (PBI-0080: una sola vez en el Admin). */
export const ZONA_IANA_LIMA = 'America/Lima';

const FORMATO_FECHA_LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_IANA_LIMA,
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
export function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/**
 * Tramos que se comparan con «Mes actual»: del día 1 a hoy en el mes en curso y los mismos días del mes anterior,
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

/** Periodos del filtro principal del Dashboard (lote 45, ADR-0033, PBI-0270), con su valor en la URL (`?periodo=`). */
export type Periodo = 'hoy' | '7-dias' | '30-dias' | 'mes' | 'trimestre' | 'anio';

/** Una opción de la lista «Periodo»: su nombre, contra qué se compara y qué se lee cuando el tramo anterior es 0. */
export interface OpcionDePeriodo {
  readonly valor: Periodo;
  readonly etiqueta: string;
  readonly comparacion: string;
  readonly sinDatos: string;
}

/** Los seis periodos del panel del SGC, en el orden de la lista. */
export const PERIODOS: readonly OpcionDePeriodo[] = [
  {
    valor: 'hoy',
    etiqueta: 'Hoy',
    comparacion: 'frente a ayer a la misma hora',
    sinDatos: 'Sin datos de ayer',
  },
  {
    valor: '7-dias',
    etiqueta: 'Últimos 7 días',
    comparacion: 'frente a los 7 días anteriores',
    sinDatos: 'Sin datos de los 7 días anteriores',
  },
  {
    valor: '30-dias',
    etiqueta: 'Últimos 30 días',
    comparacion: 'frente a los 30 días anteriores',
    sinDatos: 'Sin datos de los 30 días anteriores',
  },
  {
    valor: 'mes',
    etiqueta: 'Mes actual',
    comparacion: 'frente al mismo tramo del mes anterior',
    sinDatos: 'Sin datos del mes anterior',
  },
  {
    valor: 'trimestre',
    etiqueta: 'Trimestre actual',
    comparacion: 'frente al mismo tramo del trimestre anterior',
    sinDatos: 'Sin datos del trimestre anterior',
  },
  {
    valor: 'anio',
    etiqueta: 'Año actual',
    comparacion: 'frente al mismo tramo del año anterior',
    sinDatos: 'Sin datos del año anterior',
  },
];

/** Sin periodo en la URL, el Dashboard muestra el mes en curso, como antes del filtro. */
export const PERIODO_POR_OMISION: Periodo = 'mes';

/** El periodo de la URL; sin él, o con un valor que no es de la lista, «Mes actual». */
export function leerPeriodo(valor: string | null | undefined): Periodo {
  return PERIODOS.find((opcion) => opcion.valor === valor)?.valor ?? PERIODO_POR_OMISION;
}

/** La opción de un periodo, con sus textos. */
export function opcionDelPeriodo(periodo: Periodo): OpcionDePeriodo {
  return PERIODOS.find((opcion) => opcion.valor === periodo) ?? opcionDelPeriodo(PERIODO_POR_OMISION);
}

const UN_DIA = 24 * 60 * 60 * 1000;
/** Lima está en UTC−5 todo el año (no tiene horario de verano desde 1994): su medianoche son las 05:00 en UTC. */
const DESFASE_DE_LIMA = 5 * 60 * 60 * 1000;

/**
 * Medianoche de Lima de un día. `dia` y `mes` pueden salirse del mes o del año (el día 0 es el último del mes
 * anterior; el mes 0, diciembre del año anterior), así se cuentan días hacia atrás sin calcular los cambios de mes.
 */
function medianoche(anio: number, mes: number, dia: number): number {
  return Date.UTC(anio, mes - 1, dia) + DESFASE_DE_LIMA;
}

/** El mes que está `meses` antes (o después, si es negativo) de otro, con su año. */
function mesDesplazado(anio: number, mes: number, meses: number): { anio: number; mes: number } {
  const indice = anio * 12 + (mes - 1) - meses;
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

/**
 * Del primer día de un mes al día `dia` (incluido) de otro, recortado a su último día: el «mismo tramo» del mes, del
 * trimestre o del año anterior.
 */
function delPrimeroAlDia(
  inicio: { anio: number; mes: number },
  fin: { anio: number; mes: number },
  dia: number,
): TramoDeTiempo {
  const ultimo = Math.min(dia, diasDelMes(fin.anio, fin.mes));
  return { desde: medianoche(inicio.anio, inicio.mes, 1), hasta: medianoche(fin.anio, fin.mes, ultimo + 1) };
}

/**
 * Tramo actual del periodo y el equivalente anterior, como instantes (`desde` incluido y `hasta` excluido), con los
 * límites de los días en hora de Lima. El actual llega hasta el final de hoy; el anterior:
 * - «Hoy»: ayer, desde su medianoche hasta la misma hora de `ahora` incluida.
 * - «Últimos 7 días» y «Últimos 30 días» (hoy y los 6 o 29 días anteriores): los 7 o 30 días de antes.
 * - «Mes actual», «Trimestre actual» y «Año actual» (desde su primer día hasta hoy): el mismo tramo del mes, del
 *   trimestre o del año anterior, hasta el mismo día del mismo mes del periodo, recortado si ese mes es más corto
 *   (el 31 de mayo corresponde al 28 de febrero). «Mes actual» da los mismos días que `tramosDeComparacion`.
 */
export function tramosDelPeriodo(
  periodo: Periodo,
  ahora: Date,
): { actual: TramoDeTiempo; anterior: TramoDeTiempo } {
  const { anio, mes, dia } = fechaEnLima(ahora);
  const finDeHoy = medianoche(anio, mes, dia + 1);
  const desdeHace = (dias: number) => medianoche(anio, mes, dia - dias + 1);
  const hoy = { anio, mes };
  switch (periodo) {
    case 'hoy':
      return {
        actual: { desde: desdeHace(1), hasta: finDeHoy },
        anterior: { desde: desdeHace(2), hasta: ahora.getTime() - UN_DIA + 1 },
      };
    case '7-dias':
    case '30-dias': {
      const dias = periodo === '7-dias' ? 7 : 30;
      return {
        actual: { desde: desdeHace(dias), hasta: finDeHoy },
        anterior: { desde: desdeHace(2 * dias), hasta: desdeHace(dias) },
      };
    }
    case 'trimestre': {
      const mesDelTrimestre = (mes - 1) % 3;
      const inicio = mesDesplazado(anio, mes, mesDelTrimestre);
      return {
        actual: { desde: medianoche(inicio.anio, inicio.mes, 1), hasta: finDeHoy },
        anterior: delPrimeroAlDia(
          mesDesplazado(inicio.anio, inicio.mes, 3),
          mesDesplazado(anio, mes, 3),
          dia,
        ),
      };
    }
    case 'anio':
      return {
        actual: { desde: medianoche(anio, 1, 1), hasta: finDeHoy },
        anterior: delPrimeroAlDia({ anio: anio - 1, mes: 1 }, { anio: anio - 1, mes }, dia),
      };
    case 'mes':
    default: {
      const anterior = mesDesplazado(anio, mes, 1);
      return {
        actual: { desde: medianoche(hoy.anio, hoy.mes, 1), hasta: finDeHoy },
        anterior: delPrimeroAlDia(anterior, anterior, dia),
      };
    }
  }
}

/** Si un instante (ISO o `Date`) cae en un tramo: desde su inicio incluido hasta su fin excluido. */
export function estaEnTramo(instante: string | Date, tramo: TramoDeTiempo): boolean {
  const momento = new Date(instante).getTime();
  return momento >= tramo.desde && momento < tramo.hasta;
}

const FORMATO_ENCABEZADO = new Intl.DateTimeFormat('es-PE', {
  timeZone: ZONA_IANA_LIMA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Fecha del encabezado del Dashboard, en hora de Lima: «jueves» y «26 noviembre, 2026», como el panel del SGC. */
export function fechaDelEncabezado(ahora: Date): { diaDeLaSemana: string; fecha: string; iso: string } {
  const partes = FORMATO_ENCABEZADO.formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? '';
  const { anio, mes, dia } = fechaEnLima(ahora);
  const dosCifras = (numero: number) => String(numero).padStart(2, '0');
  return {
    diaDeLaSemana: valor('weekday'),
    fecha: `${valor('day')} ${valor('month')}, ${valor('year')}`,
    iso: `${anio}-${dosCifras(mes)}-${dosCifras(dia)}`,
  };
}
