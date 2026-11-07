import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CheckoutCommand, PedidoRegistrado } from '../../pedidos/domain/pedido.model';
import { BFF_BASE_URL } from '../../../core/bff.config';
import { CheckoutGateway } from '../domain/checkout.gateway';
import { bffHeaders, callBff } from '../../../core/bff-http';

@Injectable()
export class BffCheckoutGateway implements CheckoutGateway {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BFF_BASE_URL);

  placeOrder(command: CheckoutCommand, sessionToken: string | null): Promise<PedidoRegistrado> {
    return callBff(
      () =>
        firstValueFrom(
          this.http.post<PedidoRegistrado>(`${this.base}/checkout/orders`, command, {
            headers: bffHeaders(sessionToken),
          }),
        ),
      'No pudimos procesar el pedido. Revisa tus datos e inténtalo nuevamente.',
    );
  }
}
