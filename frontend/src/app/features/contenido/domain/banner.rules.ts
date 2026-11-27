import type { Banner, EstiloBotonBanner, UbicacionBanner } from './contenido.model';

/** Banners por zona del inicio: el mismo máximo de héroes activos que comprueba el Admin (PBI-0117). */
export const MAXIMO_BANNERS_POR_ZONA = 3;

/** Los banners activos cuya ventana incluye `ahora` (los extremos cuentan). */
export function bannersVigentes(banners: readonly Banner[], ahora: Date): readonly Banner[] {
  const instante = ahora.getTime();
  return banners.filter(
    (banner) =>
      banner.active &&
      new Date(banner.startAt).getTime() <= instante &&
      new Date(banner.endAt).getTime() >= instante,
  );
}

/** Los primeros `MAXIMO_BANNERS_POR_ZONA` banners de las ubicaciones dadas, en su orden. */
export function bannersDeZona(
  banners: readonly Banner[],
  ubicaciones: readonly UbicacionBanner[],
): readonly Banner[] {
  return banners.filter((banner) => ubicaciones.includes(banner.placement)).slice(0, MAXIMO_BANNERS_POR_ZONA);
}

/** Los cuatro estilos del tema que puede llevar un botón del banner (lote 46, ADR-0033, PBI-0266). */
export const ESTILOS_DE_BOTON_BANNER: readonly EstiloBotonBanner[] = [
  'primary',
  'accent',
  'contrast',
  'outline',
];

export interface BotonBanner {
  /** Cuál de los dos botones es: identifica al botón aunque los dos tengan el mismo estilo. */
  readonly posicion: 'primero' | 'segundo';
  readonly etiqueta: string;
  readonly enlace: string;
  readonly estilo: EstiloBotonBanner;
}

const estiloValido = (estilo: unknown, porOmision: EstiloBotonBanner): EstiloBotonBanner =>
  ESTILOS_DE_BOTON_BANNER.find((candidato) => candidato === estilo) ?? porOmision;

/**
 * Los botones que muestra un banner (lote 12, ADR-0021, PBI-0184): primero el primero y después el segundo. Un botón
 * sale solo si tiene texto y enlace. Desde el lote 46 (PBI-0266), cada uno con el estilo elegido al registrar el
 * banner; sin estilo, o con uno que la tienda no conoce, el primero con el principal y el segundo con el secundario.
 */
export function botonesDelBanner(
  banner: Pick<
    Banner,
    'ctaLabel' | 'ctaUrl' | 'secondaryCtaLabel' | 'secondaryCtaUrl' | 'ctaStyle' | 'secondaryCtaStyle'
  >,
): readonly BotonBanner[] {
  const candidatos: readonly BotonBanner[] = [
    {
      posicion: 'primero',
      etiqueta: (banner.ctaLabel ?? '').trim(),
      enlace: (banner.ctaUrl ?? '').trim(),
      estilo: estiloValido(banner.ctaStyle, 'primary'),
    },
    {
      posicion: 'segundo',
      etiqueta: (banner.secondaryCtaLabel ?? '').trim(),
      enlace: (banner.secondaryCtaUrl ?? '').trim(),
      estilo: estiloValido(banner.secondaryCtaStyle, 'accent'),
    },
  ];
  return candidatos.filter((boton) => boton.etiqueta && boton.enlace);
}
