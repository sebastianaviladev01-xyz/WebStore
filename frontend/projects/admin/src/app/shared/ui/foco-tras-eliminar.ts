import { afterNextRender, ElementRef, inject, Injector } from '@angular/core';

/** Los botones de eliminar (o quitar, o borrar) de las filas de una lista llevan este atributo. */
const SELECTOR = '[data-eliminar]';

/**
 * El foco después de eliminar una fila (lote 43, ADR-0033, PBI-0269). Al confirmar en la ventana, la fila desaparece y
 * el foco caería en el `body`; en su lugar va:
 * - al botón de eliminar de la fila que ocupa su lugar;
 * - si era la última, al de la fila anterior;
 * - si la lista queda vacía, al `h1` de la página (con `tabindex="-1"`).
 *
 * Si se cancela la ventana, `MatDialog` devuelve el foco al botón que la abrió, como siempre. Los botones de eliminar
 * llevan `data-eliminar`. Se llama en el constructor de la página (usa `inject`).
 */
export function focoTrasEliminar() {
  const injector = inject(Injector);
  const host: HTMLElement = inject(ElementRef).nativeElement;
  const botones = () => [...host.querySelectorAll<HTMLElement>(SELECTOR)];
  const titulo = () => {
    const h1 = host.querySelector<HTMLElement>('h1');
    if (h1 && !h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
    return h1;
  };
  return {
    /** Lugar, entre los botones de eliminar de la lista, del que se pulsó (`-1` si no es uno de ellos). */
    recordar(evento: Event): number {
      const boton = (evento.currentTarget as HTMLElement | null)?.closest<HTMLElement>(SELECTOR);
      return boton ? botones().indexOf(boton) : -1;
    },
    /** Tras eliminar, cuando la lista ya se volvió a pintar, lleva el foco al lugar que corresponde. */
    restaurar(lugar: number): void {
      afterNextRender(
        () => {
          const quedan = botones();
          const destino =
            lugar >= 0 && quedan.length ? quedan[Math.min(lugar, quedan.length - 1)] : undefined;
          (destino ?? titulo())?.focus();
        },
        { injector },
      );
    },
  };
}
