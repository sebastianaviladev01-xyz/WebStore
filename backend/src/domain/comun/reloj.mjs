export const nowIso = () => new Date().toISOString();

const FECHA_DE_LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha de calendario de Lima (`AAAA-MM-DD`) del instante dado, sin depender de la zona del servidor. */
export const limaDate = (instant = new Date()) => FECHA_DE_LIMA.format(new Date(instant));

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Último milisegundo de la fecha de calendario de Lima (`AAAA-MM-DD`), como instante ISO. Se busca el cambio de
 * fecha con `limaDate` en lugar de fijar el desfase de la zona en cada regla.
 */
export function finDelDiaDeLima(fecha) {
  // A las 12:00 UTC, Lima está en la misma fecha; 24 horas después, en la siguiente.
  let dentro = Date.parse(`${fecha}T12:00:00.000Z`);
  let fuera = dentro + MS_POR_DIA;
  while (fuera - dentro > 1) {
    const medio = Math.floor((dentro + fuera) / 2);
    if (limaDate(medio) === fecha) dentro = medio;
    else fuera = medio;
  }
  return new Date(dentro).toISOString();
}
