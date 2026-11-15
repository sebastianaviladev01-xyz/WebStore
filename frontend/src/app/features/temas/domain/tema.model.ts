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

/** Apariencia pública: lo que la tienda y el Admin necesitan para pintarse (`GET /bff/appearance`). */
export interface Apariencia {
  readonly demoMode: boolean;
  readonly activeThemeId: string;
  readonly themes: readonly Tema[];
}
