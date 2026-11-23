import type { Banner, UbicacionBanner } from './contenido.model';

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

/** Paleta del tema con la que se pinta un botón del banner (lote 12, PBI-0184). */
export type PaletaBoton = 'primaria' | 'secundaria';

export interface BotonBanner {
  readonly etiqueta: string;
  readonly enlace: string;
  readonly paleta: PaletaBoton;
}

/**
 * Los botones que muestra un banner (lote 12, ADR-0021, PBI-0184): primero el principal, con la paleta primaria, y
 * después el secundario, con la secundaria. Un botón sale solo si tiene texto y enlace.
 */
export function botonesDelBanner(
  banner: Pick<Banner, 'ctaLabel' | 'ctaUrl' | 'secondaryCtaLabel' | 'secondaryCtaUrl'>,
): readonly BotonBanner[] {
  const candidatos: readonly [string | undefined, string | undefined, PaletaBoton][] = [
    [banner.ctaLabel, banner.ctaUrl, 'primaria'],
    [banner.secondaryCtaLabel, banner.secondaryCtaUrl, 'secundaria'],
  ];
  return candidatos
    .map(([etiqueta, enlace, paleta]) => ({
      etiqueta: (etiqueta ?? '').trim(),
      enlace: (enlace ?? '').trim(),
      paleta,
    }))
    .filter((boton) => boton.etiqueta && boton.enlace);
}
