import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';

import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import { descendientesDeCategoria } from '../../catalogo/domain/categoria.rules';
import { TarjetaProductoComponent } from './tarjeta-producto.component';

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
          (click)="filtersOpen.set(false)"
        ></button>
      }

      <div class="ws-catalog-layout">
        <!-- eslint-disable-next-line @angular-eslint/template/interactive-supports-focus -- Escape llega desde los controles enfocables del panel. -->
        <aside
          id="catalog-filters"
          class="ws-catalog-filters"
          [class.is-open]="filtersOpen()"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="filtersOpen()"
          aria-label="Filtros de catálogo"
          (keydown.escape)="filtersOpen.set(false)"
        >
          <div class="ws-catalog-filter-header">
            <h2>Filtrar productos</h2>
            <button
              type="button"
              class="ws-filter-close"
              aria-label="Cerrar filtros"
              (click)="filtersOpen.set(false)"
            >
              ×
            </button>
          </div>
          <div class="grid gap-4">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Buscar por nombre</mat-label>
              <input
                matInput
                type="search"
                placeholder="Ej. OLED, lavadora..."
                [value]="effectiveSearch()"
                (input)="onSearch($event)"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Categoría</mat-label>
              <mat-select [value]="effectiveCategory()" (selectionChange)="category.set($event.value)">
                <mat-option value="">Todas</mat-option>
                @for (item of catalog.categories(); track item.id) {
                  <mat-option [value]="item.id">{{ item.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Precio máximo</mat-label>
              <mat-select [value]="maxPrice()" (selectionChange)="maxPrice.set($event.value)">
                <mat-option [value]="1000">S/ 1,000</mat-option>
                <mat-option [value]="2000">S/ 2,000</mat-option>
                <mat-option [value]="3000">S/ 3,000</mat-option>
                <mat-option [value]="5000">S/ 5,000</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          @if (hasFilters()) {
            <button type="button" class="ws-text-link ws-filter-clear" (click)="clearFilters()">
              Limpiar filtros
            </button>
          }
          <button type="button" class="ws-filter-apply ws-btn-primary" (click)="filtersOpen.set(false)">
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
              @for (product of filteredProducts(); track product.id; let first = $first) {
                <ws-product-card [product]="product" [priority]="first" />
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
  readonly categoria = input<string | undefined>();
  readonly buscar = input<string | undefined>();

  protected readonly catalog = inject(CatalogoFacade);
  protected readonly search = signal<string | null>(null);
  protected readonly category = signal<string | null>(null);
  protected readonly maxPrice = signal(5000);
  protected readonly filtersOpen = signal(false);

  protected readonly effectiveCategory = computed(() => this.category() ?? this.categoria() ?? '');
  protected readonly effectiveSearch = computed(() => this.search() ?? this.buscar() ?? '');
  protected readonly categoryTitle = computed(
    () =>
      this.catalog.categories().find((category) => category.id === this.effectiveCategory())?.name ??
      'Todos los productos',
  );

  protected readonly filteredProducts = computed(() => {
    const term = this.effectiveSearch().trim().toLocaleLowerCase('es-PE');
    const category = this.effectiveCategory();
    const categoryIds = new Set([
      category,
      ...descendientesDeCategoria(this.catalog.categories(), category).map((entry) => entry.category.id),
    ]);
    const maxPrice = this.maxPrice();

    return this.catalog.products().filter((product) => {
      const matchesTerm = !term || product.name.toLocaleLowerCase('es-PE').includes(term);
      const matchesCategory = !category || categoryIds.has(product.categoryId);
      const matchesPrice = product.price <= maxPrice;
      return matchesTerm && matchesCategory && matchesPrice;
    });
  });

  protected readonly hasFilters = computed(
    () => Boolean(this.effectiveSearch()) || Boolean(this.effectiveCategory()) || this.maxPrice() !== 5000,
  );

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.category.set('');
    this.maxPrice.set(5000);
  }
}
