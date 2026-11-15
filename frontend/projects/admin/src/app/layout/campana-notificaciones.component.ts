import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

import { NotificacionesFacade } from '../features/notificaciones/application/notificaciones.facade';
import { contadorDeLaCampana, nombreDeLaCampana } from '../features/notificaciones/domain/notificacion.rules';
import { ZONA_HORARIA_LIMA } from '../features/tienda/domain/pedido.rules';

/**
 * Campana de la cabecera del Admin (lote 07b, ADR-0017, PBI-0033; provisional, por confirmar con Daniel). El número
 * cuenta los pedidos nuevos (estado «confirmado») desde la última vez que la persona abrió el menú; al abrirlo se
 * marcan como vistos. El menú lista esos pedidos y lleva a cada uno en Pedidos. Usa `MatMenu`, como el menú de
 * usuario: foco, flechas, Escape y clic fuera los resuelve Material. Solo existe para los roles con pedidos.
 */
@Component({
  selector: 'ws-admin-campana',
  imports: [CurrencyPipe, DatePipe, MatMenuModule, RouterLink],
  template: `
    <button
      type="button"
      class="relative grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
      [attr.aria-label]="nombre()"
      [matMenuTriggerFor]="menuNotificaciones"
      (menuOpened)="notificaciones.marcarVisto()"
      (menuClosed)="notificaciones.alCerrar()"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        class="h-5 w-5 fill-none stroke-current"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      @if (contador()) {
        <span
          class="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-on-primary"
          aria-hidden="true"
        >
          {{ contador() }}
        </span>
      }
    </button>
    <mat-menu
      #menuNotificaciones="matMenu"
      class="ws-menu-usuario-panel ws-menu-notificaciones-panel"
      aria-label="Notificaciones"
      xPosition="before"
    >
      <p class="ws-menu-usuario-cuenta">
        <strong>Pedidos nuevos</strong>
        <span>Desde la última vez que abriste este menú</span>
      </p>
      <div class="ws-menu-usuario-separador" role="separator"></div>
      @for (pedido of notificaciones.pedidos(); track pedido.id) {
        <a mat-menu-item routerLink="/pedidos" [queryParams]="{ pedido: pedido.id }">
          <span class="block text-sm font-semibold">{{ pedido.id }} · {{ pedido.customer }}</span>
          <span class="block text-xs text-muted tabular-nums">
            {{ pedido.total | currency: 'PEN' : 'symbol' : '1.2-2' }} ·
            {{ pedido.createdAt | date: 'dd/MM/yyyy HH:mm' : zonaLima }}
          </span>
        </a>
      } @empty {
        <p class="ws-menu-usuario-cuenta">No hay pedidos nuevos.</p>
      }
      <div class="ws-menu-usuario-separador" role="separator"></div>
      <a mat-menu-item routerLink="/pedidos">Ver todos los pedidos</a>
    </mat-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampanaNotificacionesComponent {
  protected readonly notificaciones = inject(NotificacionesFacade);
  /** Fechas en la hora de Lima, como el resto del Admin (PBI-0067). */
  protected readonly zonaLima = ZONA_HORARIA_LIMA;
  protected readonly contador = computed(() => contadorDeLaCampana(this.notificaciones.total()));
  protected readonly nombre = computed(() => nombreDeLaCampana(this.notificaciones.total()));
}
