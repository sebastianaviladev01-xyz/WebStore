import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TiendaFacade } from '../application/tienda.facade';
import {
  FILTROS_INVENTARIO_VACIOS,
  filtrarInventario,
  leerFiltrosInventario,
  parametrosDeFiltrosInventario,
} from '../domain/filtro-listado.rules';
import { estadoDeStock, leerStock } from '../domain/inventario.rules';
import { filtrosDeListado } from './filtros-de-listado';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';

const ETIQUETA_ESTADO = {
  'sin-stock': 'Sin stock',
  'stock-bajo': 'Stock bajo',
  disponible: 'Disponible',
} as const;

/**
 * Inventario (lote 07): panel de filtros de la feature 008 (PBI-0139), la lista como tabla con sus encabezados
 * (PBI-0132) y, en el celular, el producto en su propia línea, sin desbordar (PBI-0059).
 */
@Component({
  selector: 'ws-inventory-page',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Inventario</h1>
    <p class="mt-3 text-sm text-muted">
      El stock se mantiene en un único módulo administrativo; el storefront solo lo consulta.
    </p>
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de inventario"
      [formGroup]="filtros.borrador"
      [buscando]="filtros.buscando()"
      [error]="filtros.error()"
      (buscar)="filtros.buscar()"
      (limpiar)="filtros.limpiar()"
    >
      <mat-form-field>
        <mat-label>Buscar producto</mat-label>
        <input matInput formControlName="texto" />
        <mat-hint>Nombre o SKU</mat-hint>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Filtrar por stock</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="todos">Todos</mat-option>
          <mat-option value="sin-stock">Sin stock</mat-option>
          <mat-option value="stock-bajo">Stock bajo</mat-option>
          <mat-option value="disponible">Disponible</mat-option>
        </mat-select>
      </mat-form-field>
    </ws-filter-panel>
    <section class="admin-card mt-6 overflow-hidden" aria-label="Lista de inventario">
      <div role="table" aria-label="Inventario">
        <div
          role="row"
          class="grid grid-cols-[1fr_160px_130px] bg-subtle p-4 text-xs font-semibold uppercase text-muted max-md:hidden"
        >
          <span role="columnheader">Producto</span>
          <span role="columnheader">Stock</span>
          <span role="columnheader">Estado</span>
        </div>
        @for (p of pagina().items; track p.id) {
          <div
            role="row"
            class="grid grid-cols-[1fr_160px_130px] items-center border-t border-line p-4 max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-2"
          >
            <!-- PBI-0156: como en Productos, cada celda dice su columna a un lector de pantalla en el celular. -->
            <div role="cell" class="min-w-0 max-md:col-span-full">
              <span class="sr-only md:hidden">Producto:</span>
              <strong class="block break-words">{{ p.name }}</strong>
              <p class="text-xs text-muted">{{ p.sku }}</p>
            </div>
            <div role="cell">
              <span class="sr-only md:hidden">Stock:</span>
              <input
                #stock
                type="number"
                min="0"
                step="1"
                [value]="p.stock"
                class="w-28 rounded-xl border border-line px-3 py-2"
                [attr.aria-label]="'Stock de ' + p.name"
                [attr.aria-invalid]="errores()[p.id] ? true : null"
                [attr.aria-describedby]="errores()[p.id] ? 'stock-error-' + p.id : null"
                (change)="update(p.id, stock.value)"
              />
              @if (errores()[p.id]; as error) {
                <p [id]="'stock-error-' + p.id" class="mt-1 text-xs font-semibold text-danger" role="alert">
                  {{ error }}
                </p>
              }
            </div>
            <span
              role="cell"
              class="text-sm font-semibold"
              [class.text-danger]="estado(p.stock) === 'sin-stock'"
              [class.text-warning]="estado(p.stock) === 'stock-bajo'"
              [class.text-on-primary-soft]="estado(p.stock) === 'disponible'"
            >
              <span class="sr-only md:hidden">Estado:</span>
              {{ etiquetaEstado[estado(p.stock)] }}
            </span>
          </div>
        }
      </div>
      @if (!pagina().items.length) {
        <p class="border-t border-line p-10 text-center text-sm text-muted">
          {{ admin.products().length ? 'Ningún producto cumple los filtros.' : 'Todavía no hay productos.' }}
        </p>
      }
      <ws-pagination
        [pagina]="pagina()"
        etiqueta="Páginas de inventario"
        (cambiar)="filtros.irAPagina($event)"
      />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosInventario,
    escribir: parametrosDeFiltrosInventario,
    vacios: FILTROS_INVENTARIO_VACIOS,
    que: 'los productos',
  });
  protected readonly pagina = computed(() =>
    this.filtros.paginar(filtrarInventario(this.admin.products(), this.filtros.aplicados())),
  );
  protected readonly estado = estadoDeStock;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  /** Motivo por el que no se guardó el stock escrito en cada fila (PBI-0127), junto a su campo. */
  protected readonly errores = signal<Readonly<Record<string, string>>>({});
  /**
   * Guarda solo el stock del producto (PBI-0120): si hubo una venta mientras tanto y la persona también cambió el
   * stock, no lo pisa y avisa. Vacío, decimales o negativos no se guardan (PBI-0127; antes, vacío era 0).
   */
  protected async update(id: string, texto: string) {
    const lectura = leerStock(texto);
    const { [id]: _anterior, ...otros } = this.errores();
    this.errores.set(lectura.valido ? otros : { ...otros, [id]: lectura.mensaje });
    const p = this.admin.products().find((x) => x.id === id);
    if (!lectura.valido || !p || lectura.stock === p.stock) return;
    await this.admin.guardarProducto(p, { ...p, stock: lectura.stock });
  }
}
