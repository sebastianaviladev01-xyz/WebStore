import { Apariencia } from './tema.model';

/** Puerto de la apariencia pública: `GET /bff/appearance`. */
export abstract class AparienciaGateway {
  abstract apariencia(): Promise<Apariencia>;
}
