import { bestShippingRate } from '../../domain/envios/tarifa-envio.rules.mjs';

/** Tabla de tarifas compartida y cotización del envío según destino (y origen opcional). */
export function createEnviosQueries({ store }) {
  return {
    listRates: () => store.state.rates,
    quote(destination, origin) {
      const rate = bestShippingRate(store.state.rates, destination, origin);
      return { price: rate?.price ?? null, origin: rate?.origin ?? null };
    },
  };
}
