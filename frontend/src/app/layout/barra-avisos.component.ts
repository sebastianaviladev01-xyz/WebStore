import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink, UrlTree } from '@angular/router';

import {
  avisoAnterior,
  avisoSiguiente,
  avisosSinVencer,
  AvisoVisible,
  INTERVALO_DE_AVISOS_MS,
} from '../features/contenido/domain/aviso.rules';

/** Con «reducir movimiento», los avisos no pasan solos: se cambian con las flechas. */
const prefiereMenosMovimiento = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Avisos de la barra superior (lote 15, ADR-0021; PBI-0175, confirmado por Sebastián Avila): ocupan el lugar del
 * mensaje superior. Uno solo queda fijo. Con varios, pasan cada 6 s y se detienen al pasar el ratón o el foco por la
 * barra; las flechas cambian de aviso y el botón de pausa los detiene (WCAG 2.2.2). Un enlace a otra web se abre en
 * otra pestaña.
 */
@Component({
  selector: 'ws-store-announcements',
  imports: [RouterLink],
  template: `
    @if (actual(); as aviso) {
      <div
        class="ws-announcements flex min-w-0 items-center justify-center gap-1.5"
        role="region"
        aria-label="Avisos de la tienda"
        (mouseenter)="enfocado.set(true)"
        (mouseleave)="enfocado.set(false)"
        (focusin)="enfocado.set(true)"
        (focusout)="enfocado.set(false)"
      >
        @if (varios()) {
          <button type="button" [class]="control" aria-label="Aviso anterior" (click)="anterior()">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="h-3.5 w-3.5 fill-none stroke-current"
              stroke-width="2.2"
            >
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
        }
        <p class="min-w-0" [attr.aria-live]="varios() && !detenido() ? 'off' : 'polite'">
          @if (aviso.enlace?.tipo === 'externo') {
            <a [href]="aviso.enlace!.url" class="hover:underline" target="_blank" rel="noopener noreferrer">
              {{ aviso.texto }}
              <span class="sr-only">(se abre en otra pestaña)</span>
            </a>
          } @else if (aviso.enlace?.tipo === 'ruta') {
            <a [routerLink]="ruta(aviso.enlace!.url)" class="hover:underline">{{ aviso.texto }}</a>
          } @else {
            {{ aviso.texto }}
          }
        </p>
        @if (varios()) {
          <button type="button" [class]="control" aria-label="Aviso siguiente" (click)="siguiente()">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="h-3.5 w-3.5 fill-none stroke-current"
              stroke-width="2.2"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
          <button
            type="button"
            [class]="control"
            [attr.aria-label]="pausado() ? 'Reanudar avisos' : 'Pausar avisos'"
            (click)="pausado.set(!pausado())"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-3 w-3 fill-current">
              @if (pausado()) {
                <path d="M8 5v14l11-7z" />
              } @else {
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
              }
            </svg>
          </button>
        }
      </div>
    }
  `,
  host: { class: 'min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraAvisosComponent {
  readonly avisos = input.required<readonly AvisoVisible[]>();
  private readonly router = inject(Router);
  protected readonly control =
    'grid h-6 w-6 shrink-0 place-items-center rounded-full opacity-80 hover:opacity-100 focus-visible:opacity-100';
  protected readonly indice = signal(0);
  /** La persona los detuvo con el botón, o prefiere menos movimiento. */
  protected readonly pausado = signal(prefiereMenosMovimiento());
  /** El ratón o el foco están en la barra. */
  protected readonly enfocado = signal(false);
  /** Lote 30 (PBI-0244): el instante con el que se quitan los avisos vencidos; avanza con el temporizador de la barra. */
  private readonly ahora = signal(Date.now());
  /** Los avisos que la barra muestra: los que llegaron del BFF, sin los que vencieron con la página abierta. */
  protected readonly vigentes = computed(() => avisosSinVencer(this.avisos(), this.ahora()));
  protected readonly varios = computed(() => this.vigentes().length > 1);
  protected readonly detenido = computed(() => this.pausado() || this.enfocado());
  protected readonly actual = computed<AvisoVisible | null>(() => {
    const avisos = this.vigentes();
    return avisos.length ? avisos[Math.min(this.indice(), avisos.length - 1)] : null;
  });

  constructor() {
    // Si llega otro contenido con menos avisos, o uno venció, se vuelve al primero.
    effect(() => {
      if (this.indice() >= this.vigentes().length) this.indice.set(0);
    });
    // El mismo temporizador que pasa los avisos recalcula cuáles siguen vigentes (lote 30, PBI-0244).
    const temporizador = setInterval(() => {
      this.ahora.set(Date.now());
      if (this.varios() && !this.detenido()) this.siguiente();
    }, INTERVALO_DE_AVISOS_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(temporizador));
  }

  protected siguiente(): void {
    this.indice.update((indice) => avisoSiguiente(indice, this.vigentes().length));
  }

  protected anterior(): void {
    this.indice.update((indice) => avisoAnterior(indice, this.vigentes().length));
  }

  protected ruta(url: string): UrlTree {
    return this.router.parseUrl(url);
  }
}
