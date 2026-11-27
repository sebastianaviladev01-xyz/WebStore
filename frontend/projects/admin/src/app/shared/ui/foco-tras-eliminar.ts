import { afterNextRender, ElementRef, inject, Injector } from '@angular/core';

import { lugarTrasEliminar } from './lugar-tras-eliminar';

/** Los botones de eliminar (o quitar, o borrar) de las filas de una lista llevan este atributo. */
const SELECTOR = '[data-eliminar]';

/** Lo que el foco necesita saber de la lista. */
export interface OpcionesFocoTrasEliminar {
  /** Página que se ve, en una lista con páginas (PBI-0273). Sin ella, la lista se trata como de una sola página. */
  readonly pagina?: () => number;
}

/** Lo que `recordar()` guarda de la fila que se va a eliminar. */
export interface LugarRecordado {
  /** Lugar, entre los botones de eliminar de la lista, del que se pulsó (`-1` si no es uno de ellos). */
  readonly lugar: number;
  /** Página que se veía al pulsarlo. */
  readonly pagina: number;
}

/**
 * El foco después de eliminar una fila (lote 43, ADR-0033, PBI-0269). Al confirmar en la ventana, la fila desaparece y
 * el foco caería en el `body`; en su lugar va (`lugarTrasEliminar`):
 * - al botón de eliminar de la fila que ocupa su lugar;
 * - si era la última, al de la fila anterior;
 * - si la lista vuelve a la página anterior (se eliminó la única fila de la última página), al de la última fila de esa
 *   página, la más cercana a la eliminada (PBI-0273; las listas con páginas pasan `pagina`);
 * - si la lista queda vacía, al `h1` de la página (con `tabindex="-1"`).
 *
 * Si se cancela la ventana, `MatDialog` devuelve el foco al botón que la abrió, como siempre. Los botones de eliminar
 * llevan `data-eliminar`. Se llama en el constructor de la página (usa `inject`).
 */
export function focoTrasEliminar(opciones: OpcionesFocoTrasEliminar = {}) {
  const injector = inject(Injector);
  const host: HTMLElement = inject(ElementRef).nativeElement;
  const pagina = opciones.pagina ?? (() => 1);
  const botones = () => [...host.querySelectorAll<HTMLElement>(SELECTOR)];
  const titulo = () => {
    const h1 = host.querySelector<HTMLElement>('h1');
    if (h1 && !h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
    return h1;
  };
  return {
    /** Dónde estaba, entre los botones de eliminar de la lista, el que se pulsó, y en qué página. */
    recordar(evento: Event): LugarRecordado {
      const boton = (evento.currentTarget as HTMLElement | null)?.closest<HTMLElement>(SELECTOR);
      return { lugar: boton ? botones().indexOf(boton) : -1, pagina: pagina() };
    },
    /** Tras eliminar, cuando la lista ya se volvió a pintar, lleva el foco al lugar que corresponde. */
    restaurar(recordado: LugarRecordado): void {
      afterNextRender(
        () => {
          const quedan = botones();
          const destino = lugarTrasEliminar({
            lugar: recordado.lugar,
            quedan: quedan.length,
            paginaAntes: recordado.pagina,
            paginaDespues: pagina(),
          });
          (destino >= 0 ? quedan[destino] : titulo())?.focus();
        },
        { injector },
      );
    },
  };
}
