import { inject, Injectable, signal } from '@angular/core';

import { CheckoutCommand, ComprobantePedido } from '../../pedidos/domain/pedido.model';
import { BffRequestError, messageOf } from '../../../core/bff-request.error';
import { CheckoutGateway } from '../domain/checkout.gateway';
import { CuentaFacade } from '../../cuenta/application/cuenta.facade';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import { CarritoFacade } from '../../carrito/application/carrito.facade';
import { PedidosFacade } from '../../pedidos/application/pedidos.facade';

/** Fallos que significan que el catálogo o el envío que ve el comprador ya no son los vigentes (PBI-0064, 0106). */
const DATOS_DESACTUALIZADOS = new Set([
  'INSUFFICIENT_STOCK',
  'PRODUCT_UNAVAILABLE',
  'ORDER_TOTAL_CHANGED',
  'SHIPPING_UNAVAILABLE',
]);

/** Clave aleatoria del intento de compra (32 caracteres hexadecimales); sirve también fuera de HTTPS. */
function nuevaClaveDeIntento(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

@Injectable({ providedIn: 'root' })
export class CheckoutFacade {
  private readonly gateway = inject(CheckoutGateway);
  private readonly auth = inject(CuentaFacade);
  private readonly orders = inject(PedidosFacade);
  private readonly catalog = inject(CatalogoFacade);
  private readonly cart = inject(CarritoFacade);
  private readonly submittingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly outdatedState = signal(false);
  /** Un intento de compra: se renueva al entrar al checkout y tras comprar (PBI-0086). */
  private attemptKey = nuevaClaveDeIntento();

  readonly submitting = this.submittingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  /** El último envío falló porque cambiaron el precio, el stock o el envío: hay que revisar antes de reintentar. */
  readonly datosCambiaron = this.outdatedState.asReadonly();

  /**
   * Al entrar al checkout: sin el error de un intento anterior (PBI-0064), con un intento nuevo y con el catálogo
   * recargado, para que el comprador vea el precio y el stock vigentes antes de pagar (PBI-0106).
   */
  iniciar(): void {
    this.errorState.set(null);
    this.outdatedState.set(false);
    this.attemptKey = nuevaClaveDeIntento();
    this.cart.descartarCambios();
    void this.catalog.load();
  }

  async submit(command: CheckoutCommand): Promise<ComprobantePedido | null> {
    // Un segundo clic mientras se envía no manda otro pedido (PBI-0086).
    if (this.submittingState()) return null;
    this.submittingState.set(true);
    this.errorState.set(null);
    this.outdatedState.set(false);

    try {
      const placed = await this.gateway.placeOrder(command, this.auth.sessionToken(), this.attemptKey);
      this.orders.remember(placed);
      this.attemptKey = nuevaClaveDeIntento();
      // El stock bajó con la compra: se recarga el catálogo para mostrarlo actualizado.
      await this.catalog.load();
      return placed;
    } catch (error) {
      this.errorState.set(
        messageOf(error, 'No pudimos procesar el pedido. Revisa tus datos e inténtalo nuevamente.'),
      );
      if (error instanceof BffRequestError && DATOS_DESACTUALIZADOS.has(error.code ?? '')) {
        // El carrito se concilia con el catálogo vigente y avisa lo que cambió.
        await this.catalog.load();
        this.outdatedState.set(true);
      }
      return null;
    } finally {
      this.submittingState.set(false);
    }
  }
}
