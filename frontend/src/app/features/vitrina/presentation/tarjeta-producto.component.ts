import { Clipboard } from '@angular/cdk/clipboard';
import { CurrencyPipe, DOCUMENT, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';

import { CarritoFacade } from '../../carrito/application/carrito.facade';
import { ContenidoFacade } from '../../contenido/application/contenido.facade';
import { lugarDeLosSugeridos } from '../../contenido/domain/sugeridos.rules';
import { Producto } from '../../catalogo/domain/producto.model';
import { abrirAgregarAlCarrito } from './agregar-al-carrito.dialog';
import { BotonCompararComponent } from './boton-comparar.component';

@Component({
  selector: 'ws-product-card',
  imports: [BotonCompararComponent, CurrencyPipe, MatMenuModule, NgOptimizedImage, RouterLink],
  template: `
    <article class="ws-product-card">
      <a
        [routerLink]="['/catalogo', product().slug]"
        class="ws-product-image"
        [attr.aria-label]="'Ver ' + product().name"
      >
        @if (product().badge) {
          <span class="ws-product-badge" [class.is-offer]="product().badge === 'Oferta'">
            {{ product().badge }}
          </span>
        }
        <img
          [ngSrc]="product().thumbnailUrl"
          [alt]="product().name"
          width="640"
          height="480"
          [priority]="prioridadInicial()"
          class="h-auto max-h-full w-full object-contain"
        />
      </a>
      <!-- Opciones siempre visibles: no dependen de pasar el cursor sobre la ficha (acuerdo del 1-nov). -->
      <button
        type="button"
        class="ws-product-more"
        [matMenuTriggerFor]="options"
        [attr.aria-label]="'Más opciones para ' + product().name"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      <mat-menu #options="matMenu" xPosition="before">
        <a mat-menu-item [routerLink]="['/catalogo', product().slug]">Ver detalle</a>
        <a mat-menu-item routerLink="/catalogo" [queryParams]="{ categoria: product().categoryId }">
          Más de {{ product().categoryName }}
        </a>
        <button mat-menu-item type="button" (click)="copyLink()">Copiar enlace</button>
      </mat-menu>

      <div class="ws-product-body">
        <p class="ws-product-brand">
          {{ product().brand }}
          <span>{{ product().sku }}</span>
        </p>
        <h3>
          <a [routerLink]="['/catalogo', product().slug]">{{ product().name }}</a>
        </h3>
        <p class="ws-product-description">{{ product().shortDescription }}</p>
        <p class="ws-product-stock" [class.is-unavailable]="product().stock === 0">
          <span aria-hidden="true"></span>
          {{ product().stock > 0 ? product().stock + ' disponibles' : 'Agotado' }}
        </p>

        <div class="ws-product-price ws-price-numerals">
          <strong>{{ product().price | currency: 'PEN' : 'symbol' : '1.2-2' }}</strong>
          @if (product().compareAtPrice) {
            <del>{{ product().compareAtPrice | currency: 'PEN' : 'symbol' : '1.2-2' }}</del>
          }
        </div>

        <p class="ws-product-tax">Incluye IGV</p>
        <div class="ws-product-actions">
          <button
            type="button"
            class="ws-btn-primary w-full disabled:cursor-not-allowed"
            [disabled]="product().stock === 0"
            (click)="addToCart()"
          >
            {{ product().stock > 0 ? 'Agregar al carrito' : 'No disponible' }}
          </button>
          <!-- Lote 19 (PBI-0001): «Comparar» junto a «Ver detalle». -->
          <div class="ws-product-links">
            <ws-compare-toggle [product]="product()" />
            <a
              [routerLink]="['/catalogo', product().slug]"
              class="ws-product-detail"
              [attr.aria-label]="'Ver detalle de ' + product().name"
            >
              Ver detalle
            </a>
          </div>
        </div>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaProductoComponent {
  readonly product = input.required<Producto>();
  readonly priority = input(false);
  /**
   * `NgOptimizedImage` no admite cambiar `priority` después de crearse (NG02953, PBI-0026): al volver a pintar el
   * catálogo, la primera tarjeta puede dejar de serlo. Se conserva el valor con el que se creó la tarjeta.
   */
  protected readonly prioridadInicial = computed(() => untracked(this.priority));
  private readonly cart = inject(CarritoFacade);
  private readonly dialog = inject(MatDialog);
  private readonly content = inject(ContenidoFacade);
  private readonly router = inject(Router);
  private readonly clipboard = inject(Clipboard);
  private readonly snackBar = inject(MatSnackBar);
  private readonly document = inject(DOCUMENT);

  protected addToCart(): void {
    const product = this.product();
    const agregadas = this.cart.add(product);
    abrirAgregarAlCarrito(
      this.dialog,
      {
        product,
        solicitadas: 1,
        agregadas,
        enCarrito: this.cart.quantityOf(product.id),
      },
      lugarDeLosSugeridos(this.content.settings()),
    );
  }

  protected copyLink(): void {
    const path = this.router.serializeUrl(this.router.createUrlTree(['/catalogo', this.product().slug]));
    const copied = this.clipboard.copy(`${this.document.location.origin}${path}`);
    this.snackBar.open(copied ? 'Enlace copiado.' : 'No pudimos copiar el enlace.', undefined, {
      duration: 2500,
    });
  }
}
