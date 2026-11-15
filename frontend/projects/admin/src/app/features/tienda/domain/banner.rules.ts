import { Banner } from './tienda.model';

/**
 * Vigencia de los banners (lote 06, ADR-0017; PBI-0128). Los días del formulario son días de Lima (UTC-5, sin
 * horario de verano): un banner entra a las 00:00 y sale a las 23:59:59.999 de Lima, no cinco horas antes.
 */
export const inicioDelDiaEnLima = (dia: string): string => `${dia}T00:00:00.000-05:00`;
export const finDelDiaEnLima = (dia: string): string => `${dia}T23:59:59.999-05:00`;

/** El fin va antes del inicio (ambos `AAAA-MM-DD`); el mismo día vale. Sin alguno de los dos, no se compara. */
export const finAntesDelInicio = (inicio: string, fin: string): boolean => !!inicio && !!fin && fin < inicio;

/** Máximo de banners principales activos que la tienda publica a la vez en el carrusel. */
export const MAXIMO_HEROES_ACTIVOS = 3;

/**
 * Banners principales activos, distintos del que se guarda, cuya vigencia coincide con la suya (`AAAA-MM-DD` de
 * Lima): los vencidos o los que empiezan después no cuentan para el tope.
 */
export function heroesQueCoinciden(
  banners: readonly Pick<Banner, 'id' | 'placement' | 'active' | 'startAt' | 'endAt'>[],
  vigencia: { readonly id: string | null; readonly startAt: string; readonly endAt: string },
): number {
  const inicio = Date.parse(inicioDelDiaEnLima(vigencia.startAt));
  const fin = Date.parse(finDelDiaEnLima(vigencia.endAt));
  return banners.filter(
    (banner) =>
      banner.id !== vigencia.id &&
      banner.active &&
      banner.placement === 'hero' &&
      Date.parse(banner.startAt) <= fin &&
      Date.parse(banner.endAt) >= inicio,
  ).length;
}
