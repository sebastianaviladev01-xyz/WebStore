import { CheckoutCommand, PedidoRegistrado } from '../../pedidos/domain/pedido.model';

/** Puerto de compra. Con sesión de cliente el BFF vincula el pedido a la cuenta. */
export abstract class CheckoutGateway {
  abstract placeOrder(command: CheckoutCommand, sessionToken: string | null): Promise<PedidoRegistrado>;
}
