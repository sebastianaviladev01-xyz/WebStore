import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoFacade } from '../application/carrito.facade';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';

@Component({
  selector: 'ws-cart-page',
  imports: [CurrencyPipe, EmptyStateComponent, NgOptimizedImage, RouterLink],
  template: `
    <section class="ws-container py-10 sm:py-14">
      <div class="mb-9">
        <h1 class="ws-title">Carrito</h1>
        <p class="mt-3 text-muted">Revisa tus productos y confirma el total antes de continuar.</p>
      </div>
      @if (cart.cargando()) {
        <div class="ws-card p-8 text-center text-muted" role="status">Cargando tu carrito…</div>
      } @else if (cart.error()) {
        <div class="rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger" role="alert">
          <p>No pudimos cargar tu carrito. Revisa tu conexión e inténtalo nuevamente.</p>
          <button
            type="button"
            class="mt-2 font-semibold underline underline-offset-4"
            (click)="cart.reintentar()"
          >
            Reintentar
          </button>
        </div>
      } @else if (cart.isEmpty()) {
        <ws-empty-state
          title="Tu carrito está vacío"
          description="Explora el catálogo y agrega productos para continuar."
        />
      } @else {
        <div class="grid gap-7 lg:grid-cols-[1fr_360px] lg:items-start">
          <div>
            @for (item of cart.items(); track item.product.id) {
              <article class="ws-cart-item sm:grid-cols-[150px_1fr_auto] sm:items-center">
                <a [routerLink]="['/catalogo', item.product.slug]" class="ws-cart-media">
                  <img
                    [ngSrc]="item.product.thumbnailUrl"
                    [alt]="item.product.name"
                    width="300"
                    height="225"
                    class="h-auto max-h-full w-full object-contain"
                  />
                </a>
                <div>
                  <p class="text-xs font-semibold text-muted">{{ item.product.categoryName }}</p>
                  <a
                    [routerLink]="['/catalogo', item.product.slug]"
                    class="mt-1 block text-xl font-semibold tracking-[-0.025em] hover:text-link"
                  >
                    {{ item.product.name }}
                  </a>
                  <p class="mt-2 text-sm leading-6 text-muted">{{ item.product.shortDescription }}</p>
                  <button
                    type="button"
                    class="mt-4 text-sm font-semibold text-link underline-offset-4 hover:underline"
                    (click)="cart.remove(item.product.id)"
                  >
                    Eliminar
                  </button>
                </div>
                <div class="flex items-center justify-between gap-5 sm:flex-col sm:items-end">
                  <p class="ws-price-numerals text-xl font-semibold">
                    {{ item.product.price * item.quantity | currency: 'PEN' : 'symbol' : '1.2-2' }}
                  </p>
                  <div
                    class="inline-flex h-11 items-center rounded-full border border-line bg-surface p-1"
                    aria-label="Cantidad"
                  >
                    <button
                      type="button"
                      class="grid h-8 w-8 place-items-center rounded-full hover:bg-soft"
                      [attr.aria-label]="'Reducir cantidad de ' + item.product.name"
                      (click)="cart.setQuantity(item.product.id, item.quantity - 1)"
                    >
                      −
                    </button>
                    <span class="min-w-8 text-center text-sm font-semibold" aria-live="polite">
                      {{ item.quantity }}
                    </span>
                    <button
                      type="button"
                      class="grid h-8 w-8 place-items-center rounded-full hover:bg-soft"
                      [attr.aria-label]="'Aumentar cantidad de ' + item.product.name"
                      (click)="cart.setQuantity(item.product.id, item.quantity + 1)"
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            }
          </div>
          <aside class="ws-order-summary">
            <h2 class="text-xl font-semibold tracking-[-0.025em]">Resumen</h2>
            <div class="mt-6 grid gap-4 text-sm">
              <div class="flex justify-between text-muted">
                <span>Valor de venta</span>
                <strong class="ws-price-numerals text-body">
                  {{ cart.taxableBase() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
              <div class="flex justify-between text-muted">
                <span>IGV (18%)</span>
                <strong class="ws-price-numerals text-body">
                  {{ cart.igv() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
              <div class="flex justify-between text-muted">
                <span>Subtotal con IGV</span>
                <strong class="ws-price-numerals text-body">
                  {{ cart.subtotal() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
              <div class="flex justify-between text-muted">
                <span>Envío</span>
                <strong class="text-body">Se calcula al elegir el distrito</strong>
              </div>
              <div class="h-px bg-line"></div>
              <div class="flex items-end justify-between">
                <span class="font-semibold">Productos</span>
                <strong class="ws-price-numerals text-2xl font-semibold">
                  {{ cart.subtotal() | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
            </div>
            <a routerLink="/checkout" class="ws-btn-primary mt-6 w-full">Confirmar pedido</a>
            <a routerLink="/catalogo" class="ws-btn-secondary mt-3 w-full">Seguir comprando</a>
          </aside>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarritoPage {
  protected readonly cart = inject(CarritoFacade);
}
