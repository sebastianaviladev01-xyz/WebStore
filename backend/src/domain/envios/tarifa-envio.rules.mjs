export function bestShippingRate(rates, destination, origin) {
  const candidates = rates.filter(
    (rate) => rate.destination === destination && (!origin || rate.origin === origin),
  );
  // El precio de la tabla refleja la distancia, así que la tarifa más baja corresponde a la tienda más próxima.
  return candidates.reduce((best, rate) => (!best || rate.price < best.price ? rate : best), null);
}
