import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TiendaFacade } from '../application/tienda.facade';
import { leerStock } from '../domain/inventario.rules';
@Component({
  selector: 'ws-inventory-page',
  imports: [ReactiveFormsModule],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Inventario</h1>
    <p class="mt-3 text-sm text-muted">
      El stock se mantiene en un único módulo administrativo; el storefront solo lo consulta.
    </p>
    <section class="admin-card mt-7 overflow-hidden">
      <div class="grid grid-cols-[1fr_160px_130px] bg-subtle p-4 text-xs font-semibold uppercase text-muted">
        <span>Producto</span>
        <span>Stock</span>
        <span>Estado</span>
      </div>
      @for (p of admin.products(); track p.id) {
        <div class="grid grid-cols-[1fr_160px_130px] items-center border-t border-line p-4">
          <div>
            <strong>{{ p.name }}</strong>
            <p class="text-xs text-muted">{{ p.sku }}</p>
          </div>
          <div>
            <input
              #stock
              type="number"
              min="0"
              step="1"
              [value]="p.stock"
              class="w-28 rounded-xl border border-line px-3 py-2"
              [attr.aria-label]="'Stock de ' + p.name"
              [attr.aria-invalid]="errores()[p.id] ? true : null"
              [attr.aria-describedby]="errores()[p.id] ? 'stock-error-' + p.id : null"
              (change)="update(p.id, stock.value)"
            />
            @if (errores()[p.id]; as error) {
              <p [id]="'stock-error-' + p.id" class="mt-1 text-xs font-semibold text-danger" role="alert">
                {{ error }}
              </p>
            }
          </div>
          <span
            class="text-sm font-semibold"
            [class.text-danger]="p.stock === 0"
            [class.text-warning]="p.stock > 0 && p.stock <= 5"
            [class.text-on-primary-soft]="p.stock > 5"
          >
            {{ p.stock === 0 ? 'Sin stock' : p.stock <= 5 ? 'Stock bajo' : 'Disponible' }}
          </span>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventarioPage {
  protected readonly admin = inject(TiendaFacade);
  /** Motivo por el que no se guardó el stock escrito en cada fila (PBI-0127), junto a su campo. */
  protected readonly errores = signal<Readonly<Record<string, string>>>({});
  /**
   * Guarda solo el stock del producto (PBI-0120): si hubo una venta mientras tanto y la persona también cambió el
   * stock, no lo pisa y avisa. Vacío, decimales o negativos no se guardan (PBI-0127; antes, vacío era 0).
   */
  protected async update(id: string, texto: string) {
    const lectura = leerStock(texto);
    const { [id]: _anterior, ...otros } = this.errores();
    this.errores.set(lectura.valido ? otros : { ...otros, [id]: lectura.mensaje });
    const p = this.admin.products().find((x) => x.id === id);
    if (!lectura.valido || !p || lectura.stock === p.stock) return;
    await this.admin.guardarProducto(p, { ...p, stock: lectura.stock });
  }
}
