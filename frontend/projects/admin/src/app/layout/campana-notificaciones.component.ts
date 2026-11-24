import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

import { NotificacionesFacade } from '../features/notificaciones/application/notificaciones.facade';
import {
  contadorDeLaCampana,
  nombreDeLaCampana,
  presentacionDelAviso,
} from '../features/notificaciones/domain/notificacion.rules';
import { ZONA_HORARIA_LIMA } from '../features/tienda/domain/pedido.rules';

/**
 * Campana de la cabecera del Admin (lote 07b, ADR-0017, PBI-0033; confirmada por Daniel el 2026-11-18). El número
 * cuenta los avisos nuevos desde la última vez que la persona abrió el menú; al abrirlo se marcan como vistos. Desde el
 * lote 13 (ADR-0021, PBI-0173), además de los pedidos nuevos, los reclamos nuevos y los errores de compra, cada uno
 * con su página (`presentacionDelAviso`). Usa `MatMenu`, como el menú de usuario: foco, flechas, Escape y clic
 * fuera los resuelve Material. Solo existe para los roles que reciben avisos.
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
        <strong>{{ notificaciones.menu().titulo }}</strong>
        <span>Desde la última vez que abriste este menú</span>
      </p>
      <div class="ws-menu-usuario-separador" role="separator"></div>
      @for (aviso of notificaciones.avisos(); track aviso.type + aviso.id) {
        @let vista = presentar(aviso);
        <a mat-menu-item [routerLink]="vista.ruta" [queryParams]="vista.parametros">
          <span class="block text-sm font-semibold">{{ vista.titulo }}</span>
          <span class="block text-xs text-muted tabular-nums">
            @if (aviso.type === 'order') {
              {{ aviso.total | currency: 'PEN' : 'symbol' : '1.2-2' }} ·
            } @else if (vista.detalle) {
              {{ vista.detalle }} ·
            }
            {{ aviso.at | date: 'dd/MM/yyyy HH:mm' : zonaLima }}
          </span>
        </a>
      } @empty {
        <p class="ws-menu-usuario-cuenta">{{ notificaciones.menu().vacio }}</p>
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
  protected readonly nombre = computed(() => nombreDeLaCampana(this.notificaciones.conteo()));
  protected readonly presentar = presentacionDelAviso;
}
