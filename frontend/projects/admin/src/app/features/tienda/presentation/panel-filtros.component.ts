import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Trazos de los íconos de los botones (24 × 24, trazo de 1.8, como los del menú lateral). */
const ICONOS = {
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  limpiar:
    'M7 21l-4.3-4.3a2.4 2.4 0 0 1 0-3.4l9.6-9.6a2.4 2.4 0 0 1 3.4 0l5.6 5.6a2.4 2.4 0 0 1 0 3.4L13 21M7 21h14M5 11l9 9',
  agregar: 'M12 5v14M5 12h14',
} as const;

/**
 * Panel de filtros de un listado del Admin (feature 008): los campos los proyecta la página, que los liga a su
 * borrador (por ejemplo, con `[formGroup]` en el propio `ws-filter-panel`). «Buscar» envía el formulario, también
 * con Intro; «Limpiar» solo avisa a la página, que vacía el borrador sin buscar. El error de la búsqueda se muestra
 * junto al panel.
 *
 * Lote 11 (ADR-0021, PBI-0171; Daniel, 2026-11-20): los botones van a la derecha, en este orden y con su ícono:
 * «Buscar» (lupa), «Limpiar» (borrador; su nombre accesible sigue siendo «Limpiar filtros») y, en los listados con
 * alta, «Agregar» (más). «Agregar» lleva a `rutaAgregar` si el registro tiene su propia interfaz; si no, avisa a la
 * página (`agregar`), que abre su formulario de alta. Sin `agregarQue`, no hay «Agregar».
 */
@Component({
  selector: 'ws-filter-panel',
  imports: [NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form class="admin-card p-5" role="search" [attr.aria-label]="etiqueta()" (submit)="enviar($event)">
      <div class="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <ng-content />
      </div>
      <div class="mt-2 flex flex-wrap justify-end gap-3">
        <button
          class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-40"
          type="submit"
          [disabled]="buscando()"
        >
          <ng-container *ngTemplateOutlet="icono; context: { $implicit: iconos.buscar }" />
          {{ buscando() ? 'Buscando…' : 'Buscar' }}
        </button>
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-medium"
          type="button"
          (click)="limpiar.emit()"
        >
          <ng-container *ngTemplateOutlet="icono; context: { $implicit: iconos.limpiar }" />
          Limpiar
          <span class="sr-only">filtros</span>
        </button>
        @if (agregarQue(); as que) {
          @if (rutaAgregar(); as ruta) {
            <a
              class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
              [routerLink]="ruta"
              queryParamsHandling="preserve"
            >
              <ng-container *ngTemplateOutlet="icono; context: { $implicit: iconos.agregar }" />
              Agregar
              <span class="sr-only">{{ que }}</span>
            </a>
          } @else {
            <button
              class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
              type="button"
              (click)="agregar.emit()"
            >
              <ng-container *ngTemplateOutlet="icono; context: { $implicit: iconos.agregar }" />
              Agregar
              <span class="sr-only">{{ que }}</span>
            </button>
          }
        }
      </div>
    </form>
    <ng-template #icono let-trazo>
      <svg
        class="h-[18px] w-[18px] shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path [attr.d]="trazo" />
      </svg>
    </ng-template>
    @if (error(); as mensaje) {
      <p
        class="mt-3 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
        role="alert"
      >
        {{ mensaje }}
      </p>
    }
  `,
})
export class PanelFiltrosComponent {
  protected readonly iconos = ICONOS;
  /** Nombre accesible del formulario de búsqueda, por ejemplo «Filtros de productos». */
  readonly etiqueta = input.required<string>();
  /** Mientras la página consulta los datos actuales: «Buscando…» y el botón deshabilitado. */
  readonly buscando = input(false);
  /** Motivo por el que falló la última búsqueda; `null` si no hay error. */
  readonly error = input<string | null>(null);
  /** Qué agrega «Agregar» (p. ej. «producto»; su nombre accesible es «Agregar producto»); sin él, no hay botón. */
  readonly agregarQue = input<string | null>(null);
  /** Ruta de la interfaz de registro propia (p. ej. `/productos/nuevo`); sin ella, «Agregar» emite `agregar`. */
  readonly rutaAgregar = input<string | null>(null);
  readonly buscar = output<void>();
  readonly limpiar = output<void>();
  readonly agregar = output<void>();

  protected enviar(evento: Event): void {
    evento.preventDefault();
    if (!this.buscando()) this.buscar.emit();
  }
}
