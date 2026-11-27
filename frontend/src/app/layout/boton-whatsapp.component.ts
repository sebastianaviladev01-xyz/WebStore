import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { ContenidoFacade } from '../features/contenido/application/contenido.facade';
import { enlaceDeWhatsapp, muestraWhatsappEn } from '../features/contenido/domain/whatsapp.rules';

/**
 * Las barras fijas al pie de la ventana que el botón no debe tapar: hoy, la de «Agregar al carrito» de la ficha a
 * 375 px (`.ws-pdp-actions`, pegada abajo mientras se lee el producto).
 */
const BARRAS_INFERIORES = '.ws-pdp-actions';

/**
 * Acceso a WhatsApp de la tienda (lote 49, ADR-0035, PBI-0241; decidido por Sebastián Avila el 2026-11-27): un botón
 * flotante, abajo a la derecha, en la esquina donde estuvo la tuerca de temas, que abre `wa.me` en otra pestaña. Sin
 * número no se muestra, y tampoco en el checkout. Queda por debajo del menú lateral, de los filtros del celular y de
 * los diálogos (z-index 30, como la tuerca), y sube sobre una barra fija al pie de la ventana para no taparla.
 */
@Component({
  selector: 'ws-store-whatsapp',
  template: `
    @if (enlace(); as href) {
      <a
        class="ws-whatsapp"
        [href]="href"
        target="_blank"
        rel="noopener noreferrer"
        [style.--ws-whatsapp-elevacion.px]="elevacion()"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" class="ws-whatsapp-icono">
          <path
            class="ws-whatsapp-globo"
            d="M12 3.2a8.8 8.8 0 0 0-7.55 13.31L3.2 20.8l4.4-1.18A8.8 8.8 0 1 0 12 3.2Z"
          />
          <path
            class="ws-whatsapp-auricular"
            d="M9.2 7.7c-.22-.5-.46-.5-.67-.51h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.07 3.31 5.1 4.5 2.52.99 3.04.8 3.58.74.55-.05 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35l-1.95-.96c-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61l.45-.52c.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53l-.9-2.18Z"
          />
        </svg>
        <span class="sr-only">Escríbenos por WhatsApp (se abre en otra pestaña)</span>
      </a>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotonWhatsappComponent {
  private readonly content = inject(ContenidoFacade);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** El enlace `wa.me`, o `null` si no hay número o la página es el checkout. */
  protected readonly enlace = computed(() => {
    const ajustes = this.content.settings();
    if (!muestraWhatsappEn(this.url())) return null;
    return enlaceDeWhatsapp(ajustes.whatsappNumber, ajustes.whatsappMessage);
  });

  /** Cuánto sube el botón sobre una barra fija al pie de la ventana (0 si no hay ninguna a la vista). */
  protected readonly elevacion = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ventana = this.document.defaultView;
      if (!ventana) return;
      let pendiente = 0;
      const medir = () => {
        pendiente = 0;
        let elevacion = 0;
        for (const barra of Array.from(this.document.querySelectorAll(BARRAS_INFERIORES))) {
          const caja = barra.getBoundingClientRect();
          const pegadaAbajo =
            caja.height > 0 && caja.top < ventana.innerHeight && caja.bottom >= ventana.innerHeight - 1;
          if (pegadaAbajo) elevacion = Math.max(elevacion, Math.ceil(ventana.innerHeight - caja.top));
        }
        if (elevacion !== this.elevacion()) this.elevacion.set(elevacion);
      };
      const programar = () => {
        if (!pendiente) pendiente = ventana.requestAnimationFrame(medir);
      };
      ventana.addEventListener('scroll', programar, { passive: true });
      ventana.addEventListener('resize', programar);
      // La ficha carga el producto después de navegar: el alto de la página cambia sin desplazarse.
      const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(programar);
      observador?.observe(this.document.body);
      programar();
      destroyRef.onDestroy(() => {
        ventana.removeEventListener('scroll', programar);
        ventana.removeEventListener('resize', programar);
        observador?.disconnect();
        if (pendiente) ventana.cancelAnimationFrame(pendiente);
      });
    });
  }
}
