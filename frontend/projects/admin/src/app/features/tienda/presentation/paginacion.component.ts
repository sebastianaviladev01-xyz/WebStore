import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Pagina, rangoDePagina, TAMANOS_DE_PAGINA, TamanoDePagina } from '../domain/listado.rules';
import { IconoDirective } from '../../../shared/ui/icono.directive';
import { NombreIcono } from '../../../shared/ui/iconos';

let siguienteId = 0;

/**
 * Paginación del pie de un listado del Admin. Lote 43 (ADR-0033, PBI-0265), como la lista de proveedores del SGC:
 * «Elementos por página» (10, 25 o 50), el rango «1 - 8 de 8» y los botones de primera, anterior, siguiente y última
 * página, de solo ícono, con su nombre accesible y su descripción emergente. Se ve siempre, también con una sola página,
 * porque el tamaño se puede elegir. La página decide qué hacer con el número o el tamaño pedidos (los lleva a la URL).
 * Antes del lote 43: «Anterior», «Página N de M» y «Siguiente», de 25 en 25 (feature 008).
 */
@Component({
  selector: 'ws-pagination',
  imports: [IconoDirective, MatSelectModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <nav
      class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm"
      [attr.aria-label]="etiqueta()"
    >
      <span class="inline-flex items-center gap-2">
        <span [id]="idTamano" class="whitespace-nowrap text-muted">Elementos por página</span>
        <mat-select
          class="ws-tamano-de-pagina"
          [aria-labelledby]="idTamano"
          [value]="tamano()"
          (selectionChange)="cambiarTamano.emit($event.value)"
        >
          @for (opcion of tamanos; track opcion) {
            <mat-option [value]="opcion">{{ opcion }}</mat-option>
          }
        </mat-select>
      </span>
      <span class="tabular-nums text-body" aria-live="polite">{{ rango() }}</span>
      <span class="flex gap-1">
        @for (boton of botones(); track boton.nombre) {
          <button
            type="button"
            class="inline-grid h-9 w-9 place-items-center rounded-lg border border-line-strong bg-surface text-body hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            [attr.aria-label]="boton.nombre"
            [matTooltip]="boton.nombre"
            [disabled]="boton.deshabilitado"
            (click)="cambiar.emit(boton.destino)"
          >
            <svg [wsAdminIcono]="boton.icono"></svg>
          </button>
        }
      </span>
    </nav>
  `,
})
export class PaginacionComponent {
  readonly pagina = input.required<Pagina<unknown>>();
  /** Elementos por página que se están mostrando. */
  readonly tamano = input.required<TamanoDePagina>();
  /** Nombre accesible de la barra, por ejemplo «Páginas de productos». */
  readonly etiqueta = input.required<string>();
  /** Número de la página pedida. */
  readonly cambiar = output<number>();
  /** Tamaño de página elegido en «Elementos por página». */
  readonly cambiarTamano = output<TamanoDePagina>();

  protected readonly idTamano = `ws-tamano-de-pagina-${siguienteId++}`;
  protected readonly tamanos = TAMANOS_DE_PAGINA;
  protected readonly rango = computed(() => rangoDePagina(this.pagina()));
  protected readonly botones = computed(() => {
    const { page, pages } = this.pagina();
    const boton = (nombre: string, icono: NombreIcono, destino: number, deshabilitado: boolean) => ({
      nombre,
      icono,
      destino,
      deshabilitado,
    });
    return [
      boton('Primera página', 'primera', 1, page === 1),
      boton('Página anterior', 'anterior', page - 1, page === 1),
      boton('Página siguiente', 'siguiente', page + 1, page === pages),
      boton('Última página', 'ultima', pages, page === pages),
    ];
  });
}
