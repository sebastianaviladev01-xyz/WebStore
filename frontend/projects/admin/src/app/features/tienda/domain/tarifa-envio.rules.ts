import { TarifaEnvio } from './tienda.model';

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const sameText = (a: string, b: string) =>
  a.trim().toLocaleLowerCase('es-PE') === b.trim().toLocaleLowerCase('es-PE');

/**
 * Fija un mismo precio desde un origen a varios distritos: actualiza las tarifas existentes
 * y crea las que faltan. Así se cargan zonas completas sin repetir el formulario por distrito.
 */
export function asignarPrecioTarifa(
  rates: readonly TarifaEnvio[],
  origin: string,
  destinations: readonly string[],
  price: number,
  newId: () => string,
): TarifaEnvio[] {
  const next = rates.map((rate) =>
    sameText(rate.origin, origin) &&
    destinations.some((destination) => sameText(rate.destination, destination))
      ? { ...rate, price: roundMoney(price) }
      : rate,
  );
  for (const destination of destinations) {
    const exists = next.some(
      (rate) => sameText(rate.origin, origin) && sameText(rate.destination, destination),
    );
    if (!exists) next.push({ id: newId(), origin: origin.trim(), destination, price: roundMoney(price) });
  }
  return next;
}

/** Texto comparable sin mayúsculas ni tildes: "Jesús María" encuentra "jesus maria". */
const searchable = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-PE').trim();

/**
 * Tarifas de un origen (o de todos) que contienen el texto buscado en el origen o el distrito, ordenadas por
 * origen y distrito (con los números en orden natural: "Comas 2" antes que "Comas 10"). Pensado para la tabla completa de unos 1.600 valores.
 */
export function filtrarTarifas(rates: readonly TarifaEnvio[], origin: string, query: string): TarifaEnvio[] {
  const term = searchable(query);
  return rates
    .filter((rate) => !origin || rate.origin === origin)
    .filter(
      (rate) =>
        !term || searchable(rate.destination).includes(term) || searchable(rate.origin).includes(term),
    )
    .sort(
      (a, b) =>
        a.origin.localeCompare(b.origin, 'es', { numeric: true }) ||
        a.destination.localeCompare(b.destination, 'es', { numeric: true }),
    );
}

/**
 * Lo escrito en Tarifas de envío cuando vence la sesión (lote 07b, PBI-0157): la tarifa y el modo. Desde el lote 21
 * (ADR-0025) los distritos se eligen de una lista (PBI-0216): varios al crear (`destinations`) y uno al editar
 * (`destination`); y ya no hay ajuste porcentual (PBI-0217).
 */
export interface BorradorTarifas {
  /** La tarifa tal como estaba al pulsar «Editar» (modo «un distrito»); `null` en el modo «uno o varios distritos». */
  readonly editando: TarifaEnvio | null;
  readonly tarifa: {
    readonly origin: string;
    readonly destinations: readonly string[];
    readonly destination: string;
    readonly price: number;
  };
}

const sinTexto = (tarifa: BorradorTarifas['tarifa']) =>
  !tarifa.origin.trim() && !tarifa.destinations.length && !tarifa.destination.trim() && tarifa.price === 0;

/**
 * Lo que se puede restaurar sobre las tarifas vigentes: la edición de una tarifa solo si sigue existiendo (si otra
 * persona la eliminó, restaurarla la volvería a crear: PBI-0122); el modo «uno o varios distritos», tal como estaba.
 * `null` si no queda nada que restaurar.
 */
export function borradorDeTarifasVigente(
  borrador: BorradorTarifas,
  vigentes: readonly TarifaEnvio[],
): BorradorTarifas | null {
  const editada = borrador.editando;
  if (editada && !vigentes.some((tarifa) => tarifa.id === editada.id)) return null;
  return !editada && sinTexto(borrador.tarifa) ? null : borrador;
}
