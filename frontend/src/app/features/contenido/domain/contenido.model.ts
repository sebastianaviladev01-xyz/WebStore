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
