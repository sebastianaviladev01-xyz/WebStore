export type UbicacionBanner = 'hero' | 'promotion' | 'secondary';

/**
 * Estilo de un botón del banner (lote 46, ADR-0033, PBI-0266), uno de los cuatro del tema: `primary` (relleno del
 * principal), `accent` (relleno del secundario), `contrast` (relleno del color de contraste) y `outline` (con borde).
 */
export type EstiloBotonBanner = 'primary' | 'accent' | 'contrast' | 'outline';

export interface Banner {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  /** Primer botón. Sin texto o sin enlace, no se muestra (PBI-0184). */
  readonly ctaLabel: string;
  readonly ctaUrl: string;
  /** Segundo botón, opcional (lote 12, PBI-0184). */
  readonly secondaryCtaLabel?: string;
  readonly secondaryCtaUrl?: string;
  /** Estilo de cada botón (lote 46, PBI-0266); sin él, el primero es `primary` y el segundo `accent`. */
  readonly ctaStyle?: EstiloBotonBanner;
  readonly secondaryCtaStyle?: EstiloBotonBanner;
  readonly imageUrl: string;
  readonly mobileImageUrl: string;
  readonly placement: UbicacionBanner;
  readonly imageFit?: 'cover' | 'contain';
  /** Tono de la foto donde van los controles del carrusel: con 'dark' los controles pasan a oscuros, como en LG. */
  readonly imageTone?: 'light' | 'dark';
  /**
   * Posición vertical de la foto de ambiente en el banner, de 0 (se ve la parte de arriba) a 100 (la de abajo).
   * Sin valor se usa 31,5, el encuadre de la foto de la sala.
   */
  readonly imageFocusY?: number | null;
  readonly startAt: string;
  readonly endAt: string;
  readonly active: boolean;
}

/** Un correo o un teléfono de la tienda, con una etiqueta opcional («Ventas»); lote 15, PBI-0169. */
export interface DatoDeContacto {
  readonly value: string;
  readonly label: string;
}

/** Una red social: su nombre (el nombre accesible del enlace) y una dirección `https://` (PBI-0169). */
export interface RedSocial {
  readonly label: string;
  readonly url: string;
}

/** Un aviso de la barra superior, con un enlace opcional: vacío, ruta de la tienda o `https://` (PBI-0175). */
export interface AvisoTienda {
  readonly text: string;
  readonly url: string;
  /** «Desde» y «Hasta» opcionales, instantes ISO con zona (lote 30, PBI-0244). El BFF solo envía los vigentes. */
  readonly startAt?: string;
  readonly endAt?: string;
}

/** Un acceso del pie: la columna (`group`), su texto y su destino (PBI-0185). */
export interface AccesoInferior {
  readonly group: string;
  readonly label: string;
  readonly url: string;
}

/** Dónde muestra la tienda «Producto agregado» con los sugeridos (lote 16, PBI-0179): el diálogo o un panel lateral. */
export type LugarDeSugeridos = 'dialog' | 'side-panel';

export interface ConfiguracionTienda {
  readonly storeName: string;
  readonly logoText: string;
  readonly logoUrl: string;
  /** El primero es el principal, donde la tienda solo muestra uno. */
  readonly contactEmails: readonly DatoDeContacto[];
  readonly contactPhones: readonly DatoDeContacto[];
  readonly socialLinks: readonly RedSocial[];
  readonly fontFamily: string;
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
  /** Opcional: un BFF anterior al lote 16 no lo envía, y entonces es el diálogo (`lugarDeLosSugeridos`). */
  readonly addToCartDisplay?: LugarDeSugeridos;
  /**
   * Una dirección por pedido o una por producto (lote 19, PBI-0006). Opcional: sin ella, una por pedido
   * (`modoDeDireccion`, `pedidos/domain/direccion-por-producto.rules.ts`).
   */
  readonly deliveryAddressMode?: 'per-order' | 'per-product';
  /**
   * La versión vigente de los términos (lote 17, PBI-0177): el checkout la envía al aceptarlos. Opcional: el respaldo,
   * mientras no llega el contenido, no la tiene.
   */
  readonly termsVersion?: number;
  readonly termsPublishedAt?: string | null;
}

export type PaginasHabilitadas = Pick<
  ConfiguracionTienda,
  'contactPageEnabled' | 'shippingPageEnabled' | 'privacyPageEnabled' | 'termsPageEnabled'
>;
