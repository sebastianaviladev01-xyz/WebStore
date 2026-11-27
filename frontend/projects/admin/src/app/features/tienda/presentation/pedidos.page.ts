import { CurrencyPipe, DatePipe, formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelect, MatSelectChange, MatSelectModule } from '@angular/material/select';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { TiendaFacade } from '../application/tienda.facade';
import { clasesDeEstadoPedido } from './estado-pedido';
import { TablaExportable } from '../domain/exportacion.rules';
import { contarPorClave, numeroDeFila, textoDeCantidad, textoDelTotal } from '../domain/listado.rules';
import {
  direccionVisible,
  fechaDeEntrega,
  versionDeTerminos,
  ZONA_HORARIA_LIMA,
} from '../domain/pedido.rules';
import { ETIQUETAS_ESTADO_PEDIDO, Pedido, EstadoPedido } from '../domain/tienda.model';
import {
  FILTROS_PEDIDOS_VACIOS,
  filtrarPedidos,
  leerFiltrosPedidos,
  parametrosDeFiltrosPedidos,
} from '../domain/filtro-listado.rules';
import { filtrosDeListado } from './filtros-de-listado';
import { FichaDeResumen, Tono } from './insignia';
import { ListadoComponent } from './listado.component';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { confirmarCancelacionDePedido } from '../../../shared/ui/confirmacion.dialog';

