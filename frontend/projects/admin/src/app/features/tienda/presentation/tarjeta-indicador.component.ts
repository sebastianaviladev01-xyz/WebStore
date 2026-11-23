import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AyudaComponent } from '../../../shared/ui/ayuda.component';
import {
  lecturaDeTendencia,
  Tendencia,
  tendenciaDeVariacion,
  textoDeVariacion,
} from '../domain/resumen.rules';

/**
 * Tarjeta de un indicador del Dashboard: título, cifra, variación del mes (opcional), ayuda (opcional) y enlace
 * «Ver más». La cifra llega ya formateada por la página.
 */
@Component({
  selector: 'ws-admin-tarjeta-indicador',
  imports: [AyudaComponent, RouterLink],
  host: { class: 'block' },
  template: `
    <article class="admin-card flex h-full flex-col p-5">
      <div class="flex-1">
        @if (ayuda(); as ayuda) {
          <!--
            Lote 13: el título es h3, bajo el h2 «Cifras» que pliega la fila (PBI-0187); la ayuda va junto a él y su
            texto cae dentro de la tarjeta (PBI-0186).
          -->
          <div class="flex items-center gap-1.5">
            <h3 class="text-sm font-medium text-muted">{{ titulo() }}</h3>
            <ws-admin-ayuda [texto]="ayuda" [etiqueta]="'Qué incluye: ' + titulo()" />
          </div>
        } @else {
          <h3 class="text-sm font-medium text-muted">{{ titulo() }}</h3>
        }
        <p
          class="mt-2 text-3xl font-semibold tabular-nums"
          [class.text-ink]="!alerta()"
          [class.text-warning]="alerta()"
        >
          {{ valor() }}
        </p>
        @if (tendencia(); as tendencia) {
          <p class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span class="rounded-full px-2 py-0.5 font-semibold tabular-nums" [class]="insignia[tendencia]">
              <span aria-hidden="true">{{ flecha[tendencia] }}</span>
              <span class="sr-only">{{ lectura(tendencia) }}</span>
              {{ textoVariacion() }}
            </span>
            <span>frente al mismo tramo del mes anterior</span>
          </p>
        } @else if (nota()) {
          <p class="mt-2 text-xs text-muted">{{ nota() }}</p>
        }
      </div>
      <a
        class="mt-4 flex items-center gap-1 border-t border-line pt-3 text-sm font-medium text-link hover:text-on-primary-soft"
        [routerLink]="enlace()"
      >
        Ver más
        <span class="sr-only">({{ titulo() }})</span>
        <span aria-hidden="true">→</span>
      </a>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaIndicadorComponent {
  readonly titulo = input.required<string>();
  readonly valor = input.required<string>();
  readonly enlace = input.required<string>();
  /**
   * % entero del mes en curso frente al mismo tramo del mes anterior. `null` se muestra «—» (el tramo anterior vale 0);
   * sin valor, la tarjeta no lleva variación.
   */
  readonly variacion = input<number | null>();
  /** Texto bajo la cifra cuando la tarjeta no lleva variación. */
  readonly nota = input<string>();
  /** Texto de la ayuda junto al título (lote 13, PBI-0186: qué suman las ventas). */
  readonly ayuda = input<string>();
  /** Muestra la cifra en el color de alerta (stock bajo). */
  readonly alerta = input(false);

  protected readonly insignia: Readonly<Record<Tendencia, string>> = {
    sube: 'bg-primary-soft text-on-primary-soft',
    baja: 'bg-danger-soft text-danger',
    igual: 'bg-soft text-body',
    'sin-dato': 'bg-soft text-muted',
  };
  protected readonly flecha: Readonly<Record<Tendencia, string>> = {
    sube: '▲',
    baja: '▼',
    igual: '',
    'sin-dato': '',
  };
  protected readonly lectura = lecturaDeTendencia;
  protected readonly tendencia = computed<Tendencia | null>(() => tendenciaDeVariacion(this.variacion()));
  protected readonly textoVariacion = computed(() => textoDeVariacion(this.variacion()));
}
