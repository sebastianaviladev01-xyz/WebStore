import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Pedido } from '../domain/pedido.model';
import { BFF_BASE_URL } from '../../../core/bff.config';
import { CambioPedido, CredencialesPedido, PedidoGateway } from '../domain/pedido.gateway';
import { bffHeaders, callBff } from '../../../core/bff-http';

const FALLBACK = 'No pudimos completar la solicitud. Inténtalo nuevamente.';

@Injectable()
export class BffPedidoGateway implements PedidoGateway {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BFF_BASE_URL);

  listMine(sessionToken: string): Promise<readonly Pedido[]> {
    return callBff(
      () =>
        firstValueFrom(
          this.http.get<readonly Pedido[]>(`${this.base}/orders`, { headers: bffHeaders(sessionToken) }),
        ),
      FALLBACK,
    );
  }

  get(id: string, credentials: CredencialesPedido): Promise<Pedido> {
    return callBff(
      () => firstValueFrom(this.http.get<Pedido>(this.url(id), { headers: this.headers(credentials) })),
      FALLBACK,
    );
  }

  change(id: string, change: CambioPedido, credentials: CredencialesPedido): Promise<Pedido> {
    return callBff(
      () =>
        firstValueFrom(
          this.http.patch<Pedido>(`${this.url(id)}/${change.action}`, change.payload, {
            headers: this.headers(credentials),
          }),
        ),
      FALLBACK,
    );
  }

  primeraFechaDeEntrega(): Promise<string> {
    return callBff(
      async () =>
        (await firstValueFrom(this.http.get<{ minimum: string }>(`${this.base}/checkout/delivery-dates`)))
          .minimum,
      FALLBACK,
    );
  }

  private url(id: string): string {
    return `${this.base}/orders/${encodeURIComponent(id)}`;
  }

  private headers(credentials: CredencialesPedido) {
    return bffHeaders(credentials.sessionToken, credentials.accessToken);
  }
}
