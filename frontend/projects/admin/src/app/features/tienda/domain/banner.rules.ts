import { Banner, EstiloDeBoton } from './tienda.model';

/**
 * Vigencia de los banners (lote 06, ADR-0017; PBI-0128), con fecha y hora desde el lote 24 (ADR-0025, PBI-0221;
 * confirmado por Sebastián Avila). El formulario muestra y recibe la hora de Lima (UTC-5, sin horario de verano) como
 * `AAAA-MM-DDTHH:mm`, el valor de un `datetime-local`, y se guarda como instante con su zona: el inicio al empezar ese
 * minuto y el fin al terminarlo. Así, 00:00 y 23:59 son el día completo, como antes del lote.
 */
const DESFASE_DE_LIMA_MS = -5 * 60 * 60 * 1000;
export const inicioEnLima = (local: string): string => `${local}:00.000-05:00`;
export const finEnLima = (local: string): string => `${local}:59.999-05:00`;

/** Un instante guardado, en hora de Lima (`AAAA-MM-DDTHH:mm`); vacío si no es una fecha. */
export function aHoraDeLima(instante: string): string {
  const ms = Date.parse(instante);
  return Number.isFinite(ms) ? new Date(ms + DESFASE_DE_LIMA_MS).toISOString().slice(0, 16) : '';
}

/** `DD/MM/AAAA HH:mm` en hora de Lima. También la usa la fecha de la cabecera de los registros (lote 44, PBI-0268). */
export const fechaYHoraVisible = (instante: string): string => {
  const local = aHoraDeLima(instante);
  return local ? `${local.slice(8, 10)}/${local.slice(5, 7)}/${local.slice(0, 4)} ${local.slice(11)}` : '—';
};

/** La vigencia como la lee la lista de Banners: inicio y fin en hora de Lima. */
export const vigenciaVisible = (inicio: string, fin: string): string =>
  `${fechaYHoraVisible(inicio)} → ${fechaYHoraVisible(fin)}`;

/**
 * El instante que se guarda para un extremo de la vigencia: si la persona no cambió el minuto, el que ya estaba
 * guardado (con sus segundos y su zona, aunque fuera UTC); si no, el elegido en hora de Lima.
 */
export function instanteDeLaVigencia(
  guardado: string | undefined,
  local: string,
  extremo: 'inicio' | 'fin',
): string {
  if (guardado && aHoraDeLima(guardado) === local) return guardado;
  return extremo === 'inicio' ? inicioEnLima(local) : finEnLima(local);
}

/** El fin va antes del inicio (ambos `AAAA-MM-DDTHH:mm`); el mismo minuto vale. Sin alguno de los dos, no se compara. */
export const finAntesDelInicio = (inicio: string, fin: string): boolean => !!inicio && !!fin && fin < inicio;

/** Máximo de banners principales activos que la tienda publica a la vez en el carrusel. */
export const MAXIMO_HEROES_ACTIVOS = 3;

/**
 * Banners principales activos, distintos del que se guarda, cuya vigencia coincide con la suya (`AAAA-MM-DDTHH:mm`
 * de Lima): los vencidos o los que empiezan después no cuentan para el tope.
 */
export function heroesQueCoinciden(
  banners: readonly Pick<Banner, 'id' | 'placement' | 'active' | 'startAt' | 'endAt'>[],
  vigencia: { readonly id: string | null; readonly startAt: string; readonly endAt: string },
): number {
  const inicio = Date.parse(inicioEnLima(vigencia.startAt));
  const fin = Date.parse(finEnLima(vigencia.endAt));
  return banners.filter(
    (banner) =>
      banner.id !== vigencia.id &&
      banner.active &&
      banner.placement === 'hero' &&
      Date.parse(banner.startAt) <= fin &&
      Date.parse(banner.endAt) >= inicio,
  ).length;
}

/** Largo máximo del texto de cada botón del banner: el mismo que valida el BFF (lote 12, PBI-0184). */
export const MAXIMO_TEXTO_DE_BOTON = 40;

/** Lo que le falta a un botón del banner que está a medias. */
export type ErrorDeBoton = 'sinTexto' | 'sinEnlace';

/**
 * Cada botón del banner, el primero o el segundo, va completo (texto y enlace) o vacío (lote 12, ADR-0021,
 * PBI-0184). Los espacios no cuentan.
 */
export function errorDeBoton(texto: string, enlace: string): ErrorDeBoton | null {
  const conTexto = texto.trim().length > 0;
  const conEnlace = enlace.trim().length > 0;
  if (conTexto && !conEnlace) return 'sinEnlace';
  if (conEnlace && !conTexto) return 'sinTexto';
  return null;
}

/**
 * Los cuatro estilos de un botón del banner (lote 46, ADR-0033, PBI-0266), en el orden de la lista «Estilo», con el
 * nombre que ve la persona. Sin color libre (ADR-0022).
 */
export const ESTILOS_DE_BOTON: readonly { readonly valor: EstiloDeBoton; readonly nombre: string }[] = [
  { valor: 'primary', nombre: 'Principal' },
  { valor: 'accent', nombre: 'Secundario' },
  { valor: 'contrast', nombre: 'Contraste' },
  { valor: 'outline', nombre: 'Con borde' },
];

/** Por omisión, el primero es «Principal» y el segundo «Secundario», como desde el lote 12. */
export const ESTILO_POR_OMISION: Readonly<{ ctaStyle: EstiloDeBoton; secondaryCtaStyle: EstiloDeBoton }> = {
  ctaStyle: 'primary',
  secondaryCtaStyle: 'accent',
};

/** El estilo guardado si es uno de los cuatro; si falta o no existe, el de por omisión de ese botón. */
export function estiloDeBoton(valor: unknown, porOmision: EstiloDeBoton): EstiloDeBoton {
  return ESTILOS_DE_BOTON.find((estilo) => estilo.valor === valor)?.valor ?? porOmision;
}
