import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import { CarritoFacade } from '../../carrito/application/carrito.facade';
import { abrirAgregarAlCarrito } from './agregar-al-carrito.dialog';

@Component({
  selector: 'ws-product-detail-page',
  imports: [CurrencyPipe, NgOptimizedImage, RouterLink],
  template: `
    <section class="ws-container ws-pdp py-8 sm:py-12">
      <nav class="ws-pdp-breadcrumb" aria-label="Ruta de navegación">
        <a routerLink="/">Inicio</a>
        <span aria-hidden="true">/</span>
        <a routerLink="/catalogo">Productos</a>
      </nav>

      @if (catalog.loading()) {
        <div class="ws-card grid min-h-[520px] place-items-center text-muted" role="status">
          Cargando producto…
        </div>
      } @else if (product(); as item) {
        <div class="ws-pdp-layout grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div class="grid gap-3">
            <div
              class="ws-pdp-gallery relative grid min-h-[300px] place-items-center overflow-hidden p-6 sm:min-h-[540px] sm:p-10"
            >
              @if (item.badge) {
                <span
                  class="absolute left-6 top-6 z-10 rounded-full bg-surface px-4 py-2 text-xs font-semibold shadow-sm"
                >
                  {{ item.badge }}
                </span>
              }
              @if (selectedImage() === 0) {
                <!-- La imagen principal conserva la optimización de LCP; las fotos adicionales pueden ser Data URL. 800 × 600: la proporción 4:3 de las fotos de producto. -->
                <img
                  [ngSrc]="item.imageUrl"
                  [alt]="item.name"
                  width="800"
                  height="600"
                  priority
                  class="h-auto max-h-[500px] w-full object-contain"
                />
              } @else {
                <img
                  [src]="images()[selectedImage()]"
                  [alt]="item.name + ', foto ' + (selectedImage() + 1) + ' de ' + images().length"
                  width="800"
                  height="600"
                  class="is-photo h-auto max-h-[500px] w-full object-contain"
                />
              }
            </div>
            @if (images().length > 1) {
              <div class="ws-pdp-thumbs" role="group" aria-label="Fotos del producto">
                @for (url of images(); track url; let i = $index) {
                  <button
                    type="button"
                    [class.is-active]="selectedImage() === i"
                    [attr.aria-pressed]="selectedImage() === i"
                    [attr.aria-label]="'Ver foto ' + (i + 1) + ' de ' + images().length"
                    (click)="selectedImage.set(i)"
                  >
                    <!-- La foto principal usa su miniatura de 480 px; las demás no tienen versión reducida. -->
                    <img
                      [src]="url === item.imageUrl && item.thumbnailUrl ? item.thumbnailUrl : url"
                      alt=""
                      width="96"
                      height="72"
                      loading="lazy"
                    />
                  </button>
                }
              </div>
            }
          </div>

          <div class="ws-pdp-info flex flex-col justify-center py-2 lg:py-8">
            <h1 class="ws-title">{{ item.name }}</h1>
            <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
              <a routerLink="/catalogo" class="ws-pdp-category">{{ item.categoryName }}</a>
              @if (item.reviewCount > 0) {
                <span class="font-semibold text-warning">★ {{ item.rating }}</span>
                <span>{{ item.reviewCount }} reseñas</span>
              }
              <span>SKU {{ item.sku }}</span>
            </div>

            <p class="mt-6 text-base leading-7 text-muted-strong">{{ item.description }}</p>

            <div class="mt-7 flex flex-wrap items-end gap-3">
              <span class="ws-price-numerals text-3xl font-semibold tracking-[-0.035em]">
                {{ item.price | currency: 'PEN' : 'symbol' : '1.2-2' }}
              </span>
              @if (item.compareAtPrice) {
                <span class="ws-price-numerals pb-1 text-lg text-muted line-through">
                  {{ item.compareAtPrice | currency: 'PEN' : 'symbol' : '1.0-0' }}
                </span>
              }
            </div>

            <div class="ws-pdp-highlights mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              @for (highlight of item.highlights; track highlight) {
                <div class="p-3 text-center text-xs font-semibold text-muted-strong">{{ highlight }}</div>
              }
            </div>

            @if (item.stock > 0) {
              <div class="mt-8 flex items-center gap-3">
                <div class="inline-flex h-12 items-center rounded-full border border-line bg-surface p-1">
                  <button
                    type="button"
                    class="grid h-9 w-9 place-items-center rounded-full hover:bg-soft"
                    (click)="decreaseQuantity()"
                    aria-label="Disminuir cantidad"
                  >
                    −
                  </button>
                  <span class="min-w-9 text-center text-sm font-semibold" aria-live="polite">
                    {{ quantity() }}
                  </span>
                  <button
                    type="button"
                    class="grid h-9 w-9 place-items-center rounded-full hover:bg-soft"
                    (click)="increaseQuantity(item.stock)"
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
                <span class="text-sm font-semibold text-link">{{ item.stock }} disponibles</span>
              </div>
              <div class="ws-pdp-actions mt-5 flex flex-col gap-3 sm:flex-row">
                <span class="ws-pdp-mobile-price">
                  {{ item.price | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </span>
                <button type="button" class="ws-btn-primary flex-1" (click)="addToCart()">
                  Agregar al carrito
                </button>
                <a routerLink="/carrito" class="ws-btn-secondary flex-1">Ir al carrito</a>
              </div>
            } @else {
              <div class="mt-8 rounded-xl border border-line bg-subtle p-5">
                <p class="font-semibold">Producto sin stock</p>
                <p class="mt-1 text-sm leading-6 text-muted">
                  Este producto no está disponible por el momento.
                </p>
              </div>
            }

            <div
              class="ws-pdp-assurances mt-8 grid gap-3 border-t border-line pt-7 text-sm text-muted sm:grid-cols-3"
            >
              <span>Compra como invitado</span>
              <span>Envío cotizado al comprar</span>
              <span>Precio con IGV</span>
            </div>
          </div>
        </div>
      } @else if (catalog.error()) {
        <div class="rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger" role="alert">
          <p>No pudimos cargar el producto. Revisa tu conexión e inténtalo nuevamente.</p>
          <button
            type="button"
            class="mt-2 font-semibold underline underline-offset-4"
            (click)="catalog.load()"
          >
            Reintentar
          </button>
        </div>
      } @else {
        <div class="ws-card grid min-h-96 place-items-center p-8 text-center">
          <div>
            <h1 class="text-3xl font-semibold tracking-[-0.03em]">Producto no encontrado</h1>
            <p class="mt-3 text-muted">El producto solicitado no existe o ya no está disponible.</p>
            <a routerLink="/catalogo" class="ws-btn-primary mt-6">Volver al catálogo</a>
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleProductoPage {
  readonly slug = input.required<string>();

  protected readonly catalog = inject(CatalogoFacade);
  private readonly cart = inject(CarritoFacade);
  private readonly dialog = inject(MatDialog);
  protected readonly quantity = signal(1);
  protected readonly product = computed(() => this.catalog.findBySlug(this.slug()));
  protected readonly images = computed(() => {
    const item = this.product();
    return item ? (item.images?.length ? item.images : [item.imageUrl]) : [];
  });
  /** Se reinicia a la imagen principal al cambiar de producto. */
  protected readonly selectedImage = linkedSignal({ source: this.slug, computation: () => 0 });

  protected decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  protected increaseQuantity(stock: number): void {
    this.quantity.update((value) => Math.min(stock, value + 1));
  }

  protected addToCart(): void {
    const product = this.product();
    if (product) {
      const solicitadas = this.quantity();
      const agregadas = this.cart.add(product, solicitadas);
      abrirAgregarAlCarrito(this.dialog, {
        product,
        solicitadas,
        agregadas,
        enCarrito: this.cart.quantityOf(product.id),
      });
    }
  }
}
