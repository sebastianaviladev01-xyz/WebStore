import { A11yModule } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';

import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import {
  FiltrosCatalogo,
  TOPES_DE_PRECIO,
  filtrarProductos,
  hayFiltrosCatalogo,
  leerFiltrosCatalogo,
  parametrosDeFiltrosCatalogo,
} from '../../catalogo/domain/filtro-catalogo.rules';
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
                  <mat-option [value]="item.id">{{ item.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Precio máximo</mat-label>
              <mat-select
                canSelectNullableOptions
                [value]="filtros().precioMaximo"
                (selectionChange)="aplicar({ precioMaximo: $event.value })"
              >
                <mat-option [value]="null">Todos los precios</mat-option>
                @for (tope of topes; track tope) {
                  <mat-option [value]="tope">S/ {{ tope.toLocaleString('en-US') }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
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
              @for (product of filteredProducts(); track product.id; let index = $index) {
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
  readonly precio = input<string | undefined>();

  protected readonly catalog = inject(CatalogoFacade);
  private readonly router = inject(Router);
  protected readonly filtersOpen = signal(false);
  protected readonly topes = TOPES_DE_PRECIO;
  private readonly botonFiltros = viewChild<ElementRef<HTMLButtonElement>>('botonFiltros');

  /** Los filtros son los parámetros de la URL: el panel, la cabecera y los enlaces de categoría los cambian (PBI-0108). */
  protected readonly filtros = computed(() =>
    leerFiltrosCatalogo({ buscar: this.buscar(), categoria: this.categoria(), precio: this.precio() }),
  );
  protected readonly categoryTitle = computed(
    () =>
      this.catalog.categories().find((category) => category.id === this.filtros().categoria)?.name ??
      'Todos los productos',
  );
  protected readonly filteredProducts = computed(() =>
    filtrarProductos(this.catalog.products(), this.catalog.categories(), this.filtros()),
  );
  protected readonly hasFilters = computed(() => hayFiltrosCatalogo(this.filtros()));

  protected onSearch(event: Event): void {
    // Cada letra reemplaza la entrada del historial, para que «Atrás» no las recorra una por una.
    this.aplicar({ buscar: (event.target as HTMLInputElement).value }, true);
  }

  protected clearFilters(): void {
    void this.router.navigate(['/catalogo']);
  }

  protected aplicar(cambio: Partial<FiltrosCatalogo>, reemplazar = false): void {
    void this.router.navigate(['/catalogo'], {
      queryParams: parametrosDeFiltrosCatalogo({ ...this.filtros(), ...cambio }),
      replaceUrl: reemplazar,
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
