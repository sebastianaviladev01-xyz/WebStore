import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TiendaFacade } from '../application/tienda.facade';
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
          <input
            #stock
            type="number"
            min="0"
            [value]="p.stock"
            class="w-28 rounded-xl border border-line px-3 py-2"
            (change)="update(p.id, +stock.value)"
          />
          <span
            class="text-sm font-semibold"
            [class.text-danger]="p.stock === 0"
            [class.text-warning]="p.stock > 0 && p.stock <= 5"
            [class.text-primary-strong]="p.stock > 5"
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
  protected async update(id: string, stock: number) {
    const p = this.admin.products().find((x) => x.id === id);
    if (p) await this.admin.upsertProduct({ ...p, stock: Math.max(0, stock) });
  }
}
