import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TiendaFacade } from '../application/tienda.facade';
import { TablaExportable } from '../domain/exportacion.rules';
import {
  FILTROS_INVENTARIO_VACIOS,
  filtrarInventario,
  leerFiltrosInventario,
  parametrosDeFiltrosInventario,
} from '../domain/filtro-listado.rules';
import { EstadoStock, estadoDeStock, leerStock } from '../domain/inventario.rules';
import { contarPorClave, numeroDeFila, textoDeCantidad, textoDelTotal } from '../domain/listado.rules';
import { filtrosDeListado } from './filtros-de-listado';
import { clasesDeInsignia, FichaDeResumen, Tono } from './insignia';
import { ListadoComponent } from './listado.component';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { NombreIcono } from '../../../shared/ui/iconos';

/**
 * Cada estado del stock: su etiqueta, el tono de su insignia (verde, naranja o rojo) y su ficha del pie, en el orden
 * de las fichas.
 */
const ESTADOS: readonly {
  readonly clave: EstadoStock;
  readonly etiqueta: string;
  readonly tono: Tono;
  readonly icono: NombreIcono;
  readonly singular: string;
  readonly plural: string;
}[] = [
  {
    clave: 'disponible',
    etiqueta: 'Disponible',
    tono: 'exito',
    icono: 'activar',
    singular: 'disponible',
    plural: 'disponibles',
  },
  {
    clave: 'stock-bajo',
    etiqueta: 'Stock bajo',
    tono: 'alerta',
    icono: 'alerta',
    singular: 'con stock bajo',
    plural: 'con stock bajo',
  },
  {
    clave: 'sin-stock',
    etiqueta: 'Sin stock',
    tono: 'peligro',
    icono: 'quitar',
    singular: 'sin stock',
    plural: 'sin stock',
  },
];

/** Lo que se muestra si el estado no estuviera en la lista (no pasa: `estadoDeStock` da uno de los tres). */
const DISPONIBLE = {
  etiqueta: 'Disponible',
  tono: 'exito' as Tono,
};

/**
 * Inventario (lote 07): panel de filtros de la feature 008 (PBI-0139), la lista como tabla con sus encabezados
 * (PBI-0132) y, en el celular, el producto en su propia línea, sin desbordar (PBI-0059).
 *
 * Lote 43 (ADR-0033, PBI-0265): en un solo panel, como la lista de proveedores del SGC, con «N°», el estado del stock
 * como insignia (verde «Disponible», naranja «Stock bajo», rojo «Sin stock»), «Exportar» y el pie con el total y cada
 * estado. No tiene acciones por fila: el stock se escribe en la propia fila.
 */
@Component({
  selector: 'ws-inventory-page',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ListadoComponent,
    PanelFiltrosComponent,
  ],
  template: `
    <ws-admin-listado
      titulo="Inventario"
      descripcion="El stock se mantiene en un único módulo administrativo; el storefront solo lo consulta."
      que="inventario"
      [exportacion]="exportacion"
      [pagina]="pagina()"
      [tamano]="filtros.tamano()"
      [fichas]="fichas()"
      (cambiarPagina)="filtros.irAPagina($event)"
      (cambiarTamano)="filtros.cambiarTamano($event)"
    >
      <ws-filter-panel
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
      <section class="overflow-hidden border-t border-line" aria-label="Lista de inventario">
        <div role="table" aria-label="Inventario">
          <div
            role="row"
            class="grid grid-cols-[2.5rem_minmax(0,1fr)_160px_130px] gap-x-4 bg-subtle px-5 py-3 text-xs font-semibold uppercase text-muted max-md:hidden"
          >
            <span role="columnheader">N°</span>
            <span role="columnheader">Producto</span>
            <span role="columnheader">Stock</span>
            <span role="columnheader">Estado</span>
          </div>
          @for (p of pagina().items; track p.id; let i = $index) {
            <div
              role="row"
              class="grid grid-cols-[2.5rem_minmax(0,1fr)_160px_130px] items-center gap-x-4 border-t border-line px-5 py-3 max-md:grid-cols-[2rem_minmax(0,1fr)_auto] max-md:gap-y-2"
            >
              <!-- PBI-0156: como en Productos, cada celda dice su columna a un lector de pantalla en el celular. -->
              <span role="cell" class="text-sm tabular-nums text-muted max-md:self-start">
                <span class="sr-only md:hidden">N°:</span>
                {{ numero(i) }}
              </span>
              <div role="cell" class="min-w-0 max-md:col-span-2">
                <span class="sr-only md:hidden">Producto:</span>
                <strong class="block break-words">{{ p.name }}</strong>
                <p class="text-xs text-muted">{{ p.sku }}</p>
              </div>
              <div role="cell" class="max-md:col-start-2">
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
              <span role="cell">
                <span class="sr-only md:hidden">Estado:</span>
                <span [class]="insignia(estadoDe(p.stock).tono)">{{ estadoDe(p.stock).etiqueta }}</span>
              </span>
            </div>
          }
        </div>
        @if (!pagina().items.length) {
          <p class="border-t border-line p-10 text-center text-sm text-muted">
            {{
              admin.products().length ? 'Ningún producto cumple los filtros.' : 'Todavía no hay productos.'
            }}
          </p>
        }
      </section>
    </ws-admin-listado>
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
  protected readonly resultados = computed(() =>
    filtrarInventario(this.admin.products(), this.filtros.aplicados()),
  );
  protected readonly pagina = computed(() => this.filtros.paginar(this.resultados()));
  protected readonly insignia = clasesDeInsignia;
  /** El total y cuántos productos hay en cada estado del stock (lote 43, PBI-0265). */
  protected readonly fichas = computed((): FichaDeResumen[] => {
    const resultados = this.resultados();
    const cuentas = contarPorClave(
      resultados,
      (p) => estadoDeStock(p.stock),
      ESTADOS.map((estado) => estado.clave),
    );
    return [
      { texto: textoDelTotal(resultados.length), tono: 'principal', icono: 'lista' },
      ...ESTADOS.map((estado, i) => ({
        texto: textoDeCantidad(cuentas[i]?.cantidad ?? 0, estado.singular, estado.plural),
        tono: estado.tono,
        icono: estado.icono,
      })),
    ];
  });
  protected readonly exportacion = (): TablaExportable => ({
    titulo: 'Inventario',
    columnas: ['N°', 'Producto', 'SKU', 'Stock', 'Estado'],
    filas: this.resultados().map((p, i) => [i + 1, p.name, p.sku, p.stock, this.estadoDe(p.stock).etiqueta]),
  });
  /** Motivo por el que no se guardó el stock escrito en cada fila (PBI-0127), junto a su campo. */
  protected readonly errores = signal<Readonly<Record<string, string>>>({});

  protected numero(indice: number): number {
    return numeroDeFila(this.pagina(), indice);
  }

  protected estadoDe(stock: number) {
    const clave = estadoDeStock(stock);
    return ESTADOS.find((estado) => estado.clave === clave) ?? DISPONIBLE;
  }

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
