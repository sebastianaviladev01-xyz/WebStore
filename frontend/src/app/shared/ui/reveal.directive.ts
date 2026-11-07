import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

export type RevealFrom = 'up' | 'left' | 'right';

const MAX_DELAY_MS = 320;

/**
 * Hace aparecer el elemento con un desplazamiento suave la primera vez que entra en pantalla.
 * El contenido es visible por defecto: solo se oculta si hay IntersectionObserver, el elemento
 * todavía está fuera de la vista y el visitante no pidió reducir el movimiento.
 */
@Directive({
  selector: '[wsReveal]',
  host: { class: 'ws-reveal' },
})
export class RevealDirective {
  /** Desde dónde entra: abajo (por defecto), izquierda o derecha. */
  readonly wsReveal = input<RevealFrom | ''>('');
  /** Posición dentro de un grupo, para escalonar la entrada (80 ms por elemento, máximo 320 ms). */
  readonly revealIndex = input(0);

  constructor() {
    const element: HTMLElement = inject(ElementRef).nativeElement;
    let observer: IntersectionObserver | undefined;

    afterNextRender(() => {
      const canAnimate =
        'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!canAnimate || element.getBoundingClientRect().top < window.innerHeight) return;

      element.dataset['reveal'] = this.wsReveal() || 'up';
      element.style.setProperty('--ws-reveal-delay', `${Math.min(this.revealIndex() * 80, MAX_DELAY_MS)}ms`);
      element.classList.add('is-pending');
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          element.classList.remove('is-pending');
          observer?.disconnect();
        },
        // El margen superior enorme cuenta como visible todo lo que ya quedó arriba: si el visitante
        // salta por encima de un bloque (scroll rápido, ancla, volver atrás), no queda oculto.
        { rootMargin: '100000px 0px -10% 0px' },
      );
      observer.observe(element);
    });

    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}
