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
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { TiendaFacade } from '../application/tienda.facade';
import { TablaExportable } from '../domain/exportacion.rules';
import { Producto } from '../domain/tienda.model';
import { EstadoFiltro, FILTROS_PRODUCTOS_VACIOS } from '../domain/filtro-catalogo.model';
import {
  filtrarProductos,
  leerFiltrosProductos,
  ParametrosUrl,
  parametrosDeFiltrosProductos,
} from '../domain/filtro-catalogo.rules';
import { contarPorClave, numeroDeFila, textoDeCantidad, textoDelTotal } from '../domain/listado.rules';
import { SesionFacade } from '../../sesion/application/sesion.facade';
import { CLASES_ACCION, CLASES_ACCION_ELIMINAR, clasesDeInsignia, FichaDeResumen } from './insignia';
import { ListadoComponent } from './listado.component';
import { paginacionDeLaUrl } from './paginacion-de-la-url';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { SelectorCategoriaComponent } from './selector-categoria.component';
import { confirmarEliminacion } from '../../../shared/ui/confirmacion.dialog';
import { focoTrasEliminar } from '../../../shared/ui/foco-tras-eliminar';
import { IconoDirective } from '../../../shared/ui/icono.directive';

/**
 * Listado de productos (feature 008): los filtros aplicados y la página viven en la URL; el panel edita un borrador que
 * «Buscar» aplica después de traer los datos actuales. El registro se abre en `/productos/nuevo` y `/productos/:id`
 * (`RegistroProductoPage`).
 *
 * Lote 43 (ADR-0033, PBI-0265): en un solo panel (`ws-admin-listado`), como la lista de proveedores del SGC, con la
 * columna «N°», el estado como insignia (antes no se veía en la tabla), las acciones de solo ícono, «Exportar» y el pie
 * con el total, los activos y los inactivos y la paginación de 10, 25 o 50.
 */
