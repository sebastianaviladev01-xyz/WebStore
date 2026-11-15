import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import { Producto } from '../../catalogo/domain/producto.model';
import { productosSugeridos } from '../../catalogo/domain/sugerencia.rules';

/** Lo que pasó al agregar: cuántas unidades se pidieron, cuántas entraron y cuántas quedaron en el carrito. */
export interface ResultadoAgregarAlCarrito {
  readonly product: Producto;
  readonly solicitadas: number;
  readonly agregadas: number;
  readonly enCarrito: number;
}

@Component({
  selector: 'ws-add-to-cart-dialog',
  imports: [CurrencyPipe, MatDialogModule, MatButtonModule, RouterLink],
  template: `
    <h2 mat-dialog-title>{{ data.agregadas ? 'Producto agregado' : 'No se agregaron unidades' }}</h2>
    <mat-dialog-content>
      @if (detail(); as text) {
        <p class="text-sm text-muted">{{ text }}</p>
      } @else {
        <p class="text-sm text-muted">
          <strong class="text-body">{{ data.product.name }}</strong>
          ya está en tu carrito.
        </p>
      }
      <!-- PBI-0039 (provisional, por confirmar con Daniel): hasta tres de la misma categoría, con stock. -->
      @if (sugeridos().length) {
        <div class="mt-5 border-t border-line pt-4">
          <h3 id="ws-sugeridos-titulo" class="text-sm font-semibold text-ink">También te puede interesar</h3>
          <ul class="mt-2 grid gap-1" aria-labelledby="ws-sugeridos-titulo">
            @for (sugerido of sugeridos(); track sugerido.id) {
              <li>
                <a
                  [routerLink]="['/catalogo', sugerido.slug]"
                  class="flex items-center gap-3 rounded-xl p-2 hover:bg-soft"
                  (click)="close()"
                >
                  <img
                    [src]="sugerido.thumbnailUrl"
                    alt=""
                    width="64"
                    height="48"
                    class="h-12 w-16 shrink-0 rounded-lg bg-soft object-contain p-1"
                  />
                  <span class="min-w-0 flex-1 text-sm font-semibold text-body">{{ sugerido.name }}</span>
                  <span class="ws-price-numerals text-sm text-muted">
                    {{ sugerido.price | currency: 'PEN' : 'symbol' : '1.2-2' }}
                  </span>
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Seguir comprando</button>
      <button mat-flat-button type="button" cdkFocusInitial (click)="go('/carrito')">Ver carrito</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgregarAlCarritoDialog {
  protected readonly data = inject<ResultadoAgregarAlCarrito>(MAT_DIALOG_DATA);
  private readonly catalog = inject(CatalogoFacade);
  protected readonly sugeridos = computed(() =>
    productosSugeridos(this.catalog.products(), this.data.product),
  );
  /** Sin texto propio cuando entró todo lo pedido; si no, cuántas entraron y por qué. */
  protected readonly detail = (): string | null => {
    const { product, solicitadas, agregadas, enCarrito } = this.data;
    if (agregadas === 0)
      return enCarrito === 1
        ? `Ya tienes en tu carrito la única unidad disponible de ${product.name}.`
        : `Ya tienes en tu carrito las ${enCarrito} unidades disponibles de ${product.name}.`;
    if (agregadas < solicitadas)
      return `Agregamos ${agregadas} de las ${solicitadas} unidades que pediste: es el stock disponible.`;
    return null;
  };
  private readonly ref = inject(MatDialogRef<AgregarAlCarritoDialog>);
  private readonly router = inject(Router);
  protected close(): void {
    this.ref.close();
  }
  protected async go(path: '/carrito'): Promise<void> {
    this.ref.close();
    await this.router.navigate([path]);
  }
}

/** Abre «Producto agregado» con su tamaño: la tarjeta y la ficha lo abren igual (PBI-0080). */
export function abrirAgregarAlCarrito(
  dialog: MatDialog,
  data: ResultadoAgregarAlCarrito,
): MatDialogRef<AgregarAlCarritoDialog> {
  return dialog.open(AgregarAlCarritoDialog, { width: '500px', maxWidth: 'calc(100vw - 32px)', data });
}
