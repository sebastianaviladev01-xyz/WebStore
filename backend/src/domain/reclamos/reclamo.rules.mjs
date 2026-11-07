export const COMPLAINT_TYPES = ['reclamo', 'queja'];

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
