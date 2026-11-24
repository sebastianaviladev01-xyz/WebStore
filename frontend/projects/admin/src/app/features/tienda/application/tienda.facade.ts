import { computed, inject, Injectable, signal } from '@angular/core';
import {
  CambiosTienda,
  ColeccionEditable,
  ReglaTiendaError,
  SnapshotDesactualizadoError,
  TiendaGateway,
} from '../domain/tienda.gateway';
import {
  avisoDeCambio,
  cambiosEntreListas,
  prepararCambio,
  ResultadoCambio,
} from '../domain/cambio-registro.rules';
import { SesionVencidaError } from '../../sesion/domain/sesion.gateway';
import { ROLES } from '../../sesion/domain/rol.rules';
import { conPocoStock } from '../domain/inventario.rules';
import { asignarPrecioTarifa } from '../domain/tarifa-envio.rules';
import {
  Banner,
  Marca,
  Categoria,
  Reclamo,
  Cliente,
  EstadoPedido,
  Pedido,
  Producto,
  SnapshotTienda,
  TarifaEnvio,
  ConfiguracionTienda,
  DiaNoLaborable,
} from '../domain/tienda.model';
import { SesionFacade } from '../../sesion/application/sesion.facade';
import { UsuarioAdmin } from '../../sesion/domain/usuario-admin.model';
/**
 * Lo que hay que hacer sobre un snapshot: enviar cambios, avisar que no se puede (sin enviar) o nada, porque ya
 * está hecho. Se calcula otra vez sobre los datos recién cargados si el BFF responde `409 STALE_SNAPSHOT`.
 */
type Plan =
  | { readonly enviar: Omit<CambiosTienda, 'revision'> }
  | { readonly aviso: string }
  | { readonly hecho: true };
type Planificar = (snapshot: SnapshotTienda) => Plan;

