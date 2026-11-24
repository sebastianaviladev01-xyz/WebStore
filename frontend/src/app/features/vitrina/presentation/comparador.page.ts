import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';

import { CarritoFacade } from '../../carrito/application/carrito.facade';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import { Producto } from '../../catalogo/domain/producto.model';
import { ComparadorFacade } from '../../comparador/application/comparador.facade';
import { idsDesdeLaUrl, idsParaLaUrl, productosAComparar } from '../../comparador/domain/comparador.rules';
import { ContenidoFacade } from '../../contenido/application/contenido.facade';
import { lugarDeLosSugeridos } from '../../contenido/domain/sugeridos.rules';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { abrirAgregarAlCarrito } from './agregar-al-carrito.dialog';

/**
 * `/comparar` (lote 19, ADR-0021, PBI-0001; provisional): hasta 4 productos lado a lado, con imagen, nombre, marca,
 * categoría, precio, disponibilidad y características, y «Agregar al carrito» y «Quitar» en cada uno. La lista está en
 * la URL (`?ids=p-001,p-004`) para compartirla; en el celular, la tabla se desliza de lado con la primera columna fija.
 */
@Component({
  selector: 'ws-compare-page',
  imports: [CurrencyPipe, EmptyStateComponent, NgOptimizedImage, RouterLink],
  template: `
    <section class="ws-container py-10 sm:py-14">
      <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="ws-title">Comparar productos</h1>
          <p class="mt-2 text-sm leading-6 text-muted">
            Hasta {{ maximo }} productos. Puedes compartir esta página para mostrar la misma comparación.
          </p>
        </div>
        @if (productos().length && productos().length < maximo) {
          <a routerLink="/catalogo" class="ws-btn-secondary">Agregar productos</a>
        }
      </div>

      @if (aviso()) {
        <p class="mb-6 rounded-xl bg-soft p-3 text-sm" role="status">{{ aviso() }}</p>
      }

      @if (catalog.loading() && !catalog.products().length) {
        <div class="ws-card p-8 text-center text-muted" role="status">Cargando la comparación…</div>
      } @else if (catalog.error() && !catalog.products().length) {
        <div class="rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger" role="alert">
          <p>No pudimos cargar los productos. Revisa tu conexión e inténtalo nuevamente.</p>
          <button
            type="button"
            class="mt-2 font-semibold underline underline-offset-4"
            (click)="catalog.load()"
          >
            Reintentar
          </button>
        </div>
      } @else if (!productos().length) {
        <ws-empty-state
          title="No hay productos para comparar"
          description="Elige «Comparar» en los productos del catálogo para verlos lado a lado."
        />
      } @else {
        @if (productos().length > 1) {
          <p class="mb-3 text-xs text-muted md:hidden">Desliza la tabla para ver todos los productos.</p>
        }
        <div class="ws-compare-scroll" role="region" aria-label="Tabla de comparación" tabindex="0">
          <table class="ws-compare-table">
            <caption class="sr-only">Comparación de {{ productos().length }} productos</caption>
            <thead>
              <tr>
                <th scope="col"><span class="sr-only">Característica</span></th>
                @for (producto of productos(); track producto.id) {
                  <th scope="col">
                    <a [routerLink]="['/catalogo', producto.slug]" class="ws-compare-product">
                      <span class="ws-compare-image">
                        <img [ngSrc]="producto.thumbnailUrl" alt="" width="640" height="480" priority />
                      </span>
                      <span>{{ producto.name }}</span>
                    </a>
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Marca</th>
                @for (producto of productos(); track producto.id) {
                  <td>{{ producto.brand }}</td>
                }
              </tr>
              <tr>
                <th scope="row">Categoría</th>
                @for (producto of productos(); track producto.id) {
                  <td>{{ producto.categoryName }}</td>
                }
              </tr>
              <tr>
                <th scope="row">Precio</th>
                @for (producto of productos(); track producto.id) {
                  <td>
                    <strong class="ws-price-numerals text-base">
                      {{ producto.price | currency: 'PEN' : 'symbol' : '1.2-2' }}
                    </strong>
                    @if (producto.compareAtPrice) {
                      <del class="ws-price-numerals ml-2 text-muted">
                        {{ producto.compareAtPrice | currency: 'PEN' : 'symbol' : '1.2-2' }}
                      </del>
                    }
                    <span class="mt-1 block text-xs text-muted">Incluye IGV</span>
                  </td>
                }
              </tr>
              <tr>
                <th scope="row">Disponibilidad</th>
                @for (producto of productos(); track producto.id) {
                  <td>
                    <span class="ws-product-stock" [class.is-unavailable]="producto.stock === 0">
                      <span aria-hidden="true"></span>
                      {{ producto.stock > 0 ? producto.stock + ' disponibles' : 'Agotado' }}
                    </span>
                  </td>
                }
              </tr>
              <tr>
                <th scope="row">Características</th>
                @for (producto of productos(); track producto.id) {
                  <td>
                    @if (producto.highlights.length) {
                      <ul class="grid list-disc gap-1 pl-4">
                        @for (caracteristica of producto.highlights; track caracteristica) {
                          <li>{{ caracteristica }}</li>
                        }
                      </ul>
                    } @else {
                      —
                    }
                  </td>
                }
              </tr>
              <tr>
                <th scope="row"><span class="sr-only">Acciones</span></th>
                @for (producto of productos(); track producto.id) {
                  <td>
                    <div class="grid gap-2">
                      <button
                        type="button"
                        class="ws-btn-primary w-full disabled:cursor-not-allowed"
                        [disabled]="producto.stock === 0"
                        [attr.aria-label]="
                          producto.stock > 0 ? 'Agregar ' + producto.name + ' al carrito' : null
                        "
                        (click)="agregarAlCarrito(producto)"
                      >
                        {{ producto.stock > 0 ? 'Agregar al carrito' : 'No disponible' }}
                      </button>
                      <button
                        type="button"
                        class="ws-btn-secondary w-full"
                        [attr.aria-label]="'Quitar ' + producto.name + ' de la comparación'"
                        (click)="quitar(producto)"
                      >
                        Quitar
                      </button>
                    </div>
                  </td>
                }
              </tr>
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparadorPage {
  /** El parámetro `ids` de la URL (enlace compartido o la lista de esta visita). */
  readonly ids = input<string>();

  protected readonly catalog = inject(CatalogoFacade);
  private readonly comparador = inject(ComparadorFacade);
  private readonly cart = inject(CarritoFacade);
  private readonly dialog = inject(MatDialog);
  private readonly content = inject(ContenidoFacade);
  private readonly router = inject(Router);
  protected readonly maximo = this.comparador.maximo;
  protected readonly aviso = signal<string | null>(null);
  private readonly comparacion = computed(() =>
    productosAComparar(this.comparador.ids(), this.catalog.products()),
  );
  protected readonly productos = computed(() => this.comparacion().productos);

  constructor() {
    // La URL manda: un enlace compartido reemplaza la lista. Sin `ids`, la lista de esta visita pasa a la URL.
    effect(() => {
      const desdeLaUrl = idsDesdeLaUrl(this.ids());
      untracked(() => {
        if (desdeLaUrl.length) this.comparador.reemplazar(desdeLaUrl);
        else if (this.comparador.cantidad()) this.irA(this.comparador.ids());
      });
    });
    // Con el catálogo cargado, los productos que ya no están a la venta salen de la comparación, con un aviso.
    effect(() => {
      const { productos, retirados } = this.comparacion();
      if (this.catalog.loading() || this.catalog.error() || !retirados.length) return;
      untracked(() => {
        const ids = productos.map((producto) => producto.id);
        this.comparador.reemplazar(ids);
        this.aviso.set(
          retirados.length === 1
            ? 'Quitamos de la comparación un producto que ya no está a la venta.'
            : `Quitamos de la comparación ${retirados.length} productos que ya no están a la venta.`,
        );
        this.irA(ids);
      });
    });
  }

  protected quitar(producto: Producto): void {
    this.comparador.quitar(producto.id);
    this.aviso.set(null);
    this.irA(this.comparador.ids());
  }

  protected agregarAlCarrito(producto: Producto): void {
    const agregadas = this.cart.add(producto);
    abrirAgregarAlCarrito(
      this.dialog,
      { product: producto, solicitadas: 1, agregadas, enCarrito: this.cart.quantityOf(producto.id) },
      lugarDeLosSugeridos(this.content.settings()),
    );
  }

  /** Deja la lista en la URL sin sumar una entrada al historial. */
  private irA(ids: readonly string[]): void {
    void this.router.navigate([], { queryParams: { ids: idsParaLaUrl(ids) }, replaceUrl: true });
  }
}
