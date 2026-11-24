import { esDiaHabil, fechasNoLaborables, sumarDias } from '../calendario/dias-no-laborables.rules.mjs';
import { limaDate } from '../comun/reloj.mjs';

/**
 * Primera fecha de entrega que puede elegir el comprador (lote 17, ADR-0021, PBI-0178; provisional, por confirmar con
 * Daniel). Daniel pidió que la configure cada tienda («Pueden haber clientes que permitan entrega el día calendario
 * siguiente, como pueden haber clientes que tengan normalizado las entregas a partir del siguiente dia hábil») y eligió
 * «Otra regla, con hora de corte», sin dar la hora. La configuración de la tienda tiene:
 *
 * - `firstDeliveryDay`: `same-day` (hoy), `next-calendar-day` (mañana) o `next-business-day` (el siguiente día hábil:
 *   sin sábados, domingos ni días no laborables).
 * - `deliveryCutoffTime`: `''` (sin hora de corte) o `HH:MM` en hora de Lima. Desde esa hora (la exacta incluida), se
 *   suma un día del tipo elegido. Con el siguiente día hábil, la hora solo cuenta en un día hábil: un sábado, un
 *   domingo o un feriado nadie despacha, así que todo el día cuenta igual.
 *
 * Por defecto, el día calendario siguiente sin hora de corte.
 */
export const REGLAS_DE_PRIMERA_ENTREGA = Object.freeze([
  'same-day',
  'next-calendar-day',
  'next-business-day',
]);
export const ENTREGA_POR_DEFECTO = Object.freeze({
  firstDeliveryDay: 'next-calendar-day',
  deliveryCutoffTime: '',
});

export const esReglaDePrimeraEntrega = (valor) => REGLAS_DE_PRIMERA_ENTREGA.includes(valor);
export const esHoraDeCorte = (valor) =>
  valor === '' || (typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor));

const HORA_DE_LIMA = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Lima',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Hora de Lima (`HH:MM`) del instante: se compara como texto con la hora de corte. */
const horaDeLima = (instante) => HORA_DE_LIMA.format(instante);

/** El siguiente día hábil después de `fecha`. */
function siguienteDiaHabil(fecha, feriados) {
  let dia = sumarDias(fecha, 1);
  while (!esDiaHabil(dia, feriados)) dia = sumarDias(dia, 1);
  return dia;
}

/**
 * Primera fecha `AAAA-MM-DD` que se puede elegir para un pedido hecho en `instante`, según la configuración de la tienda
 * (`entrega`, con `firstDeliveryDay` y `deliveryCutoffTime`) y las fechas no laborables (`feriados`). Una regla o una
 * hora que no son válidas se leen como las de por defecto.
 */
export function primeraFechaDeEntrega(instante, entrega, feriados) {
  const regla = esReglaDePrimeraEntrega(entrega?.firstDeliveryDay)
    ? entrega.firstDeliveryDay
    : ENTREGA_POR_DEFECTO.firstDeliveryDay;
  const corte = esHoraDeCorte(entrega?.deliveryCutoffTime) ? entrega.deliveryCutoffTime : '';
  const hoy = limaDate(instante);
  const pasoElCorte = corte !== '' && horaDeLima(instante) >= corte;
  if (regla === 'same-day') return pasoElCorte ? sumarDias(hoy, 1) : hoy;
  if (regla === 'next-calendar-day') return sumarDias(hoy, pasoElCorte ? 2 : 1);
  const primera = siguienteDiaHabil(hoy, feriados);
  return pasoElCorte && esDiaHabil(hoy, feriados) ? siguienteDiaHabil(primera, feriados) : primera;
}

/** La primera fecha de entrega con la configuración y el calendario del estado de la tienda. */
export const primeraFechaDeLaTienda = (state, instante) =>
  primeraFechaDeEntrega(instante, state.config, fechasNoLaborables(state.nonWorkingDates));
