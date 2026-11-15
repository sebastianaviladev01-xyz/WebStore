import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Producto } from '../../catalogo/domain/producto.model';

/** Lo que pasó al agregar: cuántas unidades se pidieron, cuántas entraron y cuántas quedaron en el carrito. */
export interface ResultadoAgregarAlCarrito {
  readonly product: Producto;
  readonly solicitadas: number;
  readonly agregadas: number;
  readonly enCarrito: number;
}

@Component({
  selector: 'ws-add-to-cart-dialog',
  imports: [MatDialogModule, MatButtonModule],
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
