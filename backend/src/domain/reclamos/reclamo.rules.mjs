import { DomainError } from '../comun/domain-error.mjs';

export const COMPLAINT_TYPES = ['reclamo', 'queja'];

/** Estados de un reclamo que el Admin puede asignar (PBI-0095). */
export const COMPLAINT_STATUSES = ['received', 'in-review', 'resolved'];

/**
 * Código `REC-AAAA-NNNNN` del año dado (el de Lima): el correlativo sigue al mayor ya emitido ese año, así que
 * no se repite aunque falte un reclamo anterior (PBI-0097). Empieza en 1 cada año.
 */
export function nextComplaintCode(existingIds, year) {
  const prefix = `REC-${year}-`;
  const last = existingIds
    .filter((id) => typeof id === 'string' && id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter(Number.isInteger)
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}${String(last + 1).padStart(5, '0')}`;
}

/** Monto reclamado: sin valor, 0; si no, un número finito no negativo (PBI-0097). */
export function requireComplaintAmount(value) {
  if (value === undefined || value === null || value === '') return 0;
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(amount) || amount < 0)
    throw new DomainError('validation', 'INVALID_COMPLAINT_AMOUNT', 'Ingresa un monto válido.');
  return amount;
}

/** Plazo de respuesta del Libro de reclamaciones. */
export const COMPLAINT_DUE_BUSINESS_DAYS = 15;

/**
 * Suma días hábiles de Perú (sin sábados, domingos ni las fechas no laborables configuradas)
 * contando desde la fecha local de Lima de `startAt`.
 */
export function addPeruBusinessDays(startAt, days, nonWorkingDates) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(startAt));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  let added = 0;

  while (added < days) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    const localDate = date.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !nonWorkingDates.has(localDate)) added += 1;
  }

  // End of the due date in Lima (UTC-5), preserving its local calendar date.
  const endOfDueDate = new Date(date);
  endOfDueDate.setUTCDate(endOfDueDate.getUTCDate() + 1);
  endOfDueDate.setUTCHours(4, 59, 59, 999);
  return endOfDueDate.toISOString();
}
