export const nowIso = () => new Date().toISOString();

const FECHA_DE_LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha de calendario de Lima (`AAAA-MM-DD`) del instante dado, sin depender de la zona del servidor. */
export const limaDate = (instant = new Date()) => FECHA_DE_LIMA.format(new Date(instant));
