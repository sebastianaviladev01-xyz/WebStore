import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';
import { Producto } from '../../catalogo/domain/producto.model';
import { productosSugeridos } from '../../catalogo/domain/sugerencia.rules';
import { LugarDeSugeridos } from '../../contenido/domain/contenido.model';

/** Lo que pasó al agregar: cuántas unidades se pidieron, cuántas entraron y cuántas quedaron en el carrito. */
export interface ResultadoAgregarAlCarrito {
  readonly product: Producto;
  readonly solicitadas: number;
  readonly agregadas: number;
  readonly enCarrito: number;
}

interface DatosDelDialogo extends ResultadoAgregarAlCarrito {
  readonly lugar: LugarDeSugeridos;
}

/**
 * «Producto agregado» con los sugeridos (PBI-0039). Desde el lote 16 (ADR-0021, PBI-0179; provisional) se muestra en el
 * diálogo, por defecto, o en un panel lateral, según la configuración de la tienda. Los dos son el mismo `MatDialog`:
 * foco atrapado, Escape, `role="dialog"` y el título como nombre accesible; el panel, además, con `aria-modal="true"`.
 */
@Component({
  selector: 'ws-add-to-cart-dialog',
  imports: [CurrencyPipe, MatDialogModule, MatButtonModule, NgTemplateOutlet, RouterLink],
  template: `
    <ng-template #detalle>
      @if (detail(); as text) {
        <p class="text-sm text-muted">{{ text }}</p>
      } @else {
        <p class="text-sm text-muted">
          <strong class="text-body">{{ data.product.name }}</strong>
          ya está en tu carrito.
        </p>
      }
      <!-- PBI-0039 (confirmado por Daniel el 2026-11-20): hasta tres de la misma categoría, con stock. -->
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
    </ng-template>

    @if (enPanel) {
      <div class="ws-added-panel">
        <div class="ws-added-panel-header">
          <h2 mat-dialog-title>{{ titulo }}</h2>
          <button type="button" class="ws-added-panel-close" aria-label="Cerrar" (click)="close()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div class="ws-added-panel-body">
          <ng-container [ngTemplateOutlet]="detalle" />
        </div>
        <div class="ws-added-panel-actions">
          <button mat-flat-button type="button" cdkFocusInitial (click)="verCarrito()">Ver carrito</button>
          <button mat-stroked-button type="button" (click)="close()">Seguir comprando</button>
        </div>
      </div>
    } @else {
      <h2 mat-dialog-title>{{ titulo }}</h2>
      <mat-dialog-content>
        <ng-container [ngTemplateOutlet]="detalle" />
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="close()">Seguir comprando</button>
        <button mat-flat-button type="button" cdkFocusInitial (click)="verCarrito()">Ver carrito</button>
      </mat-dialog-actions>
    }
  `,
  host: { '[class.ws-added-panel-host]': 'enPanel' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgregarAlCarritoDialog {
  protected readonly data = inject<DatosDelDialogo>(MAT_DIALOG_DATA);
  private readonly catalog = inject(CatalogoFacade);
  protected readonly enPanel = this.data.lugar === 'side-panel';
  protected readonly titulo = this.data.agregadas ? 'Producto agregado' : 'No se agregaron unidades';
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
  protected async verCarrito(): Promise<void> {
    this.ref.close();
    await this.router.navigate(['/carrito']);
  }
}

/**
 * Abre «Producto agregado» con su tamaño: la tarjeta y la ficha lo abren igual (PBI-0080). En el panel lateral
 * (PBI-0179) ocupa el alto de la ventana, pegado a la derecha, y hasta 420 px de ancho (todo el ancho en el celular).
 */
export function abrirAgregarAlCarrito(
  dialog: MatDialog,
  data: ResultadoAgregarAlCarrito,
  lugar: LugarDeSugeridos,
): MatDialogRef<AgregarAlCarritoDialog> {
  const datos: DatosDelDialogo = { ...data, lugar };
  if (lugar === 'side-panel')
    return dialog.open(AgregarAlCarritoDialog, {
      data: datos,
      width: 'min(420px, 100vw)',
      maxWidth: '100vw',
      height: '100dvh',
      maxHeight: '100dvh',
      position: { top: '0', right: '0' },
      panelClass: 'ws-cart-side-panel',
      // Material ya oculta el resto de la página a los lectores de pantalla; el panel lo dice también con aria-modal.
      ariaModal: true,
    });
  return dialog.open(AgregarAlCarritoDialog, {
    width: '500px',
    maxWidth: 'calc(100vw - 32px)',
    data: datos,
  });
}
