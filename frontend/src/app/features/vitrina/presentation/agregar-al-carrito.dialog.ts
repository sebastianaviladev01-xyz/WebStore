import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { Producto } from '../../catalogo/domain/producto.model';

@Component({
  selector: 'ws-add-to-cart-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Producto agregado</h2>
    <mat-dialog-content>
      <p class="text-sm text-muted">
        <strong class="text-body">{{ data.name }}</strong>
        ya está en tu carrito.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Seguir comprando</button>
      <button mat-flat-button type="button" (click)="go('/carrito')">Ver carrito</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgregarAlCarritoDialog {
  protected readonly data = inject<Producto>(MAT_DIALOG_DATA);
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
