import { Pedido } from './pedido.model';

/** Quién consulta: la sesión de cliente, el token del pedido (invitado) o ambos. */
export interface CredencialesPedido {
  readonly sessionToken?: string | null;
  readonly accessToken?: string | null;
}

export type CambioPedido =
  | { readonly action: 'shipping'; readonly payload: Pick<Pedido, 'shipping'> }
  | { readonly action: 'delivery-date'; readonly payload: Pick<Pedido, 'deliveryDate'> }
  | { readonly action: 'cancel'; readonly payload: Record<string, never> };

/** Puerto de pedidos ya registrados. Los fallos llegan como BffRequestError. */
export abstract class PedidoGateway {
  abstract listMine(sessionToken: string): Promise<readonly Pedido[]>;
  abstract get(id: string, credentials: CredencialesPedido): Promise<Pedido>;
  abstract change(id: string, change: CambioPedido, credentials: CredencialesPedido): Promise<Pedido>;
}
