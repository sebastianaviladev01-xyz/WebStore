import { computed, inject, Injectable, signal } from '@angular/core';
import { TiendaGateway, ReglaTiendaError, SnapshotDesactualizadoError } from '../domain/tienda.gateway';
import { ROLES } from '../../sesion/domain/rol.rules';
import { ajustarPreciosTarifas, asignarPrecioTarifa } from '../domain/tarifa-envio.rules';
import {
  Banner,
  Marca,
  Categoria,
  Reclamo,
  Cliente,
  Pedido,
  Producto,
  SnapshotTienda,
  TarifaEnvio,
  ConfiguracionTienda,
} from '../domain/tienda.model';
import { SesionFacade } from '../../sesion/application/sesion.facade';
import { UsuarioAdmin } from '../../sesion/domain/usuario-admin.model';
/** Calcula los cambios a guardar a partir de un snapshot; se vuelve a evaluar si hay que reintentar sobre datos frescos. */
type Mutation = (snapshot: SnapshotTienda) => Partial<Omit<SnapshotTienda, 'revision'>>;
@Injectable({ providedIn: 'root' })
export class TiendaFacade {
  private readonly repo = inject(TiendaGateway);
  private readonly session = inject(SesionFacade);
  private readonly state = signal<SnapshotTienda | null>(null);
  readonly snapshot = this.state.asReadonly();
  readonly products = computed(() => this.state()?.products ?? []);
  readonly categories = computed(() => this.state()?.categories ?? []);
  readonly brands = computed(() => this.state()?.brands ?? []);
  readonly customers = computed(() => this.state()?.customers ?? []);
  readonly users = computed(() => this.state()?.users ?? []);
  /** Roles fijos que entrega el BFF; mientras carga se usa la misma tabla del dominio. */
  readonly roles = computed(() => this.state()?.roles ?? ROLES);
  readonly banners = computed(() => this.state()?.banners ?? []);
  readonly rates = computed(() => this.state()?.rates ?? []);
  readonly orders = computed(() => this.state()?.orders ?? []);
  readonly complaints = computed(() => this.state()?.complaints ?? []);
  readonly config = computed(() => this.state()?.config ?? null);
  readonly lowStock = computed(() => this.products().filter((p) => p.stock <= 5));
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.state.set(await this.repo.load(this.session.requireToken()));
    } catch {
      this.error.set(
        'No pudimos cargar la información del panel. Actualiza la página o vuelve a iniciar sesión.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  /** Guarda el cambio; devuelve false si no se pudo y deja el motivo en `error`. */
  private async patch(mutate: Mutation): Promise<boolean> {
    const original = this.state();
    if (!original) return false;
    this.error.set(null);
    // Solo viajan las colecciones modificadas; la respuesta del BFF reemplaza el estado local para no quedar con datos viejos.
    const apply = async (base: SnapshotTienda) => {
      const update = mutate(base);
      this.state.set({ ...base, ...update });
      this.state.set(
        await this.repo.save({ revision: base.revision, ...update }, this.session.requireToken()),
      );
    };
    let restore = original;
    let message = 'No pudimos guardar los cambios. La vista se restauró al último estado confirmado.';
    try {
      await apply(original);
      return true;
    } catch (error) {
      if (error instanceof ReglaTiendaError) message = error.message;
      if (error instanceof SnapshotDesactualizadoError) {
        // Hubo ventas u otros cambios mientras tanto: se recarga y se vuelve a aplicar el cambio sobre los datos vigentes.
        try {
          restore = await this.repo.load(this.session.requireToken());
          await apply(restore);
          return true;
        } catch (retryError) {
          if (retryError instanceof ReglaTiendaError) message = retryError.message;
        }
      }
    }
    this.state.set(restore);
    this.error.set(message);
    return false;
  }
  upsertProduct(item: Producto): Promise<boolean> {
    const seen = this.products().find((p) => p.id === item.id);
    // Si el formulario no tocó el stock, se conserva el del BFF (pudo bajar por ventas desde que se abrió la ficha).
    return this.patch((s) => {
      const latest = s.products.find((p) => p.id === item.id);
      const stock = latest && seen && item.stock === seen.stock ? latest.stock : item.stock;
      return { products: this.upsert(s.products, { ...item, stock }) };
    });
  }
  deleteProduct(id: string): Promise<boolean> {
    return this.patch((s) => ({ products: s.products.filter((x) => x.id !== id) }));
  }
  upsertCategory(item: Categoria): Promise<boolean> {
    return this.patch((s) => ({ categories: this.upsert(s.categories, item) }));
  }
  deleteCategory(id: string): Promise<boolean> {
    return this.patch((s) => ({ categories: s.categories.filter((x) => x.id !== id) }));
  }
  upsertBrand(item: Marca): Promise<boolean> {
    return this.patch((s) => ({ brands: this.upsert(s.brands, item) }));
  }
  deleteBrand(id: string): Promise<boolean> {
    return this.patch((s) => ({ brands: s.brands.filter((x) => x.id !== id) }));
  }
  upsertCustomer(item: Cliente): Promise<boolean> {
    return this.patch((s) => ({ customers: this.upsert(s.customers, item) }));
  }
  deleteCustomer(id: string): Promise<boolean> {
    return this.patch((s) => ({ customers: s.customers.filter((x) => x.id !== id) }));
  }
  upsertUser(item: UsuarioAdmin): Promise<boolean> {
    return this.patch((s) => ({ users: this.upsert(s.users, item) }));
  }
  deleteUser(id: string): Promise<boolean> {
    return this.patch((s) => ({ users: s.users.filter((x) => x.id !== id) }));
  }
  upsertBanner(item: Banner): Promise<boolean> {
    return this.patch((s) => ({ banners: this.upsert(s.banners, item) }));
  }
  deleteBanner(id: string): Promise<boolean> {
    return this.patch((s) => ({ banners: s.banners.filter((x) => x.id !== id) }));
  }
  upsertRate(item: TarifaEnvio): Promise<boolean> {
    return this.patch((s) => ({ rates: this.upsert(s.rates, item) }));
  }
  assignRatePrice(origin: string, destinations: readonly string[], price: number): Promise<boolean> {
    return this.patch((s) => ({
      rates: asignarPrecioTarifa(s.rates, origin, destinations, price, () => crypto.randomUUID()),
    }));
  }
  adjustRatePrices(percent: number, origin: string | null): Promise<boolean> {
    return this.patch((s) => ({ rates: ajustarPreciosTarifas(s.rates, percent, origin) }));
  }
  deleteRate(id: string): Promise<boolean> {
    return this.patch((s) => ({ rates: s.rates.filter((x) => x.id !== id) }));
  }
  updateOrder(item: Pedido): Promise<boolean> {
    return this.patch((s) => ({ orders: this.upsert(s.orders, item) }));
  }
  updateComplaint(item: Reclamo): Promise<boolean> {
    return this.patch((s) => ({ complaints: this.upsert(s.complaints, item) }));
  }
  updateConfig(config: ConfiguracionTienda): Promise<boolean> {
    return this.patch(() => ({ config }));
  }
  private upsert<T extends { id: string }>(items: readonly T[], item: T): readonly T[] {
    return items.some((x) => x.id === item.id)
      ? items.map((x) => (x.id === item.id ? item : x))
      : [...items, item];
  }
}
