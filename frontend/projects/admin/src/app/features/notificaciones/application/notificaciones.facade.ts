import { computed, inject, Injectable, signal } from '@angular/core';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { SesionVencidaError } from '../../sesion/domain/sesion.gateway';
import { Notificaciones } from '../domain/notificacion.model';
import { NotificacionesGateway } from '../domain/notificaciones.gateway';
import { hastaDelMasReciente } from '../domain/notificacion.rules';

/**
 * Campana del Admin (lote 07b, ADR-0017, PBI-0033; provisional, por confirmar con Daniel): los pedidos nuevos (estado
 * «confirmado») desde la última vez que la persona abrió el menú. Solo para los roles con pedidos (`orders.manage`).
 * Un fallo al consultar conserva lo que había: la campana no avisa errores (el panel ya tiene sus avisos).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesFacade {
  private readonly gateway = inject(NotificacionesGateway);
  private readonly session = inject(SesionFacade);
  private readonly estado = signal<Notificaciones | null>(null);

  readonly disponible = computed(() => this.session.can('orders.manage'));
  readonly total = computed(() => this.estado()?.total ?? 0);
  readonly pedidos = computed(() => this.estado()?.orders ?? []);

  /** Vuelve a consultar (al entrar a cada página del panel). */
  async consultar(): Promise<void> {
    if (!this.disponible()) {
      this.estado.set(null);
      return;
    }
    try {
      this.estado.set(await this.gateway.consultar(this.session.requireToken()));
    } catch (error) {
      if (error instanceof SesionVencidaError) this.session.expirar();
    }
  }

  /**
   * Al abrir el menú: marca como vistos los pedidos que se muestran (hasta el más reciente). La lista que se ve no
   * cambia mientras el menú sigue abierto; el número de la campana pasa a lo que quede sin ver.
   */
  async marcarVisto(): Promise<void> {
    const hasta = hastaDelMasReciente(this.pedidos());
    if (!hasta || !this.disponible()) return;
    try {
      const vista = await this.gateway.marcarVisto(hasta, this.session.requireToken());
      this.estado.update((actual) =>
        actual ? { ...actual, seenAt: vista.seenAt, total: vista.total } : vista,
      );
    } catch (error) {
      if (error instanceof SesionVencidaError) this.session.expirar();
    }
  }

  /** Al cerrar el menú, la lista pasa a la del BFF (sin los que ya se vieron). */
  async alCerrar(): Promise<void> {
    await this.consultar();
  }
}
