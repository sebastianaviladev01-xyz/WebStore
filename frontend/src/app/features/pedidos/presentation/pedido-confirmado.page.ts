import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PedidosFacade } from '../application/pedidos.facade';
@Component({
  selector: 'ws-order-success-page',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <section class="ws-container grid min-h-[65vh] place-items-center py-12">
      <div class="ws-card w-full max-w-2xl p-8 text-center sm:p-12">
        @if (order(); as o) {
          <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-link">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              class="h-8 w-8 fill-none stroke-current"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h1 class="mt-6 text-4xl font-semibold">Gracias por tu compra</h1>
          <p class="mt-4 text-muted">
            Pedido
            <strong>{{ o.id }}</strong>
            ·
            <span class="whitespace-nowrap">{{ o.createdAt | date: 'd MMM y, h:mm a' }}</span>
          </p>
          <p class="mt-5 text-3xl font-semibold">{{ o.total | currency: 'PEN' : 'symbol' : '1.2-2' }}</p>
          <p class="mt-4 text-sm text-muted">
            Durante las próximas 24 horas puedes cambiar la dirección o la fecha de entrega, o cancelar el
            pedido.
          </p>
          <div class="mt-8 flex flex-wrap justify-center gap-3">
            <a [routerLink]="['/pedidos', o.id]" class="ws-btn-primary">Ver pedido</a>
            <a routerLink="/catalogo" class="ws-btn-secondary">Seguir comprando</a>
          </div>
        } @else if (loading()) {
          <p class="text-muted" role="status">Cargando pedido…</p>
        } @else if (orders.error()) {
          <div
            class="rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger"
            role="alert"
          >
            <p>{{ orders.error() }}</p>
            <button type="button" class="mt-2 font-semibold underline underline-offset-4" (click)="load()">
              Reintentar
            </button>
          </div>
        } @else {
          <h1 class="text-3xl font-semibold">Pedido no encontrado</h1>
          <p class="mt-3 text-sm text-muted">
            Inicia sesión con la cuenta del pedido o ábrelo desde el dispositivo donde compraste.
          </p>
          <a routerLink="/pedidos" class="ws-btn-primary mt-6">Ver pedidos</a>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoConfirmadoPage implements OnInit {
  readonly orderId = input.required<string>();
  protected readonly orders = inject(PedidosFacade);
  protected readonly order = computed(() => this.orders.get(this.orderId()));
  protected readonly loading = signal(false);
  ngOnInit() {
    if (!this.order()) void this.load();
  }
  protected async load(): Promise<void> {
    this.loading.set(true);
    await this.orders.load(this.orderId());
    this.loading.set(false);
  }
}
