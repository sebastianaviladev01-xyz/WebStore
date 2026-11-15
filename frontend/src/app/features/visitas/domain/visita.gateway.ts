/** Puerto del latido de la tienda (lote 07b, PBI-0027): `POST /bff/visits` con el identificador de la pestaña. */
export abstract class VisitaGateway {
  abstract latido(visitId: string): Promise<void>;
}
