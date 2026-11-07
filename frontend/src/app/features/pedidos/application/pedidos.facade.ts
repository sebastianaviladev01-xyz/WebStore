import { computed, inject, Injectable, signal } from '@angular/core';

import { Pedido, PedidoRegistrado, DireccionEnvio } from '../domain/pedido.model';
import { BffRequestError, messageOf } from '../../../core/bff-request.error';
import { CambioPedido, CredencialesPedido, PedidoGateway } from '../domain/pedido.gateway';
import { CuentaFacade } from '../../cuenta/application/cuenta.facade';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';

/** Tokens de acceso de pedidos hechos como invitado en este dispositivo (id → token). Nunca se guardan datos del pedido. */
const ACCESS_KEY = 'webstore-order-access-v1';
const MODIFIABLE_FOR_MS = 24 * 60 * 60 * 1000;
const FALLBACK = 'No pudimos completar la solicitud. Inténtalo nuevamente.';

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

  /** Registra el pedido recién creado y conserva su token para que el invitado pueda volver a consultarlo. */
  remember(placed: PedidoRegistrado): void {
    const { accessToken, ...order } = placed;
    this.writeAccess({ ...this.readAccess(), [order.id]: accessToken });
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

  async load(id: string): Promise<Pedido | null> {
    const order = await this.fetch(id);
    if (order) this.replace(order);
    return order;
  }

  get(id: string): Pedido | null {
    return this.ordersState().find((order) => order.id === id) ?? null;
  }

  /** Hasta cuándo se puede cambiar la entrega o cancelar el pedido (24 horas desde la compra). */
  editableUntil(order: Pedido): Date {
    return new Date(new Date(order.createdAt).getTime() + MODIFIABLE_FOR_MS);
  }

  canModify(order: Pedido): boolean {
    return (
      Date.now() - new Date(order.createdAt).getTime() <= MODIFIABLE_FOR_MS && order.status !== 'cancelled'
    );
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
      this.errorState.set(messageOf(error, FALLBACK));
      return false;
    }
  }

  private async fetch(id: string): Promise<Pedido | null> {
    try {
      return await this.gateway.get(id, this.credentials(id));
    } catch (error) {
      // El BFF ya no reconoce ese pedido (p. ej. datos de demo reiniciados): se olvida su token para no reintentarlo.
      if (error instanceof BffRequestError && error.status === 404) this.forgetAccess(id);
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