/** Ficha del pie de cada estado (lote 43, PBI-0265): el tono del punto sigue al color de su insignia (PBI-0080). */
const FICHA_DEL_ESTADO: Readonly<Record<EstadoPedido, { tono: Tono; singular: string; plural: string }>> = {
  confirmed: { tono: 'principal', singular: 'confirmado', plural: 'confirmados' },
  processing: { tono: 'principal', singular: 'en preparación', plural: 'en preparación' },
  shipped: { tono: 'principal', singular: 'enviado', plural: 'enviados' },
  delivered: { tono: 'neutro', singular: 'entregado', plural: 'entregados' },
  cancelled: { tono: 'peligro', singular: 'cancelado', plural: 'cancelados' },
};

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
    ListadoComponent,
    PanelFiltrosComponent,
  ],
  template: `
    <!--
      Lote 43 (ADR-0033, PBI-0265): la lista, en un solo panel como la lista de proveedores del SGC, con la misma
      paginación que los demás listados (antes, todos en una sola página); el detalle sigue a su lado desde 1280 px. El
      rango y las fichas del pie reemplazan a «N de M pedidos».
    -->
    <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <ws-admin-listado
        titulo="Pedidos"
        descripcion="Revisa los pedidos de la tienda y su detalle; quien gestiona los pedidos cambia su estado."
        que="pedidos"
        [exportacion]="exportacion"
        [pagina]="pagina()"
        [tamano]="filtros.tamano()"
        [fichas]="fichas()"
        (cambiarPagina)="filtros.irAPagina($event)"
        (cambiarTamano)="filtros.cambiarTamano($event)"
      >
        <!-- PBI-0155: el filtro de estado va en el panel estándar de la feature 008, con el estado en la URL. -->
        <ws-filter-panel
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

        <!-- relative: contiene los textos sr-only de la tabla, que si no ensanchan la página a 375 px (como admin-card). -->
        <section class="relative overflow-x-auto border-t border-line" aria-label="Lista de pedidos">
          <table class="w-full min-w-[640px] text-left text-sm">
            <thead class="bg-subtle text-xs text-muted">
              <tr>
                <th class="w-14 px-4 py-3 font-medium">N°</th>
                <th class="px-4 py-3 font-medium">Pedido</th>
                <th class="px-4 py-3 font-medium">Cliente</th>
                <th class="px-4 py-3 font-medium">Distrito</th>
                <th class="px-4 py-3 text-right font-medium">Total</th>
                <th class="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (order of pagina().items; track order.id; let i = $index) {
                <tr
                  class="cursor-pointer border-t border-line hover:bg-subtle"
                  [class.bg-primary-soft]="order.id === selected()?.id"
                  (click)="selectedId.set(order.id)"
                >
                  <td class="px-4 py-3 tabular-nums text-muted">{{ numero(i) }}</td>
                  <td class="px-4 py-3">
                    <button
                      data-sin-icono="identificador"
                      type="button"
                      class="font-semibold text-link"
                      (click)="selectedId.set(order.id)"
                    >
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
                  <td colspan="6" class="px-4 py-10 text-center text-muted">
                    {{
                      admin.orders().length ? 'Ningún pedido cumple los filtros.' : 'Todavía no hay pedidos.'
                    }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      </ws-admin-listado>

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
              <!-- Lote 17 (PBI-0177): la fecha y la hora con segundos, y la versión aceptada. -->
              @if (order.termsAcceptedAt) {
                Aceptados el {{ order.termsAcceptedAt | date: 'dd/MM/yyyy HH:mm:ss' : zonaLima }}
                <br />
                {{ versionDeTerminos(order.termsVersion) }}
              } @else {
                Sin registro
              }
            </dd>
          </dl>

          <h3 class="mt-6 text-sm font-semibold">Productos</h3>
          <ul class="mt-2 divide-y divide-line text-sm">
            @for (item of order.items; track item.productId) {
              <li class="flex justify-between gap-3 py-2">
                <span>
                  {{ item.quantity }} × {{ item.name }}
                  <!-- Lote 19 (PBI-0006): la línea que va a otra dirección (una por producto) la dice. -->
                  @if (item.shipping; as direccion) {
                    <span class="mt-0.5 block text-xs text-muted">
                      Se entrega en otra dirección: {{ direccionVisible(direccion) }}
                    </span>
                  }
                </span>
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
  private readonly dialog = inject(MatDialog);
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
  protected readonly versionDeTerminos = versionDeTerminos;
  protected readonly direccionVisible = direccionVisible;
  /** Id del pedido que pide la URL (`?pedido=<id>`); si no está en la lista filtrada, el detalle es el primero de ella. */
  readonly pedido = input<string>();
  protected readonly selectedId = linkedSignal<string | null>(() => this.pedido() ?? null);
  protected readonly filtered = computed(() => filtrarPedidos(this.admin.orders(), this.filtros.aplicados()));
  /** Lote 43 (PBI-0265): Pedidos toma la misma paginación que los demás listados (antes, todos en una página). */
  protected readonly pagina = computed(() => this.filtros.paginar(this.filtered()));
  /**
   * El detalle sigue al filtro (PBI-0066): un pedido que no está en la lista filtrada no se muestra. Sin uno elegido (o
   * si ya no está), el primero de la página que se ve.
   */
  protected readonly selected = computed<Pedido | null>(
    () => this.filtered().find((order) => order.id === this.selectedId()) ?? this.pagina().items[0] ?? null,
  );
  /** El total y cuántos hay en cada estado (lote 43, PBI-0265). */
  protected readonly fichas = computed((): FichaDeResumen[] => {
    const pedidos = this.filtered();
    return [
      { texto: textoDelTotal(pedidos.length), tono: 'principal', icono: 'lista' },
      ...contarPorClave(pedidos, (order) => order.status, this.statuses).map(({ clave, cantidad }) => {
        const ficha = FICHA_DEL_ESTADO[clave];
        return {
          texto: textoDeCantidad(cantidad, ficha.singular, ficha.plural),
          tono: ficha.tono,
          icono: 'pedidos' as const,
        };
      }),
    ];
  });
  protected readonly exportacion = (): TablaExportable => ({
    titulo: 'Pedidos',
    columnas: ['N°', 'Pedido', 'Fecha', 'Cliente', 'Distrito', 'Total (S/)', 'Estado'],
    filas: this.filtered().map((order, i) => [
      i + 1,
      order.id,
      formatDate(order.createdAt, 'dd/MM/yyyy HH:mm', 'es-PE', ZONA_HORARIA_LIMA),
      order.customer,
      order.district || '',
      order.total.toFixed(2),
      this.label(order.status),
    ]),
  });
  protected numero(indice: number): number {
    return numeroDeFila(this.pagina(), indice);
  }

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
    // Lote 43 (ADR-0033, PBI-0269): la ventana propia de confirmación, «Cancelar pedido».
    if (status === 'cancelled' && !(await confirmarCancelacionDePedido(this.dialog, order.id))) {
      volver(cambio.source);
      return;
    }
    if (!(await this.admin.cambiarEstadoPedido(order, status))) volver(cambio.source);
  }
}
