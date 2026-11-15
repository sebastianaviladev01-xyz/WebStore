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
