import { inject, Injectable, signal } from '@angular/core';

import { CheckoutCommand, ComprobantePedido } from '../../pedidos/domain/pedido.model';
import { messageOf } from '../../../core/bff-request.error';
import { CheckoutGateway } from '../domain/checkout.gateway';
import { CuentaFacade } from '../../cuenta/application/cuenta.facade';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import { PedidosFacade } from '../../pedidos/application/pedidos.facade';

@Injectable({ providedIn: 'root' })
export class CheckoutFacade {
  private readonly gateway = inject(CheckoutGateway);
  private readonly auth = inject(CuentaFacade);
  private readonly orders = inject(PedidosFacade);
  private readonly catalog = inject(CatalogoFacade);
  private readonly submittingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly submitting = this.submittingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async submit(command: CheckoutCommand): Promise<ComprobantePedido | null> {
    this.submittingState.set(true);
    this.errorState.set(null);

    try {
      const placed = await this.gateway.placeOrder(command, this.auth.sessionToken());
      this.orders.remember(placed);
      // El stock bajó con la compra: se recarga el catálogo para mostrarlo actualizado.
      await this.catalog.load();
      return placed;
    } catch (error) {
      this.errorState.set(
        messageOf(error, 'No pudimos procesar el pedido. Revisa tus datos e inténtalo nuevamente.'),
      );
      return null;
    } finally {
      this.submittingState.set(false);
    }
  }
}
