import { CheckoutCommand, PedidoRegistrado } from '../../pedidos/domain/pedido.model';

/**
 * Puerto de compra. Con sesión de cliente el BFF vincula el pedido a la cuenta. `claveDelIntento` identifica el
 * intento de compra: si se envía dos veces, el BFF devuelve el mismo pedido y no crea otro (PBI-0086).
 */
export abstract class CheckoutGateway {
  abstract placeOrder(
    command: CheckoutCommand,
    sessionToken: string | null,
    claveDelIntento: string,
  ): Promise<PedidoRegistrado>;
}
