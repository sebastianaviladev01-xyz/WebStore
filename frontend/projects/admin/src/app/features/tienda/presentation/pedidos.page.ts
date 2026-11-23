import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatSelectChange, MatSelectModule } from '@angular/material/select';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { TiendaFacade } from '../application/tienda.facade';
import { clasesDeEstadoPedido } from './estado-pedido';
import { fechaDeEntrega, ZONA_HORARIA_LIMA } from '../domain/pedido.rules';
import { ETIQUETAS_ESTADO_PEDIDO, Pedido, EstadoPedido } from '../domain/tienda.model';
import {
  FILTROS_PEDIDOS_VACIOS,
  filtrarPedidos,
  leerFiltrosPedidos,
  parametrosDeFiltrosPedidos,
} from '../domain/filtro-listado.rules';
import { filtrosDeListado } from './filtros-de-listado';
import { PanelFiltrosComponent } from './panel-filtros.component';

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Tarjeta',
  'yape-plin': 'Yape / Plin',
  transfer: 'Transferencia',
};

@Component({
  selector: 'ws-admin-orders-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    PanelFiltrosComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Pedidos</h1>
    <p class="mt-2 text-sm text-muted">{{ filtered().length }} de {{ admin.orders().length }} pedidos</p>

    <!-- PBI-0155: el filtro de estado va en el panel estándar de la feature 008, con el estado en la URL. -->
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de pedidos"
      [formGroup]="filtros.borrador"
      [buscando]="filtros.buscando()"
      [error]="filtros.error()"
      (buscar)="filtros.buscar()"
      (limpiar)="filtros.limpiar()"
    >
      <mat-form-field>
        <mat-label>Filtrar por estado</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="">Todos</mat-option>
          @for (status of statuses; track status) {
            <mat-option [value]="status">{{ label(status) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </ws-filter-panel>

    <div class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section class="admin-card overflow-x-auto" aria-label="Lista de pedidos">
        <table class="w-full min-w-[640px] text-left text-sm">
          <thead class="bg-subtle text-xs text-muted">
            <tr>
              <th class="px-4 py-3 font-medium">Pedido</th>
              <th class="px-4 py-3 font-medium">Cliente</th>
              <th class="px-4 py-3 font-medium">Distrito</th>
              <th class="px-4 py-3 text-right font-medium">Total</th>
              <th class="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (order of filtered(); track order.id) {
              <tr
                class="cursor-pointer border-t border-line hover:bg-subtle"
                [class.bg-primary-soft]="order.id === selected()?.id"
                (click)="selectedId.set(order.id)"
              >
                <td class="px-4 py-3">
                  <button type="button" class="font-semibold text-link" (click)="selectedId.set(order.id)">
                    {{ order.id }}
                  </button>
                  <p class="text-xs text-muted">
                    {{ order.createdAt | date: 'dd/MM/yyyy HH:mm' : zonaLima }}
                  </p>
                </td>
                <td class="px-4 py-3">{{ order.customer }}</td>
                <td class="px-4 py-3">{{ order.district || '—' }}</td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">
                  {{ order.total | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </td>
                <td class="px-4 py-3">
                  <span class="rounded-full px-2.5 py-1 text-xs font-medium" [class]="badge(order.status)">
                    {{ label(order.status) }}
                  </span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-4 py-10 text-center text-muted">
                  {{
                    admin.orders().length ? 'Ningún pedido cumple los filtros.' : 'Todavía no hay pedidos.'
                  }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      <aside class="admin-card h-fit p-6" aria-live="polite">
        @if (selected(); as order) {
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-xl font-semibold">{{ order.id }}</h2>
              <p class="text-sm text-muted">{{ order.createdAt | date: "d 'de' MMMM, HH:mm" : zonaLima }}</p>
            </div>
            <span class="rounded-full px-2.5 py-1 text-xs font-medium" [class]="badge(order.status)">
              {{ label(order.status) }}
            </span>
          </div>

          <dl class="mt-5 grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt class="text-muted">Cliente</dt>
            <dd class="font-medium">{{ order.customer }}</dd>
            <dt class="text-muted">Contacto</dt>
            <dd class="break-words">
              {{ order.customerEmail }}
              <br />
              {{ order.customerPhone }}
            </dd>
            <dt class="text-muted">Dirección</dt>
            <dd>{{ order.address || '—' }}, {{ order.district }}</dd>
            <dt class="text-muted">Despacho</dt>
            <dd>
              Desde {{ order.shippingOrigin || '—' }} · entrega {{ fechaDeEntrega(order.deliveryDate) }}
            </dd>
            <dt class="text-muted">Pago</dt>
            <dd>{{ payment(order.paymentMethod) }}</dd>
            <dt class="text-muted">Términos</dt>
            <dd>
              @if (order.termsAcceptedAt) {
                Aceptados el {{ order.termsAcceptedAt | date: 'dd/MM/yyyy HH:mm' : zonaLima }}
              } @else {
                Sin registro
              }
            </dd>
          </dl>

          <h3 class="mt-6 text-sm font-semibold">Productos</h3>
          <ul class="mt-2 divide-y divide-line text-sm">
            @for (item of order.items; track item.productId) {
              <li class="flex justify-between gap-3 py-2">
                <span>{{ item.quantity }} × {{ item.name }}</span>
                <span class="tabular-nums">
                  {{ item.quantity * item.unitPrice | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </span>
              </li>
            }
          </ul>
          <dl class="mt-3 grid grid-cols-[1fr_auto] gap-y-1 border-t border-line pt-3 text-sm tabular-nums">
            <dt class="text-muted">Subtotal (incluye IGV)</dt>
            <dd class="text-right">{{ order.subtotal | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd>
            <dt class="text-muted">Envío</dt>
            <dd class="text-right">{{ order.shippingCost | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd>
            <dt class="font-semibold">Total</dt>
            <dd class="text-right font-semibold">{{ order.total | currency: 'PEN' : 'symbol' : '1.2-2' }}</dd>
          </dl>

          <!-- PBI-0170 (lote 11): el vendedor ve el pedido, pero no cambia su estado (orders.manage). -->
          @if (puedeCambiarEstado()) {
            <label class="mt-6 grid gap-1 text-sm">
              <span id="pedido-cambiar-estado" class="font-medium">Cambiar estado</span>
              <mat-select
                aria-labelledby="pedido-cambiar-estado"
                [value]="order.status"
                [disabled]="admin.saving()"
                (selectionChange)="setStatus(order, $event)"
              >
                @for (status of statuses; track status) {
                  <mat-option [value]="status">{{ label(status) }}</mat-option>
                }
              </mat-select>
            </label>
            @if (order.status !== 'cancelled') {
              <p class="mt-2 text-xs text-muted">Al cancelar, el stock reservado vuelve al inventario.</p>
            }
          }
        } @else {
          <p class="text-sm text-muted">Selecciona un pedido para ver su detalle.</p>
        }
      </aside>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly session = inject(SesionFacade);
  /** Solo quien gestiona los pedidos cambia su estado; el vendedor los ve (PBI-0170). El BFF lo vuelve a validar. */
  protected readonly puedeCambiarEstado = computed(() => this.session.can('orders.manage'));
  protected readonly statuses = Object.keys(ETIQUETAS_ESTADO_PEDIDO) as EstadoPedido[];
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosPedidos,
    escribir: parametrosDeFiltrosPedidos,
    vacios: FILTROS_PEDIDOS_VACIOS,
    que: 'los pedidos',
  });
  /** Fechas en la hora de Lima, como el Dashboard (PBI-0067). */
  protected readonly zonaLima = ZONA_HORARIA_LIMA;
  protected readonly fechaDeEntrega = fechaDeEntrega;
  /** Id del pedido que pide la URL (`?pedido=<id>`); si no está en la lista filtrada, el detalle es el primero de ella. */
  readonly pedido = input<string>();
  protected readonly selectedId = linkedSignal<string | null>(() => this.pedido() ?? null);
  protected readonly filtered = computed(() => filtrarPedidos(this.admin.orders(), this.filtros.aplicados()));
  /** El detalle sigue al filtro (PBI-0066): un pedido que no está en la lista filtrada no se muestra. */
  protected readonly selected = computed<Pedido | null>(
    () => this.filtered().find((order) => order.id === this.selectedId()) ?? this.filtered()[0] ?? null,
  );

  protected label(status: EstadoPedido): string {
    return ETIQUETAS_ESTADO_PEDIDO[status];
  }

  protected payment(method: string): string {
    return PAYMENT_LABELS[method] ?? (method || '—');
  }

  protected readonly badge = clasesDeEstadoPedido;

  /**
   * Cambia el estado. Si la persona responde «Cancelar» a la confirmación o el guardado no se hace, el selector
   * vuelve a mostrar el estado del pedido (PBI-0126).
   */
  protected async setStatus(order: Pedido, cambio: MatSelectChange<EstadoPedido>): Promise<void> {
    const status = cambio.value;
    const volver = (select: MatSelect) => (select.value = order.status);
    if (status === order.status) return;
    if (
      status === 'cancelled' &&
      !confirm(`¿Cancelar el pedido ${order.id}? El stock se devolverá al inventario.`)
    ) {
      volver(cambio.source);
      return;
    }
    if (!(await this.admin.cambiarEstadoPedido(order, status))) volver(cambio.source);
  }
}
