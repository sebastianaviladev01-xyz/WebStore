import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Pagina } from '../domain/listado.rules';

/**
 * Barra de páginas de un listado del Admin (feature 008), la misma de Tarifas de envío: «Anterior», «Página N de M»
 * y «Siguiente». Solo aparece si hay más de una página; la página decide qué hacer con el número pedido.
 */
@Component({
  selector: 'ws-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (pagina().pages > 1) {
      <nav
        class="flex items-center justify-between gap-3 border-t border-line p-4 text-sm"
        [attr.aria-label]="etiqueta()"
      >
        <button
          type="button"
          class="rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-40"
          [disabled]="pagina().page === 1"
          (click)="cambiar.emit(pagina().page - 1)"
        >
          Anterior
        </button>
        <span class="tabular-nums text-muted">Página {{ pagina().page }} de {{ pagina().pages }}</span>
        <button
          type="button"
          class="rounded-lg border border-line px-4 py-2 font-medium disabled:opacity-40"
          [disabled]="pagina().page === pagina().pages"
          (click)="cambiar.emit(pagina().page + 1)"
        >
          Siguiente
        </button>
      </nav>
    }
  `,
})
export class PaginacionComponent {
  readonly pagina = input.required<Pagina<unknown>>();
  /** Nombre accesible de la barra, por ejemplo «Páginas de productos». */
  readonly etiqueta = input.required<string>();
  /** Número de la página pedida. */
  readonly cambiar = output<number>();
}
