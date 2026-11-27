import { aHoraDeLima, finEnLima, inicioEnLima, instanteDeLaVigencia } from './banner.rules';
import type { AvisoTienda } from './tienda.model';

/**
 * Avisos programados de la barra superior (lote 30, ADR-0027, PBI-0244; confirmado por Sebastián Avila): cada
 * aviso lleva un «Desde» y un «Hasta» opcionales, con fecha y hora de Lima. El formulario los muestra y los recibe como
 * el valor de un `datetime-local` (`AAAA-MM-DDTHH:mm`) y se guardan como instantes con `-05:00`, igual que la vigencia
 * de los banners (`banner.rules.ts`): el «Desde» al empezar el minuto y el «Hasta» al terminarlo. Sin fechas, el aviso
 * se muestra siempre, como antes del lote. El BFF valida lo mismo (`domain/admin/contenido.rules.mjs`) y es quien
 * decide qué avisos ve la tienda.
 */

/** Una fila de «Avisos de la barra superior» en el formulario: los extremos en hora de Lima, o vacíos. */
export interface FilaDeAviso {
  readonly text: string;
  readonly url: string;
  readonly startAt: string;
  readonly endAt: string;
}

export type EstadoDeAviso = 'Programado' | 'Vigente' | 'Vencido';

/** El aviso guardado, como lo muestra el formulario. */
export function avisoAFormulario(aviso: AvisoTienda): FilaDeAviso {
  return {
    text: aviso.text ?? '',
    url: aviso.url ?? '',
    startAt: aviso.startAt ? aHoraDeLima(aviso.startAt) : '',
    endAt: aviso.endAt ? aHoraDeLima(aviso.endAt) : '',
  };
}

/**
 * El aviso que se guarda: los textos recortados y solo los extremos con valor. Un extremo que no cambió conserva el
 * instante guardado (`guardado`), para que no viaje como cambio (PBI-0120).
 */
export function avisoDesdeFormulario(fila: FilaDeAviso, guardado?: AvisoTienda): AvisoTienda {
  return {
    text: fila.text.trim(),
    url: fila.url.trim(),
    ...(fila.startAt ? { startAt: instanteDeLaVigencia(guardado?.startAt, fila.startAt, 'inicio') } : {}),
    ...(fila.endAt ? { endAt: instanteDeLaVigencia(guardado?.endAt, fila.endAt, 'fin') } : {}),
  };
}

/** Con los dos extremos, el «Hasta» va en un minuto posterior al del «Desde». */
export function motivoDeVigenciaDeAviso(desde: string, hasta: string): string | null {
  return desde && hasta && hasta <= desde ? 'El «Hasta» tiene que ser posterior al «Desde».' : null;
}

/** `Programado` antes de su «Desde», `Vencido` después de su «Hasta» y `Vigente` en el resto; recibe el instante. */
export function estadoDelAviso(desde: string, hasta: string, instante: number): EstadoDeAviso {
  if (desde && instante < Date.parse(inicioEnLima(desde))) return 'Programado';
  if (hasta && instante > Date.parse(finEnLima(hasta))) return 'Vencido';
  return 'Vigente';
}
