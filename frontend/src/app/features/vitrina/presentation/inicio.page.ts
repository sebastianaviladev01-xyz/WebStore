import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import { ContenidoFacade } from '../../contenido/application/contenido.facade';
import { hijosDeCategoria, descendientesDeCategoria } from '../../catalogo/domain/categoria.rules';
import { necesitaCarrusel } from '../../catalogo/domain/destacados.rules';
import { Producto } from '../../catalogo/domain/producto.model';
import { CarruselBannersComponent } from './carrusel-banners.component';
import { CarruselDestacadosComponent } from './carrusel-destacados.component';
import { BotonesBannerComponent } from './botones-banner.component';
import { TarjetaProductoComponent } from './tarjeta-producto.component';
import { AccesosRapidosComponent } from './accesos-rapidos.component';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { AtajosServicioComponent } from './atajos-servicio.component';

@Component({
  selector: 'ws-home-page',
  imports: [
    CarruselBannersComponent,
    CarruselDestacadosComponent,
    TarjetaProductoComponent,
    AccesosRapidosComponent,
    RevealDirective,
    RouterLink,
    AtajosServicioComponent,
    BotonesBannerComponent,
  ],
  template: `
    @if (content.heroBanners().length) {
      <ws-hero-carousel [banners]="content.heroBanners()" [highlights]="heroHighlights()" />
    } @else {
      <section class="ws-home-intro ws-container">
        <h1>Tecnología para disfrutar en casa.</h1>
        <a routerLink="/catalogo" class="ws-btn-primary">Ver productos</a>
      </section>
    }

    <ws-service-shortcuts />

    <ws-quick-access [categories]="categoryAccess()" />

    <!-- Lote 22 (PBI-0215): sin destacados con stock, la sección no sale (mientras carga o con error, sí). -->
    @if (showFeaturedSection()) {
      <section id="destacados" class="ws-section ws-featured" aria-labelledby="featured-title">
        <div class="ws-container">
          <div class="ws-section-heading" wsReveal>
            <div>
              <h2 id="featured-title" class="ws-heading">Productos destacados</h2>
              <p class="ws-section-copy">
                Tecnología elegida por su diseño y desempeño, con precios que ya incluyen IGV.
              </p>
            </div>
            <a routerLink="/catalogo" class="ws-text-link">Ver todos los productos</a>
          </div>

          <div class="ws-category-tabs" role="group" aria-label="Filtrar productos destacados">
            <button
              type="button"
              data-label="Destacados"
              [class.is-active]="selectedCategory() === ''"
              [attr.aria-pressed]="selectedCategory() === ''"
              (click)="selectCategory('')"
            >
              Destacados
            </button>
            @for (category of showcaseCategories(); track category.id) {
              <button
                type="button"
                [attr.data-label]="category.name"
                [class.is-active]="selectedCategory() === category.id"
                [attr.aria-pressed]="selectedCategory() === category.id"
                (click)="selectCategory(category.id)"
              >
                {{ category.name }}
              </button>
            }
          </div>

          @if (catalog.loading()) {
            <div class="ws-card p-12 text-center text-muted" role="status">Cargando productos…</div>
          } @else if (catalog.error()) {
            <div class="ws-card p-12 text-center" role="alert">
              <h3 class="text-xl font-semibold">No se pudo cargar el catálogo</h3>
              <p class="mt-2 text-muted">{{ catalog.error() }}</p>
              <button type="button" class="ws-btn-secondary mt-5" (click)="catalog.load()">Reintentar</button>
            </div>
          } @else if (featuredCarousel()) {
            <ws-featured-carousel [products]="showcasedProducts()" wsReveal />
          } @else {
            <div class="ws-product-grid">
              @for (product of showcasedProducts(); track product.id; let first = $first, index = $index) {
                <ws-product-card [product]="product" [priority]="first" wsReveal [revealIndex]="index" />
              } @empty {
                <p class="ws-empty-products">Pronto encontrarás nuevos productos en esta categoría.</p>
              }
            </div>
          }
        </div>
      </section>
    }

    @for (collection of categoryCollections(); track collection.category.id; let reversed = $odd) {
      <section
        class="ws-section ws-collection"
        [class.is-reversed]="reversed"
        [attr.aria-labelledby]="'collection-' + collection.category.id"
      >
        <div class="ws-container ws-collection-layout">
          <div class="ws-collection-intro" [wsReveal]="reversed ? 'right' : 'left'">
            <h2 [id]="'collection-' + collection.category.id">{{ collection.category.name }}</h2>
            <p>
              Descubre una selección pensada para integrar tecnología, diseño y uso cotidiano en tu hogar.
            </p>
            <a
              routerLink="/catalogo"
              [queryParams]="{ categoria: collection.category.id }"
              class="ws-text-link"
            >
              Explorar {{ collection.category.name.toLocaleLowerCase('es-PE') }}
            </a>
          </div>
          <div class="ws-collection-products">
            @for (product of collection.products; track product.id; let index = $index) {
              <ws-product-card
                [product]="product"
                [wsReveal]="reversed ? 'left' : 'right'"
                [revealIndex]="index + 1"
              />
            }
          </div>
        </div>
      </section>
    }

    @if (content.promotionalBanners().length) {
      <section class="ws-section ws-campaign-section" aria-labelledby="campaigns-title">
        <div class="ws-container">
          <div class="ws-section-heading" wsReveal>
            <h2 id="campaigns-title" class="ws-heading">Ideas para cada espacio</h2>
          </div>
          <div class="ws-campaign-grid">
            @for (banner of content.promotionalBanners(); track banner.id; let index = $index) {
              <article class="ws-campaign" wsReveal [revealIndex]="index">
                <div class="ws-campaign-media" [class.is-photo]="banner.imageFit === 'cover'">
                  <img [src]="banner.imageUrl" [alt]="banner.title" width="640" height="480" loading="lazy" />
                </div>
                <div class="ws-campaign-copy">
                  <h3>{{ banner.title }}</h3>
                  <span>{{ banner.description }}</span>
                  <div class="ws-campaign-actions">
                    <!-- PBI-0184 y PBI-0266: los dos botones del banner, cada uno con el estilo elegido. -->
                    <ws-banner-buttons [banner]="banner" />
                    <small>{{ banner.eyebrow }}</small>
                  </div>
                </div>
              </article>
            }
          </div>
        </div>
      </section>
    }

    <section class="ws-benefits" aria-labelledby="benefits-title">
      <div class="ws-container">
        <h2 id="benefits-title" class="sr-only">
          Beneficios de comprar en {{ content.settings().storeName }}
        </h2>
        <div
          class="ws-benefits-grid"
          [style.--ws-benefit-columns]="benefitColumns().wide"
          [style.--ws-benefit-columns-md]="benefitColumns().medium"
        >
          @for (benefit of content.benefits(); track benefit.title; let index = $index) {
            <article wsReveal [revealIndex]="index">
              <span class="ws-benefit-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  @switch (index % 4) {
                    @case (0) {
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                    }
                    @case (1) {
                      <path d="M2 7h12v10H2zM14 11h4l4 3v3h-8" />
                      <circle cx="6" cy="18" r="2" />
                      <circle cx="18" cy="18" r="2" />
                    }
                    @case (2) {
                      <path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" />
                      <path d="M3 7l9 4 9-4M12 11v10" />
                    }
                    @default {
                      <path d="M6 3h9l4 4v14H6z" />
                      <path d="M15 3v4h4M9 12h7M9 16h5" />
                    }
                  }
                </svg>
              </span>
              <div>
                <h3>{{ benefit.title }}</h3>
                <p>{{ benefit.description }}</p>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioPage {
  protected readonly catalog = inject(CatalogoFacade);
  protected readonly content = inject(ContenidoFacade);
  protected readonly selectedCategory = signal('');

  protected readonly heroHighlights = computed(() =>
    this.content
      .benefits()
      .slice(0, 2)
      .map((benefit) => benefit.title),
  );

  /** Columnas de beneficios: llenan el ancho con hasta 4 por fila (2 en tablet), sin dejar huecos. */
  protected readonly benefitColumns = computed(() => {
    const count = Math.max(1, this.content.benefits().length);
    return { wide: Math.min(count, 4), medium: Math.min(count, 2) };
  });

  protected readonly topCategories = computed(() =>
    this.catalog.categories().filter((category) => !category.parentId),
  );

  protected readonly categoryAccess = computed(() =>
    this.topCategories().map((category) => {
      const products = this.productsInCategory(category.id);
      return {
        ...category,
        productCount: products.length,
        fromPrice: products.length ? Math.min(...products.map((product) => product.price)) : null,
        subcategories: hijosDeCategoria(this.catalog.categories(), category.id).map((child) => child.name),
      };
    }),
  );

  /** Pestañas de Destacados: solo categorías con algo que se pueda comprar ahora (sin pestañas vacías). */
  protected readonly showcaseCategories = computed(() =>
    this.topCategories().filter((category) => this.productsInCategory(category.id).some(isAvailable)),
  );

  /**
   * Destacados y colecciones muestran solo productos con stock: no se destaca lo que no se puede comprar. Los
   * destacados que marca el Admin salen todos, sin tope (PBI-0215); cada pestaña de categoría, hasta cuatro, como antes.
   */
  protected readonly showcasedProducts = computed(() => {
    const category = this.selectedCategory();
    return category
      ? this.productsInCategory(category).filter(isAvailable).slice(0, 4)
      : this.catalog.featuredProducts();
  });

  /** Lote 22 (PBI-0215): con más de cuatro destacados, la pestaña «Destacados» los muestra en un carrusel. */
  protected readonly featuredCarousel = computed(
    () => !this.selectedCategory() && necesitaCarrusel(this.showcasedProducts().length),
  );

  /** Lote 22 (PBI-0215): sin destacados con stock no hay sección; mientras carga o si falla, sí (con su aviso). */
  protected readonly showFeaturedSection = computed(
    () => this.catalog.loading() || !!this.catalog.error() || this.catalog.featuredProducts().length > 0,
  );

  protected readonly categoryCollections = computed(() =>
    this.topCategories()
      .map((category) => ({
        category,
        products: this.productsInCategory(category.id).filter(isAvailable).slice(0, 2),
      }))
      .filter((collection) => collection.products.length > 0)
      .slice(0, 2),
  );

  protected selectCategory(categoryId: string): void {
    if (categoryId === this.selectedCategory()) return;
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const viewTransitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => { readonly finished: Promise<void> };
    };
    if (reduceMotion || !viewTransitionDocument.startViewTransition) {
      this.selectedCategory.set(categoryId);
      return;
    }

    document.documentElement.classList.add('ws-product-switching');
    const transition = viewTransitionDocument.startViewTransition(() =>
      this.selectedCategory.set(categoryId),
    );
    void transition.finished.finally(() => document.documentElement.classList.remove('ws-product-switching'));
  }

  private productsInCategory(categoryId: string) {
    const ids = new Set([
      categoryId,
      ...descendientesDeCategoria(this.catalog.categories(), categoryId).map((entry) => entry.category.id),
    ]);
    return this.catalog.products().filter((product) => ids.has(product.categoryId));
  }
}

function isAvailable(product: Producto): boolean {
  return product.stock > 0;
}
