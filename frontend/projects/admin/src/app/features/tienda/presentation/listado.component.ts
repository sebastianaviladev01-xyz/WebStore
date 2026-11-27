import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';

import { TablaExportable } from '../domain/exportacion.rules';
import { Pagina, TamanoDePagina } from '../domain/listado.rules';
import { descargarCsv, imprimirTabla } from './exportar-listado';
import { clasesDelPunto, FichaDeResumen } from './insignia';
import { PaginacionComponent } from './paginacion.component';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

/**
 * Un listado del backoffice en un solo panel (lote 43, ADR-0033, PBI-0265), como la lista de proveedores del SGC que
 * mandó Daniel: «El panel está demasiado pegado al contenido y aquí la tabla está suelta». Una tarjeta con:
 * - arriba a la izquierda, el título (`h1` con el ícono de su módulo, PBI-0243) y su descripción; arriba a la derecha,
 *   «Exportar», un menú con «CSV (Excel)» e «Imprimir o PDF», que exportan las filas filtradas de todas las páginas con
 *   las columnas de la tabla (`exportacion`, que la página calcula solo al exportar);
 * - los filtros en una fila (`ws-filter-panel`, proyectado);
 * - la tabla de la página y sus avisos (el resto del contenido proyectado);
 * - al pie, a la izquierda, las fichas del resumen (un punto de color, su ícono y su cifra: el total y cada estado) y, a
 *   la derecha, la paginación (`ws-pagination`).
 */
@Component({
  selector: 'ws-admin-listado',
  imports: [IconoDirective, TituloPaginaDirective, MatMenuModule, PaginacionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="admin-card">
      <div class="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div class="min-w-0">
          <h1 wsAdminTitulo tabindex="-1" class="text-3xl font-semibold tracking-tight text-ink">
            {{ titulo() }}
          </h1>
          @if (descripcion(); as texto) {
            <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">{{ texto }}</p>
          }
        </div>
        @if (exportacion()) {
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-body hover:bg-subtle"
            [matMenuTriggerFor]="menuExportar"
          >
            <svg wsAdminIcono="exportar"></svg>
            Exportar
            <svg wsAdminIcono="desplegar"></svg>
          </button>
          <mat-menu #menuExportar="matMenu" xPosition="before">
            <button mat-menu-item type="button" (click)="csv()">
              <span class="inline-flex items-center gap-2">
                <svg wsAdminIcono="hojaDeCalculo"></svg>
                CSV (Excel)
              </span>
            </button>
            <button mat-menu-item type="button" (click)="imprimir()">
              <span class="inline-flex items-center gap-2">
                <svg wsAdminIcono="imprimir"></svg>
                Imprimir o PDF
              </span>
            </button>
          </mat-menu>
        }
      </div>
      <div class="border-t border-line px-5 pt-5 sm:px-6">
        <ng-content select="ws-filter-panel" />
      </div>
      <ng-content />
      <div
        class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line px-5 py-4 sm:px-6"
      >
        <ul class="flex flex-wrap gap-2" [attr.aria-label]="'Resumen de ' + que()">
          @for (ficha of fichas(); track ficha.texto) {
            <li
              class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-body"
            >
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                [class]="punto(ficha.tono)"
                aria-hidden="true"
              ></span>
              <svg [wsAdminIcono]="ficha.icono"></svg>
              <span class="tabular-nums">{{ ficha.texto }}</span>
            </li>
          }
        </ul>
        <ws-pagination
          class="ml-auto"
          [pagina]="pagina()"
          [tamano]="tamano()"
          [etiqueta]="'Páginas de ' + que()"
          (cambiar)="cambiarPagina.emit($event)"
          (cambiarTamano)="cambiarTamano.emit($event)"
        />
      </div>
    </div>
  `,
})
export class ListadoComponent {
  private readonly documento = inject(DOCUMENT);
  readonly titulo = input.required<string>();
  readonly descripcion = input<string | null>(null);
  /** De qué es el listado, en plural y con minúscula: «productos» (resumen y nombre de la paginación). */
  readonly que = input.required<string>();
  /** Lo que exporta «Exportar»: se llama al elegir una opción. Sin ella, no hay «Exportar». */
  readonly exportacion = input<(() => TablaExportable) | null>(null);
  readonly pagina = input.required<Pagina<unknown>>();
  readonly tamano = input.required<TamanoDePagina>();
  readonly fichas = input.required<readonly FichaDeResumen[]>();
  readonly cambiarPagina = output<number>();
  readonly cambiarTamano = output<TamanoDePagina>();

  protected readonly punto = clasesDelPunto;

  protected csv(): void {
    const tabla = this.exportacion()?.();
    if (tabla) descargarCsv(tabla, this.documento);
  }

  protected imprimir(): void {
    const tabla = this.exportacion()?.();
    if (tabla) imprimirTabla(tabla, this.documento);
  }
}
