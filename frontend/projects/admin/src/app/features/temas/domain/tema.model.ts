/** Los cinco colores que una persona elige para un tema, cada uno como `#RRGGBB`. */
export interface ColoresTema {
  readonly primary: string;
  readonly secondary: string;
  readonly background: string;
  readonly surface: string;
  readonly contrast: string;
}

/** Nombre de cada token CSS que forma el mapa de un tema. */
export type NombreToken =
  | '--ws-primary'
  | '--ws-primary-strong'
  | '--ws-primary-soft'
  | '--ws-on-primary'
  | '--ws-on-primary-soft'
  | '--ws-accent'
  | '--ws-accent-strong'
  | '--ws-accent-soft'
  | '--ws-on-accent'
  | '--ws-accent-line'
  | '--ws-link'
  | '--ws-on-link'
  | '--ws-focus-ring'
  | '--ws-topbar'
  | '--ws-on-topbar'
  | '--ws-danger'
  | '--ws-danger-soft'
  | '--ws-danger-line'
  | '--ws-warning'
  | '--ws-warning-soft'
  | '--ws-store-bg'
  | '--ws-bg'
  | '--ws-surface'
  | '--ws-surface-subtle'
  | '--ws-surface-soft'
  | '--ws-ink'
  | '--ws-text'
  | '--ws-muted-strong'
  | '--ws-muted'
  | '--ws-border'
  | '--ws-border-strong'
  | '--ws-disabled'
  | '--ws-disabled-text'
  | '--ws-dot'
  | '--ws-footer'
  | '--ws-footer-text'
  | '--ws-footer-rule'
  | '--ws-footer-heading';

/** Mapa completo de tokens de un tema: cada nombre con su valor CSS. */
export type TokensTema = Readonly<Record<NombreToken, string>>;

/** Un tema tal como lo sirve el BFF: predefinido o propio, con sus colores y sus tokens. */
export interface Tema {
  readonly id: string;
  readonly name: string;
  readonly kind: 'predefined' | 'custom';
  readonly colors: ColoresTema;
  readonly tokens: TokensTema;
}

/** Medida de un par de texto y fondo de un tema frente a su mínimo de contraste. */
export interface ParContraste {
  readonly par:
    | 'contrast/background'
    | 'contrast/surface'
    | 'muted/background'
    | 'muted/surface'
    | 'onPrimary/primary'
    | 'onPrimary/primaryStrong'
    | 'onPrimarySoft/primarySoft'
    | 'onAccent/accent'
    | 'link/background'
    | 'link/surface'
    | 'focusRing/background'
    | 'focusRing/surface'
    | 'footerText/footer'
    | 'onTopbar/topbar'
    | 'disabledText/disabled'
    | 'contrast/storeBackground'
    | 'muted/storeBackground'
    | 'link/storeBackground'
    | 'focusRing/storeBackground'
    | 'borderStrong/surface'
    | 'onLink/link'
    | 'danger/background'
    | 'danger/surface'
    | 'danger/dangerSoft'
    | 'warning/background'
    | 'warning/surface'
    | 'warning/warningSoft'
    | 'contrast/accentSoft'
    | 'muted/accentSoft';
  /** Relación de contraste redondeada a un decimal hacia abajo. */
  readonly relacion: number;
  readonly minimo: 4.5 | 3;
  /** Si el par impide guardar el tema cuando queda bajo su mínimo. */
  readonly bloquea: boolean;
}

/** Apariencia pública: lo que la tienda y el Admin necesitan para pintarse (`GET /bff/appearance`). */
export interface Apariencia {
  readonly demoMode: boolean;
  /** Si el acceso muestra las credenciales de prueba (PBI-0071). Un BFF anterior no lo envía: vale `demoMode`. */
  readonly testCredentials?: boolean;
  readonly activeThemeId: string;
  readonly themes: readonly Tema[];
}

/** Temas para gestionar en el Admin, con la revisión sobre la que se trabaja (`GET /bff/admin/themes`). */
export interface TemasAdmin {
  readonly revision: number;
  readonly activeThemeId: string;
  readonly themes: readonly Tema[];
}
