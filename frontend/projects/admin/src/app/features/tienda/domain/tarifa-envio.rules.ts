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

export interface PaginaTarifas {
  readonly items: readonly TarifaEnvio[];
  /** Página actual, de 1 a `pages` (se ajusta si la pedida ya no existe tras filtrar). */
  readonly page: number;
  readonly pages: number;
  /** Posición del primer y último elemento mostrados (1-based); 0 y 0 si no hay resultados. */
  readonly from: number;
  readonly to: number;
  readonly total: number;
}

/** Corta la lista en páginas de `size` elementos. */
export function paginarTarifas(rates: readonly TarifaEnvio[], page: number, size: number): PaginaTarifas {
  const total = rates.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page)), pages);
  const start = (current - 1) * size;
  const items = rates.slice(start, start + size);
  return { items, page: current, pages, from: total ? start + 1 : 0, to: start + items.length, total };
}
