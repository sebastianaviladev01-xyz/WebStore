import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ComparadorFacade } from '../../comparador/application/comparador.facade';
import { Producto } from '../../catalogo/domain/producto.model';

/**
 * «Comparar» de la tarjeta y de la ficha (lote 19, ADR-0021, PBI-0001; provisional): un botón de alternar
 * (`aria-pressed`) que agrega o quita el producto de la comparación. Con 4 productos no agrega otro y lo avisa.
 */
@Component({
  selector: 'ws-compare-toggle',
  template: `
    <button
      type="button"
      class="ws-compare-toggle"
      [attr.aria-pressed]="enComparacion()"
      [attr.aria-label]="'Comparar ' + product().name"
      (click)="alternar()"
    >
      <span class="ws-compare-toggle-box" aria-hidden="true">
        @if (enComparacion()) {
          <svg viewBox="0 0 16 16"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
        }
      </span>
      Comparar
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotonCompararComponent {
  readonly product = input.required<Producto>();
  private readonly comparador = inject(ComparadorFacade);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  protected readonly enComparacion = computed(() => this.comparador.ids().includes(this.product().id));

  protected alternar(): void {
    const resultado = this.comparador.alternar(this.product().id);
    const { maximo } = this.comparador;
    if (resultado === 'lleno') {
      this.snackBar
        .open(`Puedes comparar hasta ${maximo} productos. Quita uno para agregar otro.`, 'Ver comparación', {
          duration: 6000,
        })
        .onAction()
        .subscribe(() => void this.router.navigate(['/comparar']));
      return;
    }
    if (resultado === 'agregado')
      this.snackBar
        .open(`Agregado a la comparación (${this.comparador.cantidad()} de ${maximo}).`, 'Ver comparación', {
          duration: 4000,
        })
        .onAction()
        .subscribe(() => void this.router.navigate(['/comparar']));
  }
}
