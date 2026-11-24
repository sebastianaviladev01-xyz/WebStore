import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { TiendaFacade } from '../application/tienda.facade';
import { aplanarArbolCategorias } from '../domain/categoria.rules';
import { EstadoFiltro, FILTROS_PRODUCTOS_VACIOS } from '../domain/filtro-catalogo.model';
import {
  filtrarProductos,
  leerFiltrosProductos,
  leerPagina,
  ParametrosUrl,
  parametrosDeFiltrosProductos,
} from '../domain/filtro-catalogo.rules';
import { ELEMENTOS_POR_PAGINA, paginar } from '../domain/listado.rules';
import { SesionFacade } from '../../sesion/application/sesion.facade';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';

/**
 * Listado de productos (feature 008): panel de filtros debajo del título, la lista a todo el ancho y la paginación.
 * Los filtros aplicados y la página viven en la URL; el panel edita un borrador que «Buscar» aplica después de traer
 * los datos actuales. El registro se abre en `/productos/nuevo` y `/productos/:id` (`RegistroProductoPage`).
 */
@Component({
  selector: 'ws-products-page',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-ink">Productos</h1>
        <p class="mt-3 text-sm text-muted">
          Ficha comercial, imágenes, características y stock compartido con el storefront.
        </p>
      </div>
    </div>
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de productos"
      [agregarQue]="session.can('products.manage') ? 'producto' : null"
      rutaAgregar="/productos/nuevo"
      [formGroup]="borrador"
      [buscando]="buscando()"
      [error]="errorBusqueda()"
      (buscar)="buscar()"
      (limpiar)="limpiar()"
    >
      <mat-form-field>
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="nombre" />
      </mat-form-field>
      <mat-form-field>
        <mat-label>SKU</mat-label>
        <input matInput formControlName="sku" />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Categoría</mat-label>
        <mat-select formControlName="categoriaId">
          <mat-option value="">Todas</mat-option>
          @for (entry of categoriasEnArbol(); track entry.category.id) {
            <mat-option [value]="entry.category.id">
              {{ indent(entry.depth) }}{{ entry.category.name }}
            </mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Marca</mat-label>
        <mat-select formControlName="marcaId">
          <mat-option value="">Todas</mat-option>
          @for (b of admin.brands(); track b.id) {
            <mat-option [value]="b.id">{{ b.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Estado</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="todos">Todos</mat-option>
          <mat-option value="activos">Activos</mat-option>
          <mat-option value="inactivos">Inactivos</mat-option>
        </mat-select>
      </mat-form-field>
    </ws-filter-panel>
    <section class="admin-card mt-6 overflow-hidden" aria-label="Lista de productos">
      <!--
        PBI-0132: la lista es una tabla con sus encabezados (en el celular, sin la fila de encabezados visible). Lote 25
        (PBI-0219): el SKU va en su propia columna, sin el conteo de características ni de fotos.
      -->
      <div role="table" aria-label="Productos">
        <div
          role="row"
          class="grid grid-cols-[minmax(0,1fr)_160px_120px_110px_90px] gap-x-4 bg-subtle p-4 text-xs font-semibold uppercase text-muted max-md:hidden"
        >
          <span role="columnheader">Producto</span>
          <span role="columnheader">SKU</span>
          <span role="columnheader">Precio</span>
          <span role="columnheader">Stock</span>
          <span role="columnheader"><span class="sr-only">Acciones</span></span>
        </div>
        @for (p of pagina().items; track p.id) {
          <div
            role="row"
            class="grid grid-cols-[minmax(0,1fr)_160px_120px_110px_90px] items-center gap-x-4 border-t border-line p-4 text-sm max-md:grid-cols-[minmax(0,1fr)_auto_auto_auto] max-md:gap-y-2"
          >
            <!--
              PBI-0156: en el celular la fila de encabezados se oculta (conserva la medida de admin-productos-movil);
              cada celda dice su columna solo a un lector de pantalla. En escritorio la dice el encabezado.
            -->
            <div role="cell" class="min-w-0 max-md:col-span-full">
              <span class="sr-only md:hidden">Producto:</span>
              <strong class="block truncate">{{ p.name }}</strong>
            </div>
            <!--
              En el celular, el SKU va en su propia línea debajo del nombre, donde estaba la línea «SKU · características
              · fotos», y no le quita espacio al precio, al stock ni a las acciones.
            -->
            <span
              role="cell"
              class="min-w-0 truncate text-muted max-md:col-span-full max-md:-mt-2 max-md:text-xs"
            >
              <span class="sr-only md:hidden">SKU:</span>
              {{ p.sku }}
            </span>
            <!-- Lote 25 (PBI-0218): con dos decimales, como el resto de los montos del Admin. -->
            <span role="cell" class="max-md:col-start-2">
              <span class="sr-only md:hidden">Precio:</span>
              {{ p.price | currency: 'PEN' : 'symbol' : '1.2-2' }}
            </span>
            <span role="cell" [class.text-danger]="p.stock === 0" class="font-semibold">
              <span class="font-normal text-muted md:hidden">Stock&nbsp;</span>
              <span>{{ p.stock }}</span>
            </span>
            <div role="cell" class="flex gap-2">
              <!-- inline-flex items-center: como enlace, centra el texto en la altura de «Eliminar» igual que el botón de antes. -->
              <a
                class="inline-flex items-center font-semibold text-link"
                [routerLink]="['/productos', p.id]"
                queryParamsHandling="preserve"
                [attr.aria-label]="'Editar producto ' + p.name"
              >
                Editar
              </a>
              @if (session.can('products.delete')) {
                <button
                  class="min-h-10 font-semibold text-danger"
                  [attr.aria-label]="'Eliminar producto ' + p.name"
                  (click)="remove(p.id)"
                >
                  Eliminar
                </button>
              }
            </div>
          </div>
        }
      </div>
      @if (!pagina().items.length) {
        <p class="border-t border-line p-10 text-center text-sm text-muted">
          {{ admin.products().length ? 'Ningún producto cumple los filtros.' : 'Todavía no hay productos.' }}
        </p>
      }
      <ws-pagination [pagina]="pagina()" etiqueta="Páginas de productos" (cambiar)="irAPagina($event)" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly session = inject(SesionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** Parámetros de consulta de la URL; con un parámetro repetido, el primero. */
  private readonly parametros = toSignal(
    this.route.queryParamMap.pipe(
      map((mapa): ParametrosUrl =>
        Object.fromEntries(mapa.keys.map((clave) => [clave, mapa.get(clave) ?? undefined])),
      ),
    ),
    { requireSync: true },
  );
  /** Filtros de la última búsqueda, los de la URL. */
  protected readonly aplicados = computed(() => leerFiltrosProductos(this.parametros()));
  protected readonly resultados = computed(() =>
    filtrarProductos(this.admin.products(), this.admin.categories(), this.aplicados()),
  );
  protected readonly pagina = computed(() =>
    paginar(this.resultados(), leerPagina(this.parametros()), ELEMENTOS_POR_PAGINA),
  );
  protected readonly categoriasEnArbol = computed(() => aplanarArbolCategorias(this.admin.categories()));
  /** Lo que se escribe en el panel; se aplica con «Buscar». */
  protected readonly borrador = new FormGroup({
    nombre: new FormControl('', { nonNullable: true }),
    sku: new FormControl('', { nonNullable: true }),
    categoriaId: new FormControl('', { nonNullable: true }),
    marcaId: new FormControl('', { nonNullable: true }),
    estado: new FormControl<EstadoFiltro>('todos', { nonNullable: true }),
  });
  protected readonly buscando = signal(false);
  protected readonly errorBusqueda = signal<string | null>(null);
  constructor() {
    // El borrador se iguala a los filtros aplicados cada vez que cambia la URL (también con atrás y adelante).
    effect(() => {
      const aplicados = this.aplicados();
      untracked(() => this.borrador.setValue({ ...aplicados }));
    });
  }
  /** Trae los datos actuales y aplica el borrador desde la página 1; si falla, conserva filtros y resultados. */
  protected async buscar() {
    this.buscando.set(true);
    this.errorBusqueda.set(null);
    const actual = await this.admin.refresh();
    this.buscando.set(false);
    if (!actual) {
      this.errorBusqueda.set(
        'No pudimos consultar los productos actuales. La lista muestra la última búsqueda; inténtalo de nuevo.',
      );
      return;
    }
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: parametrosDeFiltrosProductos(this.borrador.getRawValue()),
    });
  }
  /** Vacía todos los filtros del panel de una vez, sin buscar (AC-14). */
  protected limpiar() {
    this.borrador.setValue({ ...FILTROS_PRODUCTOS_VACIOS });
  }
  protected irAPagina(numero: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina: numero > 1 ? numero : null },
      queryParamsHandling: 'merge',
    });
  }
  protected indent(depth: number) {
    return '  '.repeat(depth) + (depth ? '↳ ' : '');
  }
  protected async remove(id: string) {
    if (this.session.can('products.delete') && confirm('¿Eliminar producto?'))
      await this.admin.eliminarProducto(id);
  }
}
