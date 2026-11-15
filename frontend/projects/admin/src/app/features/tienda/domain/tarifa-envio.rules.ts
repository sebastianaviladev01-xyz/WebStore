import { TarifaEnvio } from './tienda.model';

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const sameText = (a: string, b: string) =>
  a.trim().toLocaleLowerCase('es-PE') === b.trim().toLocaleLowerCase('es-PE');

/** Lista de distritos escrita a mano (uno por línea o separados por coma), sin vacíos ni repetidos. */
export function leerDistritos(text: string): string[] {
  const unique = new Map<string, string>();
  for (const entry of text.split(/[\n,;]/)) {
    const name = entry.trim();
    const key = name.toLocaleLowerCase('es-PE');
    // Se conserva la primera forma escrita del distrito.
    if (name && !unique.has(key)) unique.set(key, name);
  }
  return [...unique.values()];
}

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

/** Ajuste porcentual (p. ej. por inflación) para todas las tarifas o solo las de un origen. */
export function ajustarPreciosTarifas(
  rates: readonly TarifaEnvio[],
  percent: number,
  origin: string | null,
): TarifaEnvio[] {
  const factor = 1 + percent / 100;
  return rates.map((rate) =>
    origin === null || sameText(rate.origin, origin)
      ? { ...rate, price: Math.max(0, roundMoney(rate.price * factor)) }
      : rate,
  );
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

/** Lo escrito en Tarifas de envío cuando vence la sesión (lote 07b, PBI-0157): sus dos formularios y el modo. */
export interface BorradorTarifas {
  /** La tarifa tal como estaba al pulsar «Editar» (modo «un distrito»); `null` en el modo «uno o varios distritos». */
  readonly editando: TarifaEnvio | null;
  readonly tarifa: { readonly origin: string; readonly destinations: string; readonly price: number };
  readonly ajuste: { readonly percent: number; readonly origin: string };
}

const TARIFA_VACIA = { origin: '', destinations: '', price: 0 };
const sinTexto = (tarifa: BorradorTarifas['tarifa']) =>
  !tarifa.origin.trim() && !tarifa.destinations.trim() && tarifa.price === 0;

/**
 * Lo que se puede restaurar sobre las tarifas vigentes: la edición de una tarifa solo si sigue existiendo (si otra
 * persona la eliminó, restaurarla la volvería a crear: PBI-0122); el modo «uno o varios distritos» y el ajuste
 * porcentual, tal como estaban. `null` si no queda nada que restaurar.
 */
export function borradorDeTarifasVigente(
  borrador: BorradorTarifas,
  vigentes: readonly TarifaEnvio[],
): BorradorTarifas | null {
  const editada = borrador.editando;
  const sigue = !editada || vigentes.some((tarifa) => tarifa.id === editada.id);
  const resultado = sigue ? borrador : { editando: null, tarifa: TARIFA_VACIA, ajuste: borrador.ajuste };
  const nada = !resultado.editando && sinTexto(resultado.tarifa) && resultado.ajuste.percent === 0;
  return nada ? null : resultado;
}
