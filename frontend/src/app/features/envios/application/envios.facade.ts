import { inject, Injectable, signal } from '@angular/core';
import { CotizacionEnvio, TarifaEnvio } from '../domain/envio.model';
import { EnvioGateway } from '../domain/envio.gateway';

@Injectable({ providedIn: 'root' })
export class EnviosFacade {
  private readonly gateway = inject(EnvioGateway);
  private readonly ratesState = signal<readonly TarifaEnvio[]>([]);
  private readonly errorState = signal<string | null>(null);
  readonly rates = this.ratesState.asReadonly();
  /** Las tarifas no se pudieron cargar: sin ellas no hay distritos que elegir (PBI-0110). */
  readonly error = this.errorState.asReadonly();

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.errorState.set(null);
    try {
      this.ratesState.set(await this.gateway.getRates());
    } catch {
      this.errorState.set(
        'No pudimos cargar los distritos de entrega. Revisa tu conexión e inténtalo nuevamente.',
      );
    }
  }
  async quote(destination: string): Promise<CotizacionEnvio | null> {
    return this.gateway.quote(destination);
  }
}