const MENSAJE_GUARDADO = 'No pudimos guardar los cambios. Inténtalo de nuevo.';
const MENSAJE_DESACTUALIZADO =
  'Los datos cambiaron otra vez mientras guardabas. Revisa los datos actuales y vuelve a intentarlo.';
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
  /** Calendario de días no laborables (lote 17, PBI-0183); vacío para quien no tiene `content.manage`. */
  readonly nonWorkingDates = computed(() => this.state()?.nonWorkingDates ?? []);
  readonly lowStock = computed(() => this.products().filter((p) => conPocoStock(p.stock)));
  readonly loading = signal(false);
  /** Hay un guardado en curso (PBI-0121): los formularios desactivan «Guardar» y no envían otro. */
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  /**
   * La última consulta al entrar a una página falló y el panel muestra los datos de la anterior (lote 08, PBI-0085):
   * antes lo hacía sin decirlo. Se quita en cuanto una consulta responde.
   */
  readonly desactualizado = signal(false);
  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.state.set(await this.repo.load(this.session.requireToken()));
      this.desactualizado.set(false);
    } catch (error) {
      if (error instanceof SesionVencidaError) this.session.expirar();
      this.error.set(
        'No pudimos cargar la información del panel. Actualiza la página o vuelve a iniciar sesión.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  /**
   * Datos de una página al entrar (lote 07, PBI-0140; sin «Actualizar» en la cabecera): la primera vez se cargan con
   * el aviso de carga y de error del panel (`load()`); después se vuelven a consultar sin aviso global
   * (`refresh()`), y un fallo conserva lo que había.
   */
  async entrar(): Promise<void> {
    if (this.state()) {
      if (!(await this.refresh())) this.desactualizado.set(true);
    } else await this.load();
  }
  /**
   * Motivo del último guardado fallido, para la página que lo muestra junto a su botón (PBI-0150): lo quita del aviso
   * general del panel, para que un lector de pantalla no lo lea dos veces.
   */
  tomarError(): string | null {
    const error = this.error();
    this.error.set(null);
    return error;
  }
  /**
   * Vuelve a pedir el snapshot para trabajar con los datos actuales («Buscar» y la edición de un registro). Si el
   * BFF responde, reemplaza el estado y devuelve `true`; si falla, conserva el estado y devuelve `false`. No toca
   * `loading` ni `error`, para que la página avise junto a su panel sin el aviso global de la cabecera.
   */
  async refresh(): Promise<boolean> {
    try {
      this.state.set(await this.repo.load(this.session.requireToken()));
      this.desactualizado.set(false);
      return true;
    } catch (error) {
      if (error instanceof SesionVencidaError) this.session.expirar();
      return false;
    }
  }
  /**
   * Guarda lo que planifica `planificar` sobre el snapshot cargado (lote 06). Solo viajan los registros y los campos
   * que cambió la persona; la respuesta del BFF reemplaza el estado (no hay actualización optimista que deshacer, así
   * que un fallo no reescribe los formularios). Ante `409 STALE_SNAPSHOT` recarga y vuelve a planificar sobre los
   * datos vigentes: si el registro ya no existe o alguien cambió esos mismos campos, no guarda y avisa (PBI-0120 y
   * PBI-0142). Un `401` cierra la sesión (PBI-0124). Devuelve false si no se guardó y deja el motivo en `error`.
   */
  private async guardar(planificar: Planificar): Promise<boolean> {
    const original = this.state();
    if (!original || this.saving()) return false;
    this.saving.set(true);
    this.error.set(null);
    let base = original;
    try {
      for (let intento = 1; intento <= 2; intento++) {
        const plan = planificar(base);
        if ('hecho' in plan) return true;
        if ('aviso' in plan) {
          this.error.set(plan.aviso);
          return false;
        }
        try {
          this.state.set(
            await this.repo.save({ revision: base.revision, ...plan.enviar }, this.session.requireToken()),
          );
          return true;
        } catch (error) {
          if (!(error instanceof SnapshotDesactualizadoError)) throw error;
          if (intento === 2) {
            this.error.set(MENSAJE_DESACTUALIZADO);
            return false;
          }
          // Hubo ventas u otros cambios mientras tanto: se recarga y se vuelve a planificar sobre los datos vigentes.
          base = await this.repo.load(this.session.requireToken());
        }
      }
      return false;
    } catch (error) {
      if (error instanceof SesionVencidaError) this.session.expirar();
      else this.error.set(error instanceof ReglaTiendaError ? error.message : MENSAJE_GUARDADO);
      return false;
    } finally {
      // Si se recargó y no se guardó, la vista queda con los datos vigentes.
      if (base !== original && this.state() === original) this.state.set(base);
      this.saving.set(false);
    }
  }
  /** Plan para un resultado de `prepararCambio`: enviar el cambio, avisar o nada (ya está hecho). */
  private plan(coleccion: ColeccionEditable, resultado: ResultadoCambio): Plan {
    if (resultado.tipo === 'listo') return { enviar: { [coleccion]: { upsert: [resultado.cambio] } } };
    const aviso = avisoDeCambio(resultado);
    return aviso ? { aviso } : { hecho: true };
  }
  /** Guarda un registro: `base` es como lo vio la persona al empezar (`null` si es nuevo) y `editado`, como quedó. */
  private guardarRegistro<T extends { readonly id: string }>(
    coleccion: ColeccionEditable,
    base: T | null,
    editado: T,
  ): Promise<boolean> {
    return this.guardar((snapshot) => {
      const vigentes = snapshot[coleccion] as readonly { readonly id: string }[];
      const vigente = vigentes.find((item) => item.id === editado.id) as T | undefined;
      return this.plan(coleccion, prepararCambio(vigente, base, editado));
    });
  }
  /** Elimina un registro; si ya no está en los datos vigentes, no hay nada que hacer. */
  private eliminarRegistro(coleccion: ColeccionEditable, id: string): Promise<boolean> {
    return this.guardar((snapshot) =>
      (snapshot[coleccion] as readonly { readonly id: string }[]).some((item) => item.id === id)
        ? { enviar: { [coleccion]: { remove: [id] } } }
        : { hecho: true },
    );
  }
  /** Aplica una operación sobre toda la colección vigente y envía solo los registros que cambian (tarifas). */
  private guardarLista<T extends { readonly id: string }>(
    coleccion: ColeccionEditable,
    operar: (vigentes: readonly T[]) => readonly T[],
  ): Promise<boolean> {
    return this.guardar((snapshot) => {
      const vigentes = snapshot[coleccion] as unknown as readonly T[];
      const cambios = cambiosEntreListas(vigentes, operar(vigentes));
      return cambios.upsert.length || cambios.remove.length
        ? { enviar: { [coleccion]: cambios } }
        : { hecho: true };
    });
  }
  guardarProducto(base: Producto | null, editado: Producto): Promise<boolean> {
    return this.guardarRegistro('products', base, editado);
  }
  eliminarProducto(id: string): Promise<boolean> {
    return this.eliminarRegistro('products', id);
  }
  guardarCategoria(base: Categoria | null, editado: Categoria): Promise<boolean> {
    return this.guardarRegistro('categories', base, editado);
  }
  eliminarCategoria(id: string): Promise<boolean> {
    return this.eliminarRegistro('categories', id);
  }
  guardarMarca(base: Marca | null, editado: Marca): Promise<boolean> {
    return this.guardarRegistro('brands', base, editado);
  }
  eliminarMarca(id: string): Promise<boolean> {
    return this.eliminarRegistro('brands', id);
  }
  guardarCliente(base: Cliente | null, editado: Cliente): Promise<boolean> {
    return this.guardarRegistro('customers', base, editado);
  }
  eliminarCliente(id: string): Promise<boolean> {
    return this.eliminarRegistro('customers', id);
  }
  guardarUsuario(base: UsuarioAdmin | null, editado: UsuarioAdmin): Promise<boolean> {
    return this.guardarRegistro('users', base, editado);
  }
  eliminarUsuario(id: string): Promise<boolean> {
    return this.eliminarRegistro('users', id);
  }
  guardarBanner(base: Banner | null, editado: Banner): Promise<boolean> {
    return this.guardarRegistro('banners', base, editado);
  }
  eliminarBanner(id: string): Promise<boolean> {
    return this.eliminarRegistro('banners', id);
  }
  guardarTarifa(base: TarifaEnvio | null, editado: TarifaEnvio): Promise<boolean> {
    return this.guardarRegistro('rates', base, editado);
  }
  eliminarTarifa(id: string): Promise<boolean> {
    return this.eliminarRegistro('rates', id);
  }
  assignRatePrice(origin: string, destinations: readonly string[], price: number): Promise<boolean> {
    return this.guardarLista<TarifaEnvio>('rates', (rates) =>
      asignarPrecioTarifa(rates, origin, destinations, price, () => crypto.randomUUID()),
    );
  }
  /** Cambia el estado de un pedido; si otra persona lo cambió mientras tanto, no lo pisa (PBI-0120). */
  cambiarEstadoPedido(base: Pedido, status: EstadoPedido): Promise<boolean> {
    return this.guardar((snapshot) => {
      const vigente = snapshot.orders.find((item) => item.id === base.id);
      return this.plan(
        'orders',
        prepararCambio(
          vigente && { id: vigente.id, status: vigente.status },
          { id: base.id, status: base.status },
          { id: base.id, status },
        ),
      );
    });
  }
  /** Agrega un día no laborable (lote 17, PBI-0183); el BFF lo valida y lo ordena por fecha. */
  agregarDiaNoLaborable(dia: DiaNoLaborable): Promise<boolean> {
    return this.guardarRegistro('nonWorkingDates', null, dia);
  }
  quitarDiaNoLaborable(id: string): Promise<boolean> {
    return this.eliminarRegistro('nonWorkingDates', id);
  }
  guardarReclamo(base: Reclamo, editado: Reclamo): Promise<boolean> {
    return this.guardarRegistro('complaints', base, editado);
  }
  /** Guarda solo las claves de la configuración que cambió la persona (PBI-0120 y PBI-0125). */
  guardarConfiguracion(base: ConfiguracionTienda, editado: ConfiguracionTienda): Promise<boolean> {
    return this.guardar((snapshot) => {
      const resultado = prepararCambio(
        { id: 'config', ...snapshot.config },
        { id: 'config', ...base },
        { id: 'config', ...editado },
      );
      if (resultado.tipo !== 'listo') {
        const aviso = avisoDeCambio(resultado);
        return aviso ? { aviso } : { hecho: true };
      }
      const config: Record<string, unknown> = { ...resultado.cambio };
      delete config['id'];
      return { enviar: { config: config as Partial<ConfiguracionTienda> } };
    });
  }
}
