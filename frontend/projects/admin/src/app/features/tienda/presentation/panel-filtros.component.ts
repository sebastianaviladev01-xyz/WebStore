import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconoDirective } from '../../../shared/ui/icono.directive';

/**
 * Panel de filtros de un listado del Admin (feature 008): los campos los proyecta la página, que los liga a su
 * borrador (por ejemplo, con `[formGroup]` en el propio `ws-filter-panel`). «Buscar» envía el formulario, también
 * con Intro; «Limpiar» solo avisa a la página, que vacía el borrador sin buscar. El error de la búsqueda se muestra
 * junto al panel.
 *
 * Lote 11 (ADR-0021, PBI-0171; Daniel, 2026-11-20): los botones van a la derecha, en este orden y con su ícono:
 * «Buscar» (lupa), «Limpiar» (borrador; su nombre accesible sigue siendo «Limpiar filtros») y, en los listados con
 * alta, «Agregar» (más). «Agregar» lleva a `rutaAgregar` si el registro tiene su propia interfaz; si no, avisa a la
 * página (`agregar`), que abre su ventana de registro (lote 21, ADR-0025, PBI-0211). Sin `agregarQue`, no hay «Agregar».
 */
@Component({
  selector: 'ws-filter-panel',
  imports: [IconoDirective, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <!--
      Lote 43 (ADR-0033, PBI-0265): sin tarjeta propia, dentro de la del listado (ws-admin-listado), y en una fila: la
      búsqueda de texto ancha a la izquierda, las listas después y los botones a la derecha. En pantallas estrechas se
      apila. «Buscar» y «Limpiar» van con borde; «Agregar», relleno del principal.
    -->
    <form
      class="flex flex-wrap items-start gap-x-4 gap-y-1"
      role="search"
      [attr.aria-label]="etiqueta()"
      (submit)="enviar($event)"
    >
      <div class="ws-filtros flex min-w-0 flex-[1_1_30rem] flex-wrap gap-x-4 gap-y-3">
        <ng-content />
      </div>
      <div class="ml-auto flex flex-wrap justify-end gap-3 pt-1.5 pb-5">
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-body hover:bg-subtle disabled:opacity-40"
          type="submit"
          [disabled]="buscando()"
        >
          <svg wsAdminIcono="buscar"></svg>
          {{ buscando() ? 'Buscando…' : 'Buscar' }}
        </button>
        <button
          class="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-body hover:bg-subtle"
          type="button"
          (click)="limpiar.emit()"
        >
          <svg wsAdminIcono="limpiar"></svg>
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
              <svg wsAdminIcono="agregar"></svg>
              Agregar
              <span class="sr-only">{{ que }}</span>
            </a>
          } @else {
            <button
              class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
              type="button"
              (click)="agregar.emit()"
            >
              <svg wsAdminIcono="agregar"></svg>
              Agregar
              <span class="sr-only">{{ que }}</span>
            </button>
          }
        }
      </div>
    </form>
    @if (error(); as mensaje) {
      <p
        class="mb-5 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
        role="alert"
      >
        {{ mensaje }}
      </p>
    }
  `,
})
export class PanelFiltrosComponent {
  /** Nombre accesible del formulario de búsqueda, por ejemplo «Filtros de productos». */
  readonly etiqueta = input.required<string>();
  /** Mientras la página consulta los datos actuales: «Buscando…» y el botón deshabilitado. */
  readonly buscando = input(false);
  /** Motivo por el que falló la última búsqueda; `null` si no hay error. */
  readonly error = input<string | null>(null);
  /** Qué agrega «Agregar» (p. ej. «producto»; su nombre accesible es «Agregar producto»); sin él, no hay botón. */
  readonly agregarQue = input<string | null>(null);
  /** Ruta de la interfaz de registro propia (p. ej. `/productos/nuevo`); sin ella, «Agregar» emite `agregar` y la
   * página abre su ventana de registro. */
  readonly rutaAgregar = input<string | null>(null);
  readonly buscar = output<void>();
  readonly limpiar = output<void>();
  readonly agregar = output<void>();

  protected enviar(evento: Event): void {
    evento.preventDefault();
    if (!this.buscando()) this.buscar.emit();
  }
}
