import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CuentaFacade } from '../../cuenta/application/cuenta.facade';
import { PedidosFacade } from '../application/pedidos.facade';
import { ETIQUETAS_ESTADO_PEDIDO } from '../domain/pedido.model';

@Component({
  selector: 'ws-orders-page',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <section class="ws-container py-12">
      <p class="ws-eyebrow">Seguimiento</p>
      <h1 class="mt-2 text-4xl font-semibold sm:text-6xl">Mis pedidos</h1>
      <p class="mt-4 max-w-2xl text-sm text-muted">
        @if (auth.isAuthenticated()) {
          Mostramos los pedidos de tu cuenta y los que hiciste como invitado en este dispositivo.
        } @else {
          Mostramos los pedidos que hiciste como invitado en este dispositivo.
          <a routerLink="/cuenta/login" class="font-semibold underline underline-offset-4">Inicia sesión</a>
          para ver los pedidos asociados a tu correo.
        }
      </p>
      @if (orders.error()) {
        <p class="mt-4 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
          {{ orders.error() }}
        </p>
      }
      <div class="mt-8 grid gap-4">
        @if (orders.loading()) {
          <div class="ws-card p-8 text-center text-muted" role="status">Cargando pedidos…</div>
        } @else {
          @for (order of orders.orders(); track order.id) {
            <article class="ws-card grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="text-xl font-semibold">{{ order.id }}</h2>
                  <span class="rounded-full bg-soft px-3 py-1 text-xs font-semibold">
                    {{ statusLabels[order.status] }}
                  </span>
                </div>
                <p class="mt-2 text-sm text-muted">
                  {{ order.createdAt | date: 'd MMM y, h:mm a' }} · {{ order.items.length }}
                  {{ order.items.length === 1 ? 'producto' : 'productos' }}
                </p>
              </div>
              <div class="flex items-center gap-4">
                <strong class="text-xl">{{ order.total | currency: 'PEN' : 'symbol' : '1.2-2' }}</strong>
                <a [routerLink]="['/pedidos', order.id]" class="ws-btn-secondary">Ver detalle</a>
              </div>
            </article>
          } @empty {
            <div class="ws-card p-8 text-center text-muted">Todavía no encontramos pedidos.</div>
          }
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidosPage implements OnInit {
  protected readonly statusLabels = ETIQUETAS_ESTADO_PEDIDO;
  protected readonly orders = inject(PedidosFacade);
  protected readonly auth = inject(CuentaFacade);
  ngOnInit(): void {
    void this.orders.loadAll();
  }
}
