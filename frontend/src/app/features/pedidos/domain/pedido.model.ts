import { LineaCarrito } from '../../carrito/domain/carrito.model';

export type MetodoPago = 'card' | 'yape-plin' | 'transfer';
export type EstadoPedido = 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface ClienteCheckout {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly document: string;
}

export interface DireccionEnvio {
  readonly addressLine: string;
  readonly district: string;
  readonly province: string;
  readonly department: string;
  readonly reference?: string;
}

export interface CheckoutCommand {
  readonly customer: ClienteCheckout;
  readonly shipping: DireccionEnvio;
  readonly deliveryDate: string;
  readonly paymentMethod: MetodoPago;
  readonly items: readonly LineaCarrito[];
  readonly subtotal: number;
  readonly igv: number;
  readonly shippingCost: number;
  /** El total que ve el comprador: el BFF lo compara con el vigente (`ORDER_TOTAL_CHANGED`, PBI-0106). */
  readonly total: number;
  /** Aceptó los términos y condiciones (PBI-0040). */
  readonly termsAccepted: boolean;
}

export interface ComprobantePedido {
  readonly id: string;
  readonly createdAt: string;
  readonly total: number;
  readonly status: EstadoPedido;
}

export interface Pedido extends ComprobantePedido {
  readonly customer: ClienteCheckout;
  readonly shipping: DireccionEnvio;
  readonly deliveryDate: string;
  readonly paymentMethod: MetodoPago;
  readonly items: readonly LineaCarrito[];
  readonly subtotal: number;
  readonly igv: number;
  readonly shippingCost: number;
  readonly shippingOrigin?: string;
  readonly updatedAt: string;
  /** Cuándo aceptó el comprador los términos y condiciones; los pedidos anteriores al lote 04 no lo tienen. */
  readonly termsAcceptedAt?: string;
}

/** Respuesta del checkout: incluye una única vez el token que permite a un invitado consultar su pedido. */
export interface PedidoRegistrado extends Pedido {
  readonly accessToken: string;
}

export const ETIQUETAS_ESTADO_PEDIDO: Readonly<Record<EstadoPedido, string>> = {
  confirmed: 'Confirmado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};
