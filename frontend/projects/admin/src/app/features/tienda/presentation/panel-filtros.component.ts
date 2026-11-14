import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Panel de filtros de un listado del Admin (feature 008): los campos los proyecta la página, que los liga a su
 * borrador (por ejemplo, con `[formGroup]` en el propio `ws-filter-panel`). «Buscar» envía el formulario, también
 * con Intro; «Limpiar filtros» solo avisa a la página, que vacía el borrador sin buscar. El error de la búsqueda se
 * muestra junto al panel.
 */
@Component({
  selector: 'ws-filter-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <form class="admin-card p-5" role="search" [attr.aria-label]="etiqueta()" (submit)="enviar($event)">
      <div class="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
        <ng-content />
      </div>
      <div class="mt-2 flex flex-wrap gap-3">
        <button
          class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-40"
          type="submit"
          [disabled]="buscando()"
        >
          {{ buscando() ? 'Buscando…' : 'Buscar' }}
        </button>
        <button
          class="rounded-lg border border-line px-5 py-2.5 text-sm font-medium"
          type="button"
          (click)="limpiar.emit()"
        >
          Limpiar filtros
        </button>
      </div>
    </form>
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
  /** Nombre accesible del formulario de búsqueda, por ejemplo «Filtros de productos». */
  readonly etiqueta = input.required<string>();
  /** Mientras la página consulta los datos actuales: «Buscando…» y el botón deshabilitado. */
  readonly buscando = input(false);
  /** Motivo por el que falló la última búsqueda; `null` si no hay error. */
  readonly error = input<string | null>(null);
  readonly buscar = output<void>();
  readonly limpiar = output<void>();

  protected enviar(evento: Event): void {
    evento.preventDefault();
    if (!this.buscando()) this.buscar.emit();
  }
}
