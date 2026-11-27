/**
 * Calendario de días no laborables de la tienda (feriados). Desde el lote 17 (ADR-0021, PBI-0183; confirmado por
 * Sebastián Avila) es una lista del estado del BFF, `[{ id, date, name }]`, que edita el superadministrador desde el
 * Admin. `WEBSTORE_NON_WORKING_DATES` solo da el valor inicial cuando el estado no tiene lista. La usan el plazo de los
 * reclamos y la primera fecha de entrega.
 */

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Largo máximo del nombre de un día no laborable («Batalla de Junín»). */
export const MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE = 60;

/** `AAAA-MM-DD` que existe en el calendario (rechaza `2030-02-30`). */
export function esFechaDeCalendario(valor) {
  const partes = typeof valor === 'string' ? FECHA_ISO.exec(valor) : null;
  if (!partes) return false;
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

/** La fecha de calendario `dias` después (o antes, si es negativo) de `fecha`, sin zona horaria. */
export function sumarDias(fecha, dias) {
  const dia = new Date(`${fecha}T12:00:00.000Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}

/** Un día hábil no es sábado, domingo ni una de las fechas no laborables. */
export function esDiaHabil(fecha, fechasNoLaborables) {
  const diaDeLaSemana = new Date(`${fecha}T12:00:00.000Z`).getUTCDay();
  return diaDeLaSemana !== 0 && diaDeLaSemana !== 6 && !fechasNoLaborables.has(fecha);
}

const ordenadosPorFecha = (dias) => [...dias].sort((a, b) => a.date.localeCompare(b.date));

/** Días no laborables iniciales a partir de las fechas de `WEBSTORE_NON_WORKING_DATES`: las válidas, una vez cada una. */
export function diasNoLaborablesIniciales(fechas) {
  const validas = [...new Set(fechas)].filter(esFechaDeCalendario);
  return ordenadosPorFecha(validas.map((date) => ({ id: date, date, name: '' })));
}

/**
 * Lista guardada al cargar el estado. Sin lista (un estado anterior al lote 17), la de `iniciales`; con una, aunque esté
 * vacía, la misma, sin los elementos mal formados ni las fechas repetidas (queda la primera), ordenada por fecha.
 */
export function normalizarDiasNoLaborables(guardados, iniciales) {
  if (!Array.isArray(guardados)) return structuredClone(iniciales);
  const fechas = new Set();
  const dias = [];
  for (const dia of guardados) {
    if (dia === null || typeof dia !== 'object') continue;
    if (typeof dia.id !== 'string' || !dia.id || !esFechaDeCalendario(dia.date) || fechas.has(dia.date))
      continue;
    fechas.add(dia.date);
    dias.push({ id: dia.id, date: dia.date, name: typeof dia.name === 'string' ? dia.name.trim() : '' });
  }
  return ordenadosPorFecha(dias);
}

/** Fechas de la lista, para los plazos en días hábiles. */
export const fechasNoLaborables = (dias) => new Set((dias ?? []).map((dia) => dia.date));
