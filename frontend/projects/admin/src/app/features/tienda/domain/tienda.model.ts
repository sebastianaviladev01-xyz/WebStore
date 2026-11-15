import { DefinicionRol } from '../../sesion/domain/rol.rules';
import { UsuarioAdmin } from '../../sesion/domain/usuario-admin.model';

export type UbicacionBanner = 'hero' | 'promotion' | 'secondary';

export interface Producto {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly thumbnailUrl: string;
  readonly brandId: string;
  readonly categoryId: string;
  readonly price: number;
  readonly stock: number;
  readonly active: boolean;
  readonly highlights: readonly string[];
  /** Fotos adicionales a la imagen principal, en el orden en que se muestran en la ficha. */
  readonly gallery: readonly string[];
}

export interface Categoria {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string;
  readonly order?: number;
}

export interface Marca {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
}

export interface Cliente {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly document: string;
  readonly orders: number;
}

export interface Reclamo {
  readonly id: string;
  readonly name: string;
  readonly document: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly subject: string;
  readonly amount: number;
  readonly type: 'reclamo' | 'queja';
  readonly detail: string;
  readonly request: string;
  readonly status: 'received' | 'in-review' | 'resolved';
  readonly providerResponse: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly dueAt: string;
}

export interface Banner {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly cta: string;
  readonly ctaUrl: string;
  readonly imageUrl: string;
  readonly mobileImageUrl: string;
  readonly placement: UbicacionBanner;
  readonly imageFit?: 'cover' | 'contain';
  readonly imageTone?: 'light' | 'dark';
  readonly imageFocusY?: number | null;
  readonly startAt: string;
  readonly endAt: string;
  readonly active: boolean;
}

export interface TarifaEnvio {
  readonly id: string;
  readonly origin: string;
  readonly destination: string;
  readonly price: number;
}

export type EstadoPedido = 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface LineaPedido {
  readonly productId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface Pedido {
  readonly id: string;
  readonly createdAt: string;
  readonly status: EstadoPedido;
  readonly customer: string;
  readonly customerEmail: string;
  readonly customerPhone: string;
  readonly district: string;
  readonly address: string;
  readonly deliveryDate: string;
  readonly shippingOrigin: string;
  readonly paymentMethod: string;
  /** Cuándo aceptó el comprador los términos (lote 04); null en pedidos anteriores a esa casilla (PBI-0145). */
  readonly termsAcceptedAt: string | null;
  readonly subtotal: number;
  readonly shippingCost: number;
  readonly total: number;
  readonly items: readonly LineaPedido[];
}

export interface ConfiguracionTienda {
  readonly storeName: string;
  readonly logoText: string;
  readonly logoUrl: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
  readonly fontFamily: string;
  readonly headerMessage: string;
  readonly footerText: string;
  readonly topNavigation: string;
  readonly sideNavigation: string;
  readonly quickLinks: string;
  readonly benefits: string;
  readonly contactContent: string;
  readonly shippingContent: string;
  readonly privacyContent: string;
  readonly termsContent: string;
  readonly contactPageEnabled: boolean;
  readonly shippingPageEnabled: boolean;
  readonly privacyPageEnabled: boolean;
  readonly termsPageEnabled: boolean;
}

export interface SnapshotTienda {
  /** Revisión del BFF sobre la que se cargó el snapshot; se envía en cada guardado. */
  readonly revision: number;
  /** Roles fijos disponibles para asignar; no se editan desde el panel. */
  readonly roles: readonly DefinicionRol[];
  readonly products: readonly Producto[];
  readonly categories: readonly Categoria[];
  readonly brands: readonly Marca[];
  readonly customers: readonly Cliente[];
  readonly users: readonly UsuarioAdmin[];
  readonly banners: readonly Banner[];
  readonly rates: readonly TarifaEnvio[];
  readonly orders: readonly Pedido[];
  readonly complaints: readonly Reclamo[];
  readonly config: ConfiguracionTienda;
}

/** Etiquetas visibles: el panel nunca muestra los códigos internos. */
export const ETIQUETAS_ESTADO_PEDIDO: Readonly<Record<EstadoPedido, string>> = {
  confirmed: 'Confirmado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const ETIQUETAS_ESTADO_RECLAMO: Readonly<Record<Reclamo['status'], string>> = {
  received: 'Recibido',
  'in-review': 'En revisión',
  resolved: 'Resuelto',
};

export const ETIQUETAS_UBICACION_BANNER: Readonly<Record<UbicacionBanner, string>> = {
  hero: 'Hero principal',
  promotion: 'Promoción',
  secondary: 'Banner secundario',
};
