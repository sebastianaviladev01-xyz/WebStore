export interface TarifaEnvio {
  readonly id: string;
  readonly origin: string;
  readonly destination: string;
  readonly price: number;
}

/** Tarifa elegida para un destino: la tienda de origen más próxima según la tabla. */
export interface CotizacionEnvio {
  readonly origin: string;
  readonly price: number;
}
