import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Categoria } from '../../catalogo/domain/categoria.model';
import { VarianteInicio } from '../../contenido/domain/contenido.model';
import { RevealDirective } from '../../../shared/ui/reveal.directive';

export interface AccesoCategoria extends Categoria {
  readonly productCount: number;
  /** Precio más bajo de la categoría y sus subcategorías; null si aún no tiene productos. */
  readonly fromPrice: number | null;
  /** Nombres de las subcategorías directas, para anticipar qué hay dentro. */
  readonly subcategories: readonly string[];
}

@Component({
  selector: 'ws-quick-access',
  imports: [CurrencyPipe, RevealDirective, RouterLink],
  template: `
    <section
      class="ws-quick-access ws-container"
      [class.is-current]="variant() === 'actual'"
      aria-labelledby="quick-access-title"
    >
      <div class="ws-quick-access-header">
        <h2 id="quick-access-title">Compra por categoría</h2>
        @if (variant() === 'anterior') {
          <a routerLink="/catalogo" class="ws-text-link">Ver todos los productos</a>
        }
      </div>
      <div class="ws-quick-access-list">
        @for (category of categories(); track category.id; let index = $index) {
          <a
            routerLink="/catalogo"
            [queryParams]="{ categoria: category.id }"
            class="ws-category-access"
            wsReveal
            [revealIndex]="index"
          >
            @if (variant() === 'anterior') {
              <strong>{{ category.name }}</strong>
              <small>
                {{ category.productCount }} {{ category.productCount === 1 ? 'producto' : 'productos' }}
              </small>
              <span aria-hidden="true">Ver productos →</span>
            } @else {
              <span class="ws-category-access-text">
                <strong>{{ category.name }}</strong>
                <small>
                  {{ category.productCount }} {{ category.productCount === 1 ? 'producto' : 'productos' }}
                  @if (category.subcategories.length) {
                    · incluye {{ category.subcategories.join(', ') }}
                  }
                </small>
                @if (category.fromPrice !== null) {
                  <span class="ws-category-access-price">
                    Desde {{ category.fromPrice | currency: 'PEN' : 'symbol' : '1.0-0' }}
                  </span>
                }
              </span>
              <span class="ws-category-access-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            }
          </a>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccesosRapidosComponent {
  readonly categories = input.required<readonly AccesoCategoria[]>();
  /** La versión original (/inicio-anterior) conserva su encabezado con enlace y sus tarjetas. */
  readonly variant = input<VarianteInicio>('actual');
}