@Component({
  selector: 'ws-products-page',
  imports: [
    IconoDirective,
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ListadoComponent,
    PanelFiltrosComponent,
    SelectorCategoriaComponent,
  ],
  template: `
    <ws-admin-listado
      titulo="Productos"
      descripcion="Ficha comercial, imágenes, características y stock compartido con el storefront."
      que="productos"
      [exportacion]="exportacion"
      [pagina]="pagina()"
      [tamano]="paginacion.tamano()"
      [fichas]="fichas()"
      (cambiarPagina)="paginacion.irAPagina($event)"
      (cambiarTamano)="paginacion.cambiarTamano($event)"
    >
      <ws-filter-panel
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
          <input matInput formControlName="nombre" placeholder="Buscar por nombre…" />
        </mat-form-field>
        <mat-form-field>
          <mat-label>SKU</mat-label>
          <input matInput formControlName="sku" />
        </mat-form-field>
        <!-- Lote 29 (ADR-0027, PBI-0238; confirmado por Sebastián Avila): la categoría se elige con búsqueda en todos los niveles del árbol. -->
        <ws-admin-selector-categoria
          [control]="borrador.controls.categoriaId"
          [categorias]="admin.categories()"
          textoSinElegir="Todas"
        />
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
      <section class="overflow-hidden border-t border-line" aria-label="Lista de productos">
        <!--
          PBI-0132: la lista es una tabla con sus encabezados (en el celular, sin la fila de encabezados visible). Lote 25
          (PBI-0219): el SKU va en su propia columna. Lote 43 (PBI-0265): «N°» y «Estado».
        -->
        <div role="table" aria-label="Productos">
          <div
            role="row"
            class="grid grid-cols-[2.5rem_minmax(0,1fr)_150px_110px_64px_96px_88px] gap-x-4 bg-subtle px-5 py-3 text-xs font-semibold uppercase text-muted max-md:hidden"
          >
            <span role="columnheader">N°</span>
            <span role="columnheader">Producto</span>
            <span role="columnheader">SKU</span>
            <span role="columnheader">Precio</span>
            <span role="columnheader">Stock</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader"><span class="sr-only">Acciones</span></span>
          </div>
          @for (p of pagina().items; track p.id; let i = $index) {
            <div
              role="row"
              class="grid grid-cols-[2.5rem_minmax(0,1fr)_150px_110px_64px_96px_88px] items-center gap-x-4 border-t border-line px-5 py-3 text-sm max-md:grid-cols-[2rem_minmax(0,1fr)_auto_auto] max-md:gap-y-2"
            >
              <!--
                PBI-0156: en el celular la fila de encabezados se oculta (conserva la medida de admin-productos-movil);
                cada celda dice su columna solo a un lector de pantalla. En escritorio la dice el encabezado.
              -->
              <span role="cell" class="tabular-nums text-muted max-md:row-span-2 max-md:self-start">
                <span class="sr-only md:hidden">N°:</span>
                {{ numero(i) }}
              </span>
              <div role="cell" class="min-w-0 max-md:col-span-3">
                <span class="sr-only md:hidden">Producto:</span>
                <strong class="block truncate">{{ p.name }}</strong>
              </div>
              <!-- En el celular, el SKU va en su propia línea debajo del nombre. -->
              <span
                role="cell"
                class="min-w-0 truncate text-muted max-md:col-span-3 max-md:-mt-2 max-md:text-xs"
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
              <span role="cell">
                <span class="sr-only md:hidden">Estado:</span>
                <span [class]="insignia(p.active ? 'exito' : 'alerta')">
                  {{ p.active ? 'Activo' : 'Inactivo' }}
                </span>
              </span>
              <div
                role="cell"
                class="flex justify-end gap-2 max-md:col-span-3 max-md:col-start-2 max-md:justify-start"
              >
                <a
                  [class]="accion"
                  [routerLink]="['/productos', p.id]"
                  queryParamsHandling="preserve"
                  [attr.aria-label]="'Editar producto ' + p.name"
                  matTooltip="Editar"
                >
                  <svg wsAdminIcono="editar"></svg>
                </a>
                @if (session.can('products.delete')) {
                  <button
                    type="button"
                    [class]="accionEliminar"
                    [attr.aria-label]="'Eliminar producto ' + p.name"
                    matTooltip="Eliminar"
                    data-eliminar
                    (click)="remove(p.id, $event)"
                  >
                    <svg wsAdminIcono="eliminar"></svg>
                  </button>
                }
              </div>
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
export class ProductosPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly session = inject(SesionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  /** Lote 43 (PBI-0269): el foco tras eliminar, en la fila que ocupa su lugar. */
  // PBI-0273: con la página, el foco sabe cuándo la lista volvió a la anterior.
  private readonly foco = focoTrasEliminar({ pagina: () => this.pagina().page });
  protected readonly insignia = clasesDeInsignia;
  protected readonly accion = CLASES_ACCION;
  protected readonly accionEliminar = CLASES_ACCION_ELIMINAR;
  /** Parámetros de consulta de la URL; con un parámetro repetido, el primero. */
  private readonly parametros = toSignal(
    this.route.queryParamMap.pipe(
      map((mapa): ParametrosUrl =>
        Object.fromEntries(mapa.keys.map((clave) => [clave, mapa.get(clave) ?? undefined])),
      ),
    ),
    { requireSync: true },
  );
  /** La página y su tamaño, en la URL (lote 43). */
  protected readonly paginacion = paginacionDeLaUrl(this.parametros);
  /** Filtros de la última búsqueda, los de la URL. */
  protected readonly aplicados = computed(() => leerFiltrosProductos(this.parametros()));
  protected readonly resultados = computed(() =>
    filtrarProductos(this.admin.products(), this.admin.categories(), this.aplicados()),
  );
  protected readonly pagina = computed(() => this.paginacion.paginar(this.resultados()));
  /**
   * Lote 43 (PBI-0265): si la página de registro vuelve con `?nuevo=<id>` tras crear, el listado va a la página de ese
   * registro (o, si los filtros lo dejan fuera, los quita y va a su página).
   */
  private readonly registroNuevo = this.paginacion.seguirRegistroNuevo<Producto>({
    filtrados: () => this.resultados(),
    todos: () => filtrarProductos(this.admin.products(), this.admin.categories(), FILTROS_PRODUCTOS_VACIOS),
    es: (producto, id) => producto.id === id,
  });
  /** El total y cuántos activos e inactivos cumplen los filtros (lote 43, PBI-0265). */
  protected readonly fichas = computed((): FichaDeResumen[] => {
    const resultados = this.resultados();
    const [activos, inactivos] = contarPorClave(resultados, (p) => (p.active ? 'activos' : 'inactivos'), [
      'activos',
      'inactivos',
    ]);
    return [
      { texto: textoDelTotal(resultados.length), tono: 'principal', icono: 'lista' },
      {
        texto: textoDeCantidad(activos?.cantidad ?? 0, 'activo', 'activos'),
        tono: 'exito',
        icono: 'activar',
      },
      {
        texto: textoDeCantidad(inactivos?.cantidad ?? 0, 'inactivo', 'inactivos'),
        tono: 'alerta',
        icono: 'inactivo',
      },
    ];
  });
  /** Lo que exporta «Exportar»: las filas filtradas de todas las páginas, con las columnas de la tabla. */
  protected readonly exportacion = (): TablaExportable => ({
    titulo: 'Productos',
    columnas: ['N°', 'Producto', 'SKU', 'Precio (S/)', 'Stock', 'Estado'],
    filas: this.resultados().map((p, i) => [
      i + 1,
      p.name,
      p.sku,
      p.price.toFixed(2),
      p.stock,
      p.active ? 'Activo' : 'Inactivo',
    ]),
  });
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
  protected numero(indice: number): number {
    return numeroDeFila(this.pagina(), indice);
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
      queryParams: {
        ...parametrosDeFiltrosProductos(this.borrador.getRawValue()),
        ...this.paginacion.conservar(),
      },
    });
  }
  /** Vacía todos los filtros del panel de una vez, sin buscar (AC-14). */
  protected limpiar() {
    this.borrador.setValue({ ...FILTROS_PRODUCTOS_VACIOS });
  }
  /** Lote 43 (ADR-0033, PBI-0269): se confirma en la ventana propia, con el nombre del producto. */
  protected async remove(id: string, evento: Event) {
    const producto = this.admin.products().find((p) => p.id === id);
    if (!producto || !this.session.can('products.delete')) return;
    const lugar = this.foco.recordar(evento);
    if (!(await confirmarEliminacion(this.dialog, producto.name))) return;
    if (await this.admin.eliminarProducto(id)) this.foco.restaurar(lugar);
  }
}
