import { DomainError } from '../comun/domain-error.mjs';

export function bestShippingRate(rates, destination, origin) {
  const candidates = rates.filter(
    (rate) => rate.destination === destination && (!origin || rate.origin === origin),
  );
  // El precio de la tabla refleja la distancia, así que la tarifa más baja corresponde a la tienda más próxima.
  return candidates.reduce((best, rate) => (!best || rate.price < best.price ? rate : best), null);
}

/** Tarifa más baja del distrito, o `SHIPPING_UNAVAILABLE` si la tienda no llega ahí (checkout y cambio de dirección). */
export function requireShippingRate(rates, destination, origin) {
  const rate = bestShippingRate(rates, destination, origin);
  if (!rate)
    throw new DomainError(
      'validation',
      'SHIPPING_UNAVAILABLE',
      'Todavía no contamos con una tarifa para ese destino.',
    );
  return rate;
}
