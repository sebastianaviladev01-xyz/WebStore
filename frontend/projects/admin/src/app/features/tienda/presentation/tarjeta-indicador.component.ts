import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AyudaComponent } from '../../../shared/ui/ayuda.component';
import { opcionDelPeriodo, PERIODO_POR_OMISION, type Periodo } from '../domain/periodo.rules';
import {
  lecturaDeTendencia,
  Tendencia,
  tendenciaDeVariacion,
  textoDeVariacion,
} from '../domain/resumen.rules';

/**
 * Color de una tarjeta de cifras (lote 45, ADR-0033, PBI-0270): el fondo sólido sale del tema y el texto es el que el
 * tema calcula para ese fondo, como en los botones, así el contraste de ADR-0022 y ADR-0023 se cumple en A, B, C y en
 * los temas propios.
 * - `principal`: `primary` con `on-primary`.
 * - `principal-fuerte`: `primary-strong` con `on-primary` (el texto de los botones principales con el puntero encima).
 * - `acento`: `accent` con `on-accent` y el borde `accent-line`, como todo lo que se rellena con el secundario.
 * - `alerta`: el texto de alerta (`warning`) como fondo con su recuadro (`warning-soft`) como texto: es el par «alerta
 *   sobre su recuadro» que mide el tema, con los colores invertidos.
 */
export type TonoDeTarjeta = 'principal' | 'principal-fuerte' | 'acento' | 'alerta';

const FONDOS: Readonly<Record<TonoDeTarjeta, string>> = {
  principal: 'bg-primary text-on-primary',
  'principal-fuerte': 'bg-primary-strong text-on-primary',
  acento: 'bg-accent text-on-accent ring-1 ring-accent-line ring-inset',
  alerta: 'bg-warning text-warning-soft',
};

/**
 * Tarjeta de un indicador del Dashboard, como las del panel del SGC (lote 45, PBI-0270): fondo de color sólido, la cifra
 * grande a la izquierda y el título en mayúsculas a la derecha; debajo, la variación frente al tramo anterior del
 * periodo (opcional) o una nota, y el enlace «Ver más». La cifra llega ya formateada por la página.
 */
@Component({
  selector: 'ws-admin-tarjeta-indicador',
  imports: [AyudaComponent, RouterLink],
  host: { class: 'block' },
  template: `
    <article
      class="ws-tarjeta-cifra relative flex h-full flex-col rounded-xl p-5 shadow-sm"
      [class]="fondo()"
    >
      <!--
        Lote 13: el título es h3, bajo el h2 «Cifras» que pliega la fila (PBI-0187). Lote 45: va primero en el orden de
        lectura y a la derecha a la vista (flex-row-reverse), con la cifra a la izquierda; la ayuda va junto a él y su
        texto cae dentro de la tarjeta (PBI-0186).
      -->
      <div class="flex flex-1 flex-row-reverse items-start justify-between gap-3">
        <div class="flex items-center gap-1.5 pt-1 text-right">
          <h3 class="text-xs font-semibold tracking-wider uppercase">{{ titulo() }}</h3>
          @if (ayuda(); as ayuda) {
            <ws-admin-ayuda [texto]="ayuda" [etiqueta]="'Qué incluye: ' + titulo()" [sobreColor]="true" />
          }
        </div>
        <p class="min-w-0 text-3xl leading-tight font-semibold tabular-nums xl:text-2xl">{{ valor() }}</p>
      </div>
      @if (tendencia(); as tendencia) {
        <p class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span class="rounded-full px-2 py-0.5 font-semibold tabular-nums ring-1 ring-current">
            <span aria-hidden="true">{{ flecha[tendencia] }}</span>
            <span class="sr-only">{{ lectura(tendencia) }}</span>
            {{ textoVariacion() }}
          </span>
          <span>{{ comparacion() }}</span>
        </p>
      } @else if (nota()) {
        <p class="mt-3 text-xs">{{ nota() }}</p>
      }
      <a
        data-sin-icono="enlace de texto"
        class="mt-4 flex items-center gap-1 border-t border-current/30 pt-3 text-sm font-semibold underline-offset-4 hover:underline"
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
  /** El color de la tarjeta. */
  readonly tono = input<TonoDeTarjeta>('principal');
  /**
   * % entero del periodo frente a su tramo anterior. `null` se muestra «—» (el tramo anterior vale 0); sin valor, la
   * tarjeta no lleva variación.
   */
  readonly variacion = input<number | null>();
  /** El periodo del filtro principal: dice contra qué se compara la variación. */
  readonly periodo = input<Periodo>(PERIODO_POR_OMISION);
  /** Texto bajo la cifra cuando la tarjeta no lleva variación. */
  readonly nota = input<string>();
  /** Texto de la ayuda junto al título (lote 13, PBI-0186: qué suman las ventas). */
  readonly ayuda = input<string>();

  protected readonly flecha: Readonly<Record<Tendencia, string>> = {
    sube: '▲',
    baja: '▼',
    igual: '',
    'sin-dato': '',
  };
  protected readonly fondo = computed(() => FONDOS[this.tono()]);
  protected readonly comparacion = computed(() => opcionDelPeriodo(this.periodo()).comparacion);
  protected readonly tendencia = computed<Tendencia | null>(() => tendenciaDeVariacion(this.variacion()));
  protected readonly textoVariacion = computed(() => textoDeVariacion(this.variacion()));

  protected lectura(tendencia: Tendencia): string {
    return lecturaDeTendencia(tendencia, this.periodo());
  }
}
