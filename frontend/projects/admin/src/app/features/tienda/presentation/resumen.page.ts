import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { TiendaFacade } from '../application/tienda.facade';
import {
  calcularIndicadores,
  distribucionPorEstado,
  distritosConMasPedidos,
  serieDelMes,
  ultimosPedidos,
} from '../domain/resumen.rules';
import { ETIQUETAS_ESTADO_PEDIDO, EstadoPedido } from '../domain/tienda.model';
import { GraficoPedidosComponent } from './grafico-pedidos.component';
import { TarjetaIndicadorComponent } from './tarjeta-indicador.component';

const MES_EN_LIMA = new Intl.DateTimeFormat('es-PE', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Lima',
});

@Component({
  selector: 'ws-admin-dashboard',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    GraficoPedidosComponent,
    TarjetaIndicadorComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Resumen</h1>
    <p class="mt-2 text-sm text-muted">
      Hola, {{ session.user()?.name }}. Esto es lo que necesita atención hoy.
    </p>

    <!-- Sin snapshot (BFF caído o sesión vencida) el aviso de error del panel basta: no se muestran cifras a medias. -->
    @if (admin.snapshot()) {
      <div
        class="mt-6 grid gap-4 sm:grid-cols-2"
        [class]="verPedidos() && verClientes() ? 'xl:grid-cols-4' : 'xl:grid-cols-3'"
      >
        @if (verPedidos()) {
          <ws-admin-tarjeta-indicador
            titulo="Total de pedidos"
            [valor]="(indicadores().pedidos.total | number) ?? '0'"
            [variacion]="indicadores().pedidos.variacion"
            enlace="/pedidos"
          />
          <ws-admin-tarjeta-indicador
            titulo="Total de ventas"
            [valor]="(indicadores().ventas.total | currency: 'PEN' : 'symbol' : '1.2-2') ?? ''"
            [variacion]="indicadores().ventas.variacion"
            enlace="/pedidos"
          />
        }
        @if (verClientes()) {
          <ws-admin-tarjeta-indicador
            titulo="Total de clientes"
            [valor]="(indicadores().clientes.total | number) ?? '0'"
            [variacion]="indicadores().clientes.variacion"
            enlace="/clientes"
          />
        }
        <ws-admin-tarjeta-indicador
          titulo="Stock bajo"
          [valor]="(admin.lowStock().length | number) ?? '0'"
          nota="Productos con 5 unidades o menos"
          enlace="/inventario"
          [alerta]="true"
        />
      </div>

      @if (verPedidos()) {
        <div class="mt-5 grid gap-5 lg:grid-cols-3">
          <section class="admin-card min-w-0 p-6 lg:col-span-2">
            <h2 class="text-lg font-semibold">
              {{ verClientes() ? 'Pedidos y clientes nuevos por día' : 'Pedidos por día' }}
            </h2>
            <p class="mt-1 text-sm text-muted first-letter:uppercase">{{ mes }}</p>
            <ws-admin-grafico-pedidos
              class="mt-4"
              [serie]="serie()"
              [mes]="mes"
              [conClientes]="verClientes()"
            />
          </section>

          <section class="admin-card min-w-0 p-6">
            <h2 class="text-lg font-semibold">Pedidos por distrito</h2>
            <p class="mt-1 text-sm text-muted">Los cinco distritos con más pedidos</p>
            @if (distritos().length) {
              <ol class="mt-4 grid gap-3.5">
                @for (fila of distritos(); track fila.distrito) {
                  <li>
                    <div class="flex items-baseline justify-between gap-3 text-sm">
                      <span class="min-w-0 truncate">{{ fila.distrito }}</span>
                      <span class="shrink-0 tabular-nums text-muted">
                        <strong class="font-semibold text-body">{{ fila.pedidos }}</strong>
                        {{ fila.pedidos === 1 ? 'pedido' : 'pedidos' }}
                      </span>
                    </div>
                    <div class="mt-1.5 h-2 rounded-full bg-soft" aria-hidden="true">
                      <div
                        class="h-full rounded-full bg-primary"
                        [style.width.%]="(fila.pedidos / distritos()[0].pedidos) * 100"
                      ></div>
                    </div>
                  </li>
                }
              </ol>
            } @else {
              <p class="mt-4 text-sm text-muted">Todavía no hay pedidos.</p>
            }
          </section>
        </div>
      }

      <div class="mt-5 grid gap-5 lg:grid-cols-3">
        <section class="admin-card min-w-0 p-6">
          <h2 class="text-lg font-semibold">Alertas de inventario</h2>
          <div class="mt-4 grid gap-2">
            @for (product of admin.lowStock(); track product.id) {
              <div class="flex justify-between rounded-lg bg-warning-soft px-3 py-2.5 text-sm">
                <span>{{ product.name }}</span>
                <strong class="font-semibold text-warning">{{ product.stock }} un.</strong>
              </div>
            } @empty {
              <p class="text-sm text-muted">Sin alertas.</p>
            }
          </div>
          <a routerLink="/inventario" class="mt-5 inline-flex text-sm font-medium text-link">
            Gestionar inventario →
          </a>
        </section>

        @if (verPedidos()) {
          <section class="admin-card min-w-0 lg:col-span-2" aria-labelledby="ultimos-pedidos">
            <div class="flex flex-wrap items-baseline justify-between gap-2 p-6 pb-4">
              <h2 id="ultimos-pedidos" class="text-lg font-semibold">Últimos pedidos</h2>
              <a routerLink="/pedidos" class="text-sm font-medium text-link">Ver todos los pedidos →</a>
            </div>
            <!-- relative: los sr-only de la tabla quedan dentro del contenedor que se desplaza y no ensanchan la página. -->
            <div class="relative overflow-x-auto">
              <table class="w-full min-w-[600px] text-left text-sm">
                <thead class="bg-subtle text-xs text-muted">
                  <tr>
                    <th class="px-4 py-3 font-medium">ID</th>
                    <th class="px-4 py-3 font-medium">Cliente</th>
                    <th class="px-4 py-3 font-medium">Estado</th>
                    <th class="px-4 py-3 font-medium">Fecha</th>
                    <th class="px-4 py-3 text-right font-medium">Total</th>
                    <th class="px-4 py-3 font-medium"><span class="sr-only">Acción</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (order of ultimos(); track order.id) {
                    <tr class="border-t border-line">
                      <td class="px-4 py-3 font-semibold whitespace-nowrap">{{ order.id }}</td>
                      <td class="max-w-56 truncate px-4 py-3">{{ order.customer }}</td>
                      <td class="px-4 py-3">
                        <span
                          class="rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                          [class]="insignia(order.status)"
                        >
                          {{ etiquetas[order.status] }}
                        </span>
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap tabular-nums">
                        {{ order.createdAt | date: 'dd/MM/yyyy' }}
                      </td>
                      <td class="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                        {{ order.total | currency: 'PEN' : 'symbol' : '1.2-2' }}
                      </td>
                      <td class="px-4 py-3 text-right">
                        <a
                          class="inline-flex min-h-8 items-center rounded-lg border border-line px-3 text-xs font-medium text-link hover:border-link"
                          routerLink="/pedidos"
                          [queryParams]="{ pedido: order.id }"
                        >
                          Ver
                          <span class="sr-only">el pedido {{ order.id }}</span>
                        </a>
                      </td>
                    </tr>
                  } @empty {
                    <tr class="border-t border-line">
                      <td colspan="6" class="px-4 py-10 text-center text-muted">Todavía no hay pedidos.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      </div>

      @if (verPedidos()) {
        <section class="admin-card mt-5 p-6">
          <h2 class="text-lg font-semibold">Pedidos por estado</h2>
          <p class="mt-1 text-sm text-muted">Porcentaje sobre todos los pedidos registrados</p>
          <div class="mt-4 grid gap-5 sm:grid-cols-3">
            @for (estado of estados(); track estado.nombre) {
              <div>
                <div class="flex items-baseline justify-between gap-3">
                  <span class="text-sm font-medium">{{ estado.nombre }}</span>
                  <strong class="text-lg font-semibold tabular-nums">{{ estado.porcentaje }} %</strong>
                </div>
                <p class="text-xs text-muted">{{ estado.detalle }}</p>
                <div class="mt-2 h-2 rounded-full bg-soft" aria-hidden="true">
                  <div
                    class="h-full rounded-full"
                    [class]="estado.color"
                    [style.width.%]="estado.porcentaje"
                  ></div>
                </div>
              </div>
            }
          </div>
        </section>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly session = inject(SesionFacade);
  /** Instante de referencia de los tramos y del gráfico: se fija al abrir la página, como las cifras del snapshot. */
  private readonly ahora = new Date();
  protected readonly mes = MES_EN_LIMA.format(this.ahora);
  protected readonly etiquetas = ETIQUETAS_ESTADO_PEDIDO;

  protected readonly verPedidos = computed(() => this.session.can('orders.manage'));
  protected readonly verClientes = computed(() => this.session.can('customers.manage'));

  protected readonly indicadores = computed(() =>
    calcularIndicadores(this.admin.orders(), this.admin.customers(), this.ahora),
  );
  protected readonly serie = computed(() => serieDelMes(this.admin.orders(), this.ahora));
  protected readonly distritos = computed(() => distritosConMasPedidos(this.admin.orders()));
  protected readonly ultimos = computed(() => ultimosPedidos(this.admin.orders()));
  protected readonly estados = computed(() => {
    const distribucion = distribucionPorEstado(this.admin.orders());
    const etiqueta = ETIQUETAS_ESTADO_PEDIDO;
    return [
      {
        nombre: 'Completados',
        detalle: etiqueta.delivered,
        porcentaje: distribucion.completados,
        color: 'bg-primary-strong',
      },
      {
        nombre: 'En proceso',
        detalle: `${etiqueta.confirmed}, ${etiqueta.processing.toLowerCase()} y ${etiqueta.shipped.toLowerCase()}`,
        porcentaje: distribucion.enProceso,
        color: 'bg-primary',
      },
      { nombre: 'Otros', detalle: etiqueta.cancelled, porcentaje: distribucion.otros, color: 'bg-danger' },
    ];
  });

  /** Mismos colores de estado que la página de Pedidos. */
  protected insignia(status: EstadoPedido): string {
    if (status === 'cancelled') return 'bg-danger-soft text-danger';
    if (status === 'delivered') return 'bg-soft text-body';
    return 'bg-primary-soft text-on-primary-soft';
  }
}
