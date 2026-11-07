import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CotizacionEnvio, TarifaEnvio } from '../domain/envio.model';
import { BFF_BASE_URL } from '../../../core/bff.config';
import { EnvioGateway } from '../domain/envio.gateway';
@Injectable({ providedIn: 'root' })
export class BffEnvioGateway implements EnvioGateway {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BFF_BASE_URL);
  getRates(): Promise<readonly TarifaEnvio[]> {
    return firstValueFrom(this.http.get<readonly TarifaEnvio[]>(`${this.base}/shipping/rates`));
  }
  async quote(destination: string): Promise<CotizacionEnvio | null> {
    const params = new HttpParams().set('destination', destination);
    const result = await firstValueFrom(
      this.http.get<{ price: number | null; origin: string | null }>(`${this.base}/shipping/quote`, {
        params,
      }),
    );
    return result.price === null || result.origin === null
      ? null
      : { price: result.price, origin: result.origin };
  }
}
