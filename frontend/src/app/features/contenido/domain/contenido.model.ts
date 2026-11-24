export type UbicacionBanner = 'hero' | 'promotion' | 'secondary';

/** Versión del inicio: la actual o la previa a la alineación con la propuesta B, publicada aparte para comparar. */
export type VarianteInicio = 'actual' | 'anterior';

export interface Banner {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  /** Botón principal (paleta primaria). Sin texto o sin enlace, no se muestra (PBI-0184). */
  readonly ctaLabel: string;
  readonly ctaUrl: string;
  /** Botón secundario (paleta secundaria), opcional (lote 12, PBI-0184). */
  readonly secondaryCtaLabel?: string;
  readonly secondaryCtaUrl?: string;
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
}

/** Un acceso del pie: la columna (`group`), su texto y su destino (PBI-0185). */
export interface AccesoInferior {
  readonly group: string;
  readonly label: string;
  readonly url: string;
}

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
}

export type PaginasHabilitadas = Pick<
  ConfiguracionTienda,
  'contactPageEnabled' | 'shippingPageEnabled' | 'privacyPageEnabled' | 'termsPageEnabled'
>;
