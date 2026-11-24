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
  /** Imagen pequeña opcional, como Data URL (lote 07b, PBI-0052); sin ella, la tienda se ve como antes. */
  readonly imageUrl?: string;
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
  /** Botón principal (paleta primaria): texto y enlace, los dos o ninguno (PBI-0184). */
  readonly cta: string;
  readonly ctaUrl: string;
  /** Botón secundario (paleta secundaria), opcional (lote 12, PBI-0184). */
  readonly secondaryCta?: string;
  readonly secondaryCtaUrl?: string;
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

/** La dirección propia de una línea del pedido (lote 19, PBI-0006): los campos de la dirección de entrega. */
export interface DireccionDeLinea {
  readonly addressLine: string;
  readonly district: string;
  readonly province: string;
  readonly department: string;
  readonly reference?: string;
}

export interface LineaPedido {
  readonly productId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
  /** Otra dirección para esta línea (una por producto, lote 19); null o ausente si va a la del pedido. */
  readonly shipping?: DireccionDeLinea | null;
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
  /** La versión de los términos aceptada (lote 17, PBI-0177); null en pedidos anteriores al registro de versiones. */
  readonly termsVersion?: number | null;
  readonly subtotal: number;
  readonly shippingCost: number;
  readonly total: number;
  readonly items: readonly LineaPedido[];
}

/** Un evento de la actividad reciente del Dashboard (lote 07b, PBI-0028). */
export interface EventoActividad {
  readonly id: string;
  readonly at: string;
  readonly type: 'order-created' | 'order-status-changed' | 'account-registered' | 'complaint-registered';
  readonly description: string;
}

/** Un correo o un teléfono de la tienda, con una etiqueta opcional («Ventas»); lote 15, PBI-0169. */
export interface DatoDeContacto {
  readonly value: string;
  readonly label: string;
}

/** Una red social: su nombre y una dirección `https://` (PBI-0169). */
export interface RedSocial {
  readonly label: string;
  readonly url: string;
}

/** Un aviso de la barra superior de la tienda, con un enlace opcional (PBI-0175). */
export interface AvisoTienda {
  readonly text: string;
  readonly url: string;
}

/** Un acceso del pie de la tienda: su columna (`group`), su texto y su destino (PBI-0185). */
export interface AccesoInferior {
  readonly group: string;
  readonly label: string;
  readonly url: string;
}

/** Primera fecha de entrega que puede elegir el comprador (lote 17, PBI-0178): hoy, mañana o el siguiente día hábil. */
export type ReglaDePrimeraEntrega = 'same-day' | 'next-calendar-day' | 'next-business-day';

/** Una dirección de entrega por pedido o una por producto (lote 19, ADR-0021, PBI-0006; provisional). */
export type ModoDeDireccion = 'per-order' | 'per-product';

/** Un día no laborable del calendario de la tienda (lote 17, PBI-0183): su fecha (`AAAA-MM-DD`) y un nombre opcional. */
export interface DiaNoLaborable {
  readonly id: string;
  readonly date: string;
  readonly name: string;
}

/** Dónde muestra la tienda «Producto agregado» con los sugeridos (lote 16, PBI-0179): el diálogo o un panel lateral. */
export type LugarDeSugeridos = 'dialog' | 'side-panel';

export interface ConfiguracionTienda {
  readonly storeName: string;
  readonly logoText: string;
  readonly logoUrl: string;
  readonly fontFamily: string;
  /** El primero de cada lista es el principal, donde la tienda solo muestra uno (lote 15). */
  readonly contactEmails: readonly DatoDeContacto[];
  readonly contactPhones: readonly DatoDeContacto[];
  readonly socialLinks: readonly RedSocial[];
  readonly announcements: readonly AvisoTienda[];
  readonly footerText: string;
  readonly sideNavigation: string;
  readonly quickLinks: readonly AccesoInferior[];
  readonly benefits: string;
  readonly contactContent: string;
  readonly shippingContent: string;
  readonly privacyContent: string;
  readonly termsContent: string;
  readonly contactPageEnabled: boolean;
  readonly shippingPageEnabled: boolean;
  readonly privacyPageEnabled: boolean;
  readonly termsPageEnabled: boolean;
  readonly addToCartDisplay: LugarDeSugeridos;
  /** Primera fecha de entrega y hora de corte opcional (`HH:MM` en hora de Lima, o vacía); lote 17, PBI-0178. */
  readonly firstDeliveryDay: ReglaDePrimeraEntrega;
  readonly deliveryCutoffTime: string;
  /** Una dirección por pedido o una por producto (lote 19, PBI-0006); el BFF la completa con la de por defecto. */
  readonly deliveryAddressMode: ModoDeDireccion;
  /** La versión vigente de los términos y cuándo se publicó (null si es anterior al registro); la calcula el BFF. */
  readonly termsVersion: number;
  readonly termsPublishedAt: string | null;
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
  /** Últimos eventos para el Dashboard completo (`orders.manage`); vacía para el vendedor (lote 07b, PBI-0028). */
  readonly activity?: readonly EventoActividad[];
  /** Calendario de días no laborables (lote 17, PBI-0183); solo para el superadministrador (`content.manage`). */
  readonly nonWorkingDates: readonly DiaNoLaborable[];
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
