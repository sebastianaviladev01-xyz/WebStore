import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { Pedido, PedidoRegistrado, DireccionEnvio } from '../domain/pedido.model';
import { BffRequestError, messageOf } from '../../../core/bff-request.error';
import { CambioPedido, CredencialesPedido, PedidoGateway } from '../domain/pedido.gateway';
import { estaAbierto, modificableHasta, sePuedeModificar } from '../domain/pedido.rules';
import { CuentaFacade } from '../../cuenta/application/cuenta.facade';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';

/**
 * Tokens de acceso de pedidos hechos como invitado en este dispositivo (id → token). Nunca se guardan datos del
 * pedido ni los tokens de los pedidos hechos con la sesión iniciada: esos se ven con la cuenta (PBI-0104).
 */
const ACCESS_KEY = 'webstore-order-access-v1';
const FALLBACK = 'No pudimos completar la solicitud. Inténtalo nuevamente.';
/** El BFF ya no deja cambiar el pedido: se vuelve a pedir para mostrar su estado real (PBI-0143). */
const YA_NO_MODIFICABLE = new Set(['ORDER_NOT_MODIFIABLE', 'ORDER_WINDOW_EXPIRED']);

@Injectable({ providedIn: 'root' })
export class PedidosFacade {
  private readonly gateway = inject(PedidoGateway);
  private readonly auth = inject(CuentaFacade);
  private readonly catalog = inject(CatalogoFacade);
  private readonly ordersState = signal<readonly Pedido[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly orders = computed(() =>
    [...this.ordersState()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  constructor() {
    // Al cerrar sesión, al eliminar la cuenta o al iniciar sesión otra persona, no queda a la vista ningún pedido de
    // la sesión anterior (PBI-0104): «Mis pedidos» los vuelve a pedir con la sesión vigente.
    let previous = untracked(this.auth.sessionToken);
    effect(() => {
      const current = this.auth.sessionToken();
      if (current === previous) return;
      previous = current;
      untracked(() => {
        this.ordersState.set([]);
        this.errorState.set(null);
      });
    });
  }

  /**
   * Registra el pedido recién creado. Si se hizo como invitado, conserva su token para que pueda volver a
   * consultarlo desde este dispositivo; con la sesión iniciada no, porque lo ve la cuenta (PBI-0104).
   */
  remember(placed: PedidoRegistrado): void {
    const { accessToken, ...order } = placed;
    if (!this.auth.sessionToken()) this.writeAccess({ ...this.readAccess(), [order.id]: accessToken });
    this.replace(order);
  }

  /** Pedidos de la cuenta autenticada más los pedidos de invitado hechos en este dispositivo. */
  async loadAll(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      let mine: readonly Pedido[] = [];
      const session = this.auth.sessionToken();
      if (session) {
        try {
          mine = await this.gateway.listMine(session);
        } catch (error) {
          // La sesión venció en el BFF: se cierra también en la tienda, que deja de mostrar «Mi cuenta» (PBI-0114).
          if (error instanceof BffRequestError && error.code === 'AUTHENTICATION_REQUIRED')
            this.auth.expire();
          this.errorState.set(messageOf(error, FALLBACK));
        }
      }
      const guestIds = Object.keys(this.readAccess()).filter((id) => !mine.some((order) => order.id === id));
      const guest = await Promise.all(guestIds.map((id) => this.fetch(id)));
      this.ordersState.set([...mine, ...guest.filter((order): order is Pedido => order !== null)]);
    } finally {
      this.loadingState.set(false);
    }
  }

  /** Pide el pedido al BFF. Si falla por otra causa que no sea un 404, deja el error para mostrarlo. */
  async load(id: string): Promise<Pedido | null> {
    this.errorState.set(null);
    const order = await this.fetch(id, true);
    if (order) this.replace(order);
    return order;
  }

  get(id: string): Pedido | null {
    return this.ordersState().find((order) => order.id === id) ?? null;
  }

  /** Hasta cuándo se puede cambiar la entrega o cancelar el pedido (24 horas desde la compra). */
  editableUntil(order: Pedido): Date {
    return modificableHasta(order);
  }

  /** La misma regla que el BFF: abierto (ni enviado, ni entregado, ni cancelado) y dentro de las 24 horas. */
  canModify(order: Pedido): boolean {
    return sePuedeModificar(order, new Date());
  }

  /** El pedido no se envió, no se entregó ni se canceló. */
  isOpen(order: Pedido): boolean {
    return estaAbierto(order);
  }

  updateShipping(id: string, shipping: DireccionEnvio): Promise<boolean> {
    return this.change(id, { action: 'shipping', payload: { shipping } });
  }

  updateDeliveryDate(id: string, deliveryDate: string): Promise<boolean> {
    return this.change(id, { action: 'delivery-date', payload: { deliveryDate } });
  }

  async cancel(id: string): Promise<boolean> {
    const ok = await this.change(id, { action: 'cancel', payload: {} });
    // La cancelación libera stock en el BFF; se refresca el catálogo para mostrarlo de inmediato.
    if (ok) void this.catalog.load();
    return ok;
  }

  private async change(id: string, change: CambioPedido): Promise<boolean> {
    const current = this.get(id);
    if (!current || !this.canModify(current)) return false;
    this.errorState.set(null);
    try {
      this.replace(await this.gateway.change(id, change, this.credentials(id)));
      return true;
    } catch (error) {
      const message = messageOf(error, FALLBACK);
      if (error instanceof BffRequestError && YA_NO_MODIFICABLE.has(error.code ?? '')) {
        const order = await this.fetch(id);
        if (order) this.replace(order);
      }
      this.errorState.set(message);
      return false;
    }
  }

  private async fetch(id: string, reportError = false): Promise<Pedido | null> {
    try {
      return await this.gateway.get(id, this.credentials(id));
    } catch (error) {
      // El BFF ya no reconoce ese pedido o ya no lo autoriza (p. ej. datos de demo reiniciados, o se cerró la
      // sesión): se olvidan su token y la copia en memoria, para no mostrarlo ni reintentarlo (PBI-0104).
      if (error instanceof BffRequestError && error.status === 404) {
        this.forgetAccess(id);
        this.ordersState.update((items) => items.filter((item) => item.id !== id));
      } else if (reportError) this.errorState.set(messageOf(error, FALLBACK));
      return null;
    }
  }

  private credentials(orderId: string): CredencialesPedido {
    return { sessionToken: this.auth.sessionToken(), accessToken: this.readAccess()[orderId] };
  }

  private replace(order: Pedido): void {
    this.ordersState.update((items) =>
      items.some((item) => item.id === order.id)
        ? items.map((item) => (item.id === order.id ? order : item))
        : [order, ...items],
    );
  }

  private readAccess(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(ACCESS_KEY) ?? '{}') as Record<string, string>;
    } catch {
      return {};
    }
  }

  private forgetAccess(orderId: string): void {
    const { [orderId]: _forgotten, ...rest } = this.readAccess();
    this.writeAccess(rest);
  }

  private writeAccess(access: Record<string, string>): void {
    try {
      localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
    } catch {
      /* sin almacenamiento, el pedido sigue disponible para la cuenta */
    }
  }
}
