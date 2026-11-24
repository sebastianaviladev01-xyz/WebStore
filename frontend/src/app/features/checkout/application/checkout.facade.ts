import { inject, Injectable, signal } from '@angular/core';

import { CheckoutCommand, ComprobantePedido } from '../../pedidos/domain/pedido.model';
import { BffRequestError, messageOf } from '../../../core/bff-request.error';
import { CheckoutGateway } from '../domain/checkout.gateway';
import { CuentaFacade } from '../../cuenta/application/cuenta.facade';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import { CarritoFacade } from '../../carrito/application/carrito.facade';
import { PedidosFacade } from '../../pedidos/application/pedidos.facade';
import { ContenidoFacade } from '../../contenido/application/contenido.facade';

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
  private readonly contenido = inject(ContenidoFacade);
  private readonly submittingState = signal(false);
  private readonly terminosCambiaronState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly outdatedState = signal(false);
  /** Un intento de compra: se renueva al entrar al checkout y tras comprar (PBI-0086). */
  private attemptKey = nuevaClaveDeIntento();

  readonly submitting = this.submittingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  /** El último envío falló porque cambiaron el precio, el stock o el envío: hay que revisar antes de reintentar. */
  readonly datosCambiaron = this.outdatedState.asReadonly();
  /**
   * Los términos cambiaron mientras el comprador llenaba el formulario (lote 17, PBI-0177): la página quita la marca de
   * la casilla para que los vuelva a aceptar.
   */
  readonly terminosCambiaron = this.terminosCambiaronState.asReadonly();

  /**
   * Al entrar al checkout: sin el error de un intento anterior (PBI-0064), con un intento nuevo y con el catálogo
   * recargado, para que el comprador vea el precio y el stock vigentes antes de pagar (PBI-0106).
   */
  iniciar(): void {
    this.errorState.set(null);
    this.outdatedState.set(false);
    this.terminosCambiaronState.set(false);
    this.attemptKey = nuevaClaveDeIntento();
    this.cart.descartarCambios();
    void this.catalog.load();
    // Lote 17 (PBI-0178): la primera fecha de entrega de la tienda, que es el mínimo y la fecha propuesta.
    void this.orders.cargarPrimeraFechaDeEntrega();
  }

  /**
   * Envía el pedido con la versión de los términos que muestra la tienda (lote 17, PBI-0177): la de los ajustes
   * vigentes, los mismos que muestra la página de Términos.
   */
  async submit(command: Omit<CheckoutCommand, 'termsVersion'>): Promise<ComprobantePedido | null> {
    // Un segundo clic mientras se envía no manda otro pedido (PBI-0086).
    if (this.submittingState()) return null;
    this.submittingState.set(true);
    this.errorState.set(null);
    this.outdatedState.set(false);
    this.terminosCambiaronState.set(false);

    try {
      const placed = await this.gateway.placeOrder(
        { ...command, termsVersion: this.contenido.settings().termsVersion ?? 0 },
        this.auth.sessionToken(),
        this.attemptKey,
      );
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
      if (error instanceof BffRequestError && error.code === 'TERMS_VERSION_CHANGED') {
        // Se recarga el contenido para tener la versión vigente; el comprador vuelve a aceptar los términos.
        await this.contenido.load(true);
        this.terminosCambiaronState.set(true);
      }
      // Lote 19 (PBI-0006): la tienda volvió a una sola dirección por pedido mientras el comprador llenaba el formulario.
      // Se recarga el contenido; la página quita las direcciones de los productos y vuelve a calcular el envío.
      if (error instanceof BffRequestError && error.code === 'PER_PRODUCT_ADDRESS_DISABLED')
        await this.contenido.load(true);
      // La primera fecha cambió mientras tanto (por ejemplo, pasó la hora de corte): se vuelve a pedir.
      if (error instanceof BffRequestError && error.code === 'INVALID_DELIVERY_DATE')
        await this.orders.cargarPrimeraFechaDeEntrega();
      return null;
    } finally {
      this.submittingState.set(false);
    }
  }
}
