import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { TiendaFacade } from '../application/tienda.facade';

@Component({
  selector: 'ws-admin-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Resumen</h1>
    <p class="mt-2 text-sm text-muted">
      Hola, {{ session.user()?.name }}. Esto es lo que necesita atención hoy.
    </p>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      @if (session.can('orders.manage')) {
        <a routerLink="/pedidos" class="admin-card p-5 hover:border-primary">
          <p class="text-sm text-muted">Pedidos por atender</p>
          <strong class="mt-2 block text-3xl font-semibold tabular-nums text-primary">
            {{ pendingOrders().length }}
          </strong>
        </a>
      }
      <div class="admin-card p-5">
        <p class="text-sm text-muted">Productos activos</p>
        <strong class="mt-2 block text-3xl font-semibold tabular-nums">{{ activeProducts() }}</strong>
      </div>
      <a routerLink="/inventario" class="admin-card p-5 hover:border-primary">
        <p class="text-sm text-muted">Stock bajo (5 o menos)</p>
        <strong class="mt-2 block text-3xl font-semibold tabular-nums text-warning">
          {{ admin.lowStock().length }}
        </strong>
      </a>
      @if (session.can('customers.manage')) {
        <div class="admin-card p-5">
          <p class="text-sm text-muted">Clientes</p>
          <strong class="mt-2 block text-3xl font-semibold tabular-nums">
            {{ admin.customers().length }}
          </strong>
        </div>
      }
    </div>

    <div class="mt-6 grid gap-5 lg:grid-cols-2">
      <section class="admin-card p-6">
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
        <a routerLink="/inventario" class="mt-5 inline-flex text-sm font-medium text-primary">
          Gestionar inventario →
        </a>
      </section>
      @if (session.can('orders.manage')) {
        <section class="admin-card p-6">
          <h2 class="text-lg font-semibold">Pedidos recientes</h2>
          <div class="mt-4 grid gap-2">
            @for (order of recentOrders(); track order.id) {
              <div class="flex justify-between gap-3 rounded-lg bg-subtle px-3 py-2.5 text-sm">
                <span class="min-w-0 truncate">
                  {{ order.id }} · {{ order.customer }}
                  <span class="text-muted">· {{ order.createdAt | date: 'dd/MM' }}</span>
                </span>
                <strong class="font-semibold tabular-nums">
                  {{ order.total | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </strong>
              </div>
            } @empty {
              <p class="text-sm text-muted">Todavía no hay pedidos.</p>
            }
          </div>
          <a routerLink="/pedidos" class="mt-5 inline-flex text-sm font-medium text-primary">
            Ver todos los pedidos →
          </a>
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumenPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly session = inject(SesionFacade);
  protected readonly activeProducts = computed(
    () => this.admin.products().filter((product) => product.active).length,
  );
  protected readonly pendingOrders = computed(() =>
    this.admin.orders().filter((order) => order.status === 'confirmed' || order.status === 'processing'),
  );
  protected readonly recentOrders = computed(() => this.admin.orders().slice(0, 5));
}
