import { inject, Injectable, signal } from '@angular/core';
import { CotizacionEnvio, TarifaEnvio } from '../domain/envio.model';
import { EnvioGateway } from '../domain/envio.gateway';

@Injectable({ providedIn: 'root' })
export class EnviosFacade {
  private readonly gateway = inject(EnvioGateway);
  private readonly ratesState = signal<readonly TarifaEnvio[]>([]);
  readonly rates = this.ratesState.asReadonly();

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.ratesState.set(await this.gateway.getRates());
  }
  async quote(destination: string): Promise<CotizacionEnvio | null> {
    return this.gateway.quote(destination);
  }
}
