import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { SesionVencidaError } from '../../sesion/domain/sesion.gateway';
import { Notificaciones } from '../domain/notificacion.model';
import { NotificacionesGateway } from '../domain/notificaciones.gateway';
import {
  hastaDelMasReciente,
  INTERVALO_DE_ACTUALIZACION_MS,
  puedeVerLaCampana,
  tituloDelMenu,
} from '../domain/notificacion.rules';

/**
 * Campana del Admin (lote 07b, ADR-0017, PBI-0033; provisional, por confirmar con Daniel): los avisos nuevos desde la
 * última vez que la persona abrió el menú. Pedidos nuevos para quien los ve (`orders.view`; también el vendedor desde
 * el lote 11, PBI-0170) y, desde el lote 13 (ADR-0021, PBI-0173), reclamos nuevos y errores de compra para quien los
 * gestiona; el BFF decide qué avisos recibe cada rol.
 * Un fallo al consultar conserva lo que había: la campana no avisa errores (el panel ya tiene sus avisos).
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesFacade {
  private readonly gateway = inject(NotificacionesGateway);
  private readonly session = inject(SesionFacade);
  private readonly documento = inject(DOCUMENT);
  private readonly estado = signal<Notificaciones | null>(null);
  /** Con el menú abierto la lista no cambia bajo la persona: la actualización automática espera a que se cierre. */
  private menuAbierto = false;

  readonly disponible = computed(() => puedeVerLaCampana((permiso) => this.session.can(permiso)));
  readonly menu = computed(() => tituloDelMenu((permiso) => this.session.can(permiso)));
  readonly total = computed(() => this.estado()?.total ?? 0);
  readonly conteo = computed(() => this.estado()?.counts ?? { orders: 0, complaints: 0, checkoutErrors: 0 });
  readonly avisos = computed(() => this.estado()?.items ?? []);

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
   * Pone al día la campana sin cambiar de página (lote 08, PBI-0160): al volver a la pestaña y cada minuto mientras
   * está visible. Con la pestaña oculta o el menú abierto no consulta. Devuelve la función que lo detiene.
   */
  iniciarActualizacion(): () => void {
    const ventana = this.documento.defaultView;
    if (!ventana) return () => undefined;
    const actualizar = () => {
      if (this.documento.visibilityState === 'visible' && !this.menuAbierto) void this.consultar();
    };
    const intervalo = ventana.setInterval(actualizar, INTERVALO_DE_ACTUALIZACION_MS);
    this.documento.addEventListener('visibilitychange', actualizar);
    return () => {
      ventana.clearInterval(intervalo);
      this.documento.removeEventListener('visibilitychange', actualizar);
    };
  }

  /**
   * Al abrir el menú: marca como vistos los avisos que se muestran (hasta el más reciente). La lista que se ve no
   * cambia mientras el menú sigue abierto; el número de la campana pasa a lo que quede sin ver.
   */
  async marcarVisto(): Promise<void> {
    this.menuAbierto = true;
    const hasta = hastaDelMasReciente(this.avisos());
    if (!hasta || !this.disponible()) return;
    try {
      const vista = await this.gateway.marcarVisto(hasta, this.session.requireToken());
      this.estado.update((actual) =>
        actual ? { ...actual, seenAt: vista.seenAt, total: vista.total, counts: vista.counts } : vista,
      );
    } catch (error) {
      if (error instanceof SesionVencidaError) this.session.expirar();
    }
  }

  /** Al cerrar el menú, la lista pasa a la del BFF (sin los que ya se vieron). */
  async alCerrar(): Promise<void> {
    this.menuAbierto = false;
    await this.consultar();
  }
}
