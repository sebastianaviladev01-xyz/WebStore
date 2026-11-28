import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';

import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import {
  FiltrosCatalogo,
  filtrarPorNombreYCategoria,
  filtrarProductos,
  hayFiltrosCatalogo,
  leerFiltrosCatalogo,
  limitesDePrecio,
  parametrosDeFiltrosCatalogo,
  validarRangoDePrecio,
} from '../../catalogo/domain/filtro-catalogo.rules';
import {
  leerOrdenCatalogo,
  OPCIONES_DE_ORDEN,
  OrdenCatalogo,
  ordenarProductos,
  parametrosDeOrdenCatalogo,
} from '../../catalogo/domain/orden-catalogo.rules';
import { TarjetaProductoComponent } from './tarjeta-producto.component';

/**
 * Las fotos de las dos primeras filas (tres columnas) se piden con prioridad: son las que se ven al abrir el catálogo
 * y `NgOptimizedImage` avisa (NG02955) si la más grande al pintar no la lleva (PBI-0159, lote 08).
 */
const FOTOS_PRIORITARIAS = 6;

@Component({
  selector: 'ws-catalog-page',
  imports: [
    A11yModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    TarjetaProductoComponent,
    RouterLink,
  ],
  template: `
    <section class="ws-container py-10 sm:py-14">
      <nav class="mb-7 flex items-center gap-2 text-xs text-muted" aria-label="Ruta de navegación">
        <a routerLink="/">Inicio</a>
        <span aria-hidden="true">/</span>
        <span>Productos</span>
      </nav>
      <div class="mb-9 max-w-3xl">
        <h1 class="ws-title">{{ categoryTitle() }}</h1>
        <p class="mt-4 max-w-2xl leading-7 text-muted">Encuentra el producto que necesitas para tu hogar.</p>
      </div>

      <div class="ws-catalog-mobile-toolbar">
        <button
          #botonFiltros
          type="button"
          class="ws-filter-toggle"
          [attr.aria-expanded]="filtersOpen()"
          aria-controls="catalog-filters"
          (click)="filtersOpen.set(true)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6" />
          </svg>
          Filtros
          @if (hasFilters()) {
            <span>Aplicados</span>
          }
        </button>
        <p aria-live="polite">
          {{ filteredProducts().length }} {{ filteredProducts().length === 1 ? 'producto' : 'productos' }}
        </p>
      </div>

      @if (filtersOpen()) {
        <button
          type="button"
          class="ws-filter-backdrop"
          aria-label="Cerrar filtros"
          (click)="cerrarFiltros()"
        ></button>
      }

      <div class="ws-catalog-layout">
        <!-- El foco solo queda retenido con el panel móvil abierto; en escritorio es una barra lateral (PBI-0105). -->
        <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- Escape llega desde los controles enfocables del panel. -->
        <aside
          id="catalog-filters"
          class="ws-catalog-filters"
          [class.is-open]="filtersOpen()"
          [cdkTrapFocus]="filtersOpen()"
          [cdkTrapFocusAutoCapture]="filtersOpen()"
          aria-label="Filtros de catálogo"
          (keydown.escape)="cerrarFiltros()"
        >
          <div class="ws-catalog-filter-header">
            <h2>Filtrar productos</h2>
            <button
              type="button"
              class="ws-filter-close"
              aria-label="Cerrar filtros"
              (click)="cerrarFiltros()"
            >
              ×
            </button>
          </div>
          <div class="grid gap-4">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Buscar por nombre</mat-label>
              <input
                matInput
                type="search"
                placeholder="Ej. OLED, lavadora..."
                [value]="filtros().buscar"
                (input)="onSearch($event)"
              />
            </mat-form-field>

            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Categoría</mat-label>
              <mat-select
                [value]="filtros().categoria"
                (selectionChange)="aplicar({ categoria: $event.value })"
              >
                <mat-option value="">Todas</mat-option>
                @for (item of catalog.categories(); track item.id) {
                  <!-- Lote 11 (PBI-0162): la imagen de la categoría junto a su nombre, si tiene. -->
                  <mat-option [value]="item.id">
                    @if (item.imageUrl) {
                      <img class="ws-category-option-image" [src]="item.imageUrl" alt="" />
                    }
                    {{ item.name }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <!--
              Lote 16 (ADR-0021, PBI-0181): rango de precio con mínimo y máximo. Se aplica al confirmar el campo (salir
              de él o Enter), no con cada tecla, para no avisar de un rango a medio escribir.
            -->
            <div class="ws-price-range grid gap-4" role="group" aria-label="Rango de precio">
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>Precio mínimo (S/)</mat-label>
                <input
                  matInput
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  aria-describedby="ws-precio-ayuda"
                  [placeholder]="placeholderMinimo()"
                  [formControl]="precioMinimo"
                  (change)="aplicarPrecio()"
                  (keydown.enter)="aplicarPrecio()"
                />
                @if (precioMinimo.errors?.['motivo']; as error) {
                  <mat-error>{{ error }}</mat-error>
                }
              </mat-form-field>
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>Precio máximo (S/)</mat-label>
                <input
                  matInput
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  aria-describedby="ws-precio-ayuda"
                  [placeholder]="placeholderMaximo()"
                  [formControl]="precioMaximo"
                  (change)="aplicarPrecio()"
                  (keydown.enter)="aplicarPrecio()"
                />
                @if (precioMaximo.errors?.['motivo']; as error) {
                  <mat-error>{{ error }}</mat-error>
                }
              </mat-form-field>
              @if (limites(); as limite) {
                <p id="ws-precio-ayuda" class="text-xs leading-5 text-muted">
                  En el catálogo: de S/ {{ formatoPrecio(limite.minimo) }} a S/
                  {{ formatoPrecio(limite.maximo) }}.
                </p>
              }
            </div>
          </div>
          @if (hasFilters()) {
            <button type="button" class="ws-text-link ws-filter-clear" (click)="clearFilters()">
              Limpiar filtros
            </button>
          }
          <button type="button" class="ws-filter-apply ws-btn-primary" (click)="cerrarFiltros()">
            Ver {{ filteredProducts().length }}
            {{ filteredProducts().length === 1 ? 'producto' : 'productos' }}
          </button>
        </aside>

        <div class="min-w-0">
          <div class="ws-catalog-results-bar mb-5">
            <p class="text-sm font-semibold text-muted">
              {{ filteredProducts().length }} {{ filteredProducts().length === 1 ? 'producto' : 'productos' }}
            </p>
            <!--
              Lote 52 (ADR-0037, PBI-0278): el orden del catálogo, con su etiqueta a la vista. Va en la URL (orden) y se
              aplica sobre lo filtrado; en el celular ocupa su propia fila, debajo de «Filtros».
            -->
            <mat-form-field class="ws-catalog-sort" subscriptSizing="dynamic">
              <mat-label>Ordenar por</mat-label>
              <mat-select [value]="ordenElegido()" (selectionChange)="ordenar($event.value)">
                @for (opcion of opcionesDeOrden; track opcion.valor) {
                  <mat-option [value]="opcion.valor">{{ opcion.etiqueta }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          @if (catalog.loading()) {
            <div class="ws-card grid min-h-80 place-items-center text-muted" role="status">
              Cargando catálogo…
            </div>
          } @else if (catalog.error()) {
            <div class="ws-card p-8 text-center" role="alert">
              <p>{{ catalog.error() }}</p>
              <button type="button" class="ws-btn-secondary mt-4" (click)="catalog.load()">Reintentar</button>
            </div>
          } @else if (filteredProducts().length === 0) {
            <div class="ws-card grid min-h-80 place-items-center p-8 text-center">
              <div class="max-w-md">
                <div
                  class="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-xl bg-soft text-link"
                  aria-hidden="true"
                >
                  <svg class="h-7 w-7 fill-none stroke-current" viewBox="0 0 32 32">
                    <circle cx="14" cy="14" r="8" stroke-width="1.8" />
                    <path d="m20 20 7 7" stroke-width="1.8" stroke-linecap="round" />
                  </svg>
                </div>
                <h2 class="text-2xl font-semibold tracking-[-0.025em]">No encontramos resultados</h2>
                <p class="mt-3 leading-7 text-muted">Prueba con otro nombre, categoría o rango de precio.</p>
                <button type="button" class="ws-btn-secondary mt-6" (click)="clearFilters()">
                  Restablecer filtros
                </button>
              </div>
            </div>
          } @else {
            <div class="ws-catalog-products">
              @for (product of productosOrdenados(); track product.id; let index = $index) {
                <ws-product-card [product]="product" [priority]="index < fotosPrioritarias" />
              }
            </div>
          }
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoPage {
  protected readonly fotosPrioritarias = FOTOS_PRIORITARIAS;
  readonly categoria = input<string | undefined>();
  readonly buscar = input<string | undefined>();
  readonly precioMin = input<string | undefined>();
  readonly precioMax = input<string | undefined>();
  /** El tope del filtro anterior (lote 05): un enlace guardado con `precio` se lee como el máximo (PBI-0181). */
  readonly precio = input<string | undefined>();
  /** El orden del catálogo (lote 52, PBI-0278); un valor desconocido se lee como «Relevancia». */
  readonly orden = input<string | undefined>();

  protected readonly catalog = inject(CatalogoFacade);
  private readonly router = inject(Router);
  protected readonly filtersOpen = signal(false);
  private readonly botonFiltros = viewChild<ElementRef<HTMLButtonElement>>('botonFiltros');

  /** Los filtros son los parámetros de la URL: el panel, la cabecera y los enlaces de categoría los cambian (PBI-0108). */
  protected readonly filtros = computed(() =>
    leerFiltrosCatalogo({
      buscar: this.buscar(),
      categoria: this.categoria(),
      precioMin: this.precioMin(),
      precioMax: this.precioMax(),
      precio: this.precio(),
    }),
  );
  /**
   * Lo escrito en los campos del precio. Vuelve a lo de la URL cuando esta cambia (Limpiar, Atrás). Un rango que no
   * vale marca el campo con su motivo, que se borra al volver a escribir.
   */
  protected readonly precioMinimo = new FormControl('', { nonNullable: true });
  protected readonly precioMaximo = new FormControl('', { nonNullable: true });
  /** El precio más bajo y el más alto de lo que se ve sin el filtro de precio, como ayuda para el rango. */
  protected readonly limites = computed(() =>
    limitesDePrecio(
      filtrarPorNombreYCategoria(this.catalog.products(), this.catalog.categories(), this.filtros()),
    ),
  );
  protected readonly placeholderMinimo = computed(() => {
    const limite = this.limites();
    return limite ? formatoPrecio(limite.minimo) : '';
  });
  protected readonly placeholderMaximo = computed(() => {
    const limite = this.limites();
    return limite ? formatoPrecio(limite.maximo) : '';
  });
  protected readonly formatoPrecio = formatoPrecio;
  protected readonly categoryTitle = computed(
    () =>
      this.catalog.categories().find((category) => category.id === this.filtros().categoria)?.name ??
      'Todos los productos',
  );
  protected readonly filteredProducts = computed(() =>
    filtrarProductos(this.catalog.products(), this.catalog.categories(), this.filtros()),
  );
  protected readonly hasFilters = computed(() => hayFiltrosCatalogo(this.filtros()));
  protected readonly opcionesDeOrden = OPCIONES_DE_ORDEN;
  protected readonly ordenElegido = computed(() => leerOrdenCatalogo(this.orden()));
  /** Lo filtrado, en el orden elegido: el conteo no cambia con el orden (PBI-0278). */
  protected readonly productosOrdenados = computed(() =>
    ordenarProductos(this.filteredProducts(), this.ordenElegido()),
  );

  protected onSearch(event: Event): void {
    // Cada letra reemplaza la entrada del historial, para que «Atrás» no las recorra una por una.
    this.aplicar({ buscar: (event.target as HTMLInputElement).value }, true);
  }

  constructor() {
    effect(() => {
      const { precioMinimo, precioMaximo } = this.filtros();
      this.precioMinimo.setValue(textoDePrecio(precioMinimo));
      this.precioMaximo.setValue(textoDePrecio(precioMaximo));
    });
  }

  /** Aplica el rango escrito si vale; si no, cada campo muestra su motivo y la URL no cambia (PBI-0181). */
  protected aplicarPrecio(): void {
    const rango = validarRangoDePrecio(this.precioMinimo.value, this.precioMaximo.value);
    if (!rango.ok) {
      marcarMotivo(this.precioMinimo, rango.errores.minimo);
      marcarMotivo(this.precioMaximo, rango.errores.maximo);
      return;
    }
    const { precioMinimo, precioMaximo } = this.filtros();
    if (precioMinimo === rango.precioMinimo && precioMaximo === rango.precioMaximo) return;
    this.aplicar({ precioMinimo: rango.precioMinimo, precioMaximo: rango.precioMaximo });
  }

  /** Quita los filtros y conserva el orden: ordenar no es filtrar (PBI-0278). */
  protected clearFilters(): void {
    void this.router.navigate(['/catalogo'], {
      queryParams: parametrosDeOrdenCatalogo(this.ordenElegido()),
    });
  }

  /** Cambia un filtro y conserva el orden elegido (PBI-0278). */
  protected aplicar(cambio: Partial<FiltrosCatalogo>, reemplazar = false): void {
    void this.router.navigate(['/catalogo'], {
      queryParams: {
        ...parametrosDeFiltrosCatalogo({ ...this.filtros(), ...cambio }),
        ...parametrosDeOrdenCatalogo(this.ordenElegido()),
      },
      replaceUrl: reemplazar,
    });
  }

  /** Cambia el orden y conserva los filtros (PBI-0278). El catálogo de la tienda no se pagina: se ve todo lo filtrado. */
  protected ordenar(orden: OrdenCatalogo): void {
    if (orden === this.ordenElegido()) return;
    void this.router.navigate(['/catalogo'], {
      queryParams: {
        ...parametrosDeFiltrosCatalogo(this.filtros()),
        ...parametrosDeOrdenCatalogo(orden),
      },
    });
  }

  /** Cierra el panel móvil y devuelve el foco al botón «Filtros», si está a la vista (PBI-0105). */
  protected cerrarFiltros(): void {
    if (!this.filtersOpen()) return;
    this.filtersOpen.set(false);
    const boton = this.botonFiltros()?.nativeElement;
    if (boton?.checkVisibility()) boton.focus();
  }
}

function textoDePrecio(precio: number | null): string {
  return precio === null ? '' : String(precio);
}

/** Los precios como los muestra la tienda: con separador de miles y sin decimales si no los tienen. */
function formatoPrecio(precio: number): string {
  return precio.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** Marca el campo con el motivo por el que no vale; sin motivo, lo deja como está. */
function marcarMotivo(control: FormControl<string>, motivo: string | undefined): void {
  if (!motivo) return;
  control.setErrors({ motivo });
  control.markAsTouched();
}
