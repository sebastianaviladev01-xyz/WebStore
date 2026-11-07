import { CotizacionEnvio, TarifaEnvio } from './envio.model';

export abstract class EnvioGateway {
  abstract getRates(): Promise<readonly TarifaEnvio[]>;
  abstract quote(destination: string): Promise<CotizacionEnvio | null>;
}
