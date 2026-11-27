import { computed, inject, Injectable, signal } from '@angular/core';

import {
  AVISO_SESION_VENCIDA,
  PerfilError,
  SesionGateway,
  SesionError,
  SesionVencidaError,
} from '../domain/sesion.gateway';
import { Permiso, Rol, rolPuede, definicionDeRol } from '../domain/rol.rules';
import { UsuarioAdmin } from '../domain/usuario-admin.model';
import {
  Borrador,
  borradoresAlIngresar,
  conBorrador,
  rutaDeRetorno,
  tomarBorrador,
} from '../domain/borrador.rules';

const SESSION_KEY = 'webstore-admin-session-v1';

@Injectable({ providedIn: 'root' })
export class SesionFacade {
  private readonly auth = inject(SesionGateway);
  private readonly userState = signal<UsuarioAdmin | null>(null);
  private readonly tokenState = signal<string | null>(sessionStorage.getItem(SESSION_KEY));
  private readonly readyPromise: Promise<void>;

  readonly user = this.userState.asReadonly();
  readonly token = this.tokenState.asReadonly();
  readonly role = computed<Rol | null>(() => this.user()?.role ?? null);
  readonly roleLabel = computed(() => definicionDeRol(this.role())?.label ?? '');
  readonly isAuthenticated = computed(() => !!this.user());
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  /**
   * Lote 40 (ADR-0032, PBI-0257; confirmado por Sebastián Avila): hay token, pero el BFF no respondió o falló
   * al comprobarlo. El token se conserva y el acceso ofrece «Reintentar»; sin usuario, los guards no dejan entrar al
   * panel. Solo un `401` borra el token.
   */
  private readonly sinComprobarState = signal(false);
  readonly sesionSinComprobar = this.sinComprobarState.asReadonly();
  /** Hay un reintento de la comprobación en curso: el acceso desactiva «Reintentar». */
  private readonly comprobandoState = signal(false);
  readonly comprobando = this.comprobandoState.asReadonly();
  /** Página que se quiso abrir mientras la sesión estaba sin comprobar; el acceso lleva a ella tras reintentar. */
  private rutaSinComprobar: string | null = null;
  /**
   * PBI-0151: quién tenía la sesión que venció y en qué página estaba. Lo escrito en los formularios se guarda en
   * `borradores`, solo en memoria; se recupera al volver a ingresar la misma persona en la misma pestaña.
   */
  private vencimiento: { readonly usuarioId: string; ruta: string | null } | null = null;
  private borradores: readonly Borrador[] = [];
  private retorno = '/';

  constructor() {
    this.readyPromise = this.restore();
  }

  ensureReady(): Promise<void> {
    return this.readyPromise;
  }

  can(permission: Permiso): boolean {
    return rolPuede(this.role(), permission);
  }

  async login(email: string, password: string): Promise<boolean> {
    if (this.pending()) return false;
    this.pending.set(true);
    this.error.set(null);
    try {
      const grant = await this.auth.login(email, password);
      // PBI-0151: la misma persona recupera sus borradores y vuelve a la página donde venció; otra, no.
      const misma = this.vencimiento?.usuarioId === grant.user.id;
      this.borradores = borradoresAlIngresar(this.borradores, grant.user.id);
      this.retorno = rutaDeRetorno(misma ? this.vencimiento?.ruta : null);
      this.vencimiento = null;
      this.sinComprobarState.set(false);
      this.rutaSinComprobar = null;
      this.tokenState.set(grant.token);
      this.userState.set(grant.user);
      sessionStorage.setItem(SESSION_KEY, grant.token);
      return true;
    } catch (error) {
      this.error.set(error instanceof SesionError ? error.message : 'No pudimos iniciar sesión.');
      return false;
    } finally {
      this.pending.set(false);
    }
  }

  async logout(): Promise<void> {
    const token = this.tokenState();
    this.vencimiento = null;
    this.borradores = [];
    this.clear();
    if (!token) return;
    try {
      await this.auth.logout(token);
    } catch {
      /* La sesión del navegador ya se cerró. */
    }
  }

  /**
   * El BFF rechazó la sesión a mitad de una operación (PBI-0124): se cierra en el navegador y el acceso muestra el
   * motivo. `AppLayout` lleva al acceso cuando deja de haber usuario.
   */
  expirar(): void {
    if (!this.tokenState()) return;
    const usuario = this.userState();
    if (usuario) this.vencimiento = { usuarioId: usuario.id, ruta: null };
    this.clear();
    this.error.set(AVISO_SESION_VENCIDA);
  }

  /** `true` desde que la sesión venció hasta que alguien vuelve a ingresar o se cierra la sesión (PBI-0151). */
  sesionVencida(): boolean {
    return this.vencimiento !== null && !this.userState();
  }

  /** Página del panel en la que venció la sesión (`AppLayout`, antes de ir al acceso). */
  anotarRutaVencida(ruta: string): void {
    if (this.vencimiento && !this.userState()) this.vencimiento.ruta = ruta;
  }

  /** Guarda en memoria lo escrito en un formulario de la página `ruta` cuando la sesión venció. */
  guardarBorrador(ruta: string, valor: unknown): void {
    if (!this.sesionVencida() || !this.vencimiento) return;
    this.borradores = conBorrador(this.borradores, { usuarioId: this.vencimiento.usuarioId, ruta, valor });
  }

  /** El borrador de la página para quien tiene la sesión, una sola vez; `null` si no hay. */
  tomarBorrador(ruta: string): unknown {
    const usuario = this.userState();
    if (!usuario) return null;
    const { borrador, resto } = tomarBorrador(this.borradores, usuario.id, ruta);
    this.borradores = resto;
    return borrador?.valor ?? null;
  }

  /** Anota la página que se quiso abrir con la sesión sin comprobar (`sesionGuard`), para volver a ella al reintentar. */
  anotarRutaSinComprobar(ruta: string): void {
    if (this.sinComprobarState() && !this.userState()) this.rutaSinComprobar = ruta;
  }

  /**
   * Vuelve a comprobar la sesión sin comprobar (PBI-0257). Si responde, queda el usuario y `tomarRetorno()` lleva a la
   * página anotada; si es un `401`, se borra el token y el acceso dice que la sesión venció; si vuelve a fallar, todo
   * sigue igual. Devuelve `true` si ya hay usuario.
   */
  async reintentarComprobacion(): Promise<boolean> {
    const token = this.tokenState();
    if (!token || !this.sinComprobarState() || this.comprobandoState()) return false;
    this.comprobandoState.set(true);
    this.error.set(null);
    try {
      if (await this.comprobar(token)) {
        this.retorno = rutaDeRetorno(this.rutaSinComprobar);
        this.rutaSinComprobar = null;
        return true;
      }
      if (!this.tokenState()) this.error.set(AVISO_SESION_VENCIDA);
      return false;
    } finally {
      this.comprobandoState.set(false);
    }
  }

  /** Página a la que lleva el acceso tras ingresar: donde venció la sesión de la misma persona, o el Dashboard. */
  tomarRetorno(): string {
    const ruta = this.retorno;
    this.retorno = '/';
    return ruta;
  }

  /**
   * Guarda el nombre y el correo de la persona (lote 07b, PBI-0034). Devuelve `null` si se guardó o el motivo, con el
   * campo al que corresponde; un `401` cierra la sesión (PBI-0124).
   */
  async actualizarPerfil(datos: {
    readonly name: string;
    readonly email: string;
  }): Promise<PerfilError | null> {
    try {
      this.userState.set(await this.auth.actualizarPerfil(datos, this.requireToken()));
      return null;
    } catch (error) {
      return this.motivoDelPerfil(error);
    }
  }

  /** Cambia la contraseña pidiendo la actual (PBI-0034); el BFF cierra las demás sesiones y conserva esta. */
  async cambiarContrasena(actual: string, nueva: string): Promise<PerfilError | null> {
    try {
      await this.auth.cambiarContrasena(actual, nueva, this.requireToken());
      return null;
    } catch (error) {
      return this.motivoDelPerfil(error);
    }
  }

  private motivoDelPerfil(error: unknown): PerfilError {
    if (error instanceof SesionVencidaError) {
      this.expirar();
      return new PerfilError(AVISO_SESION_VENCIDA);
    }
    return error instanceof PerfilError
      ? error
      : new PerfilError('No pudimos guardar el cambio. Inténtalo de nuevo.');
  }

  /** Token vigente para los adaptadores HTTP; sin sesión no se debe llegar a llamar al BFF. */
  requireToken(): string {
    const token = this.tokenState();
    if (!token) throw new Error('ADMIN_AUTHENTICATION_REQUIRED');
    return token;
  }

  private async restore(): Promise<void> {
    const token = this.tokenState();
    if (token) await this.comprobar(token);
  }

  /**
   * Pide el usuario del token. Solo un `401` (la sesión ya no vale) borra el token; un fallo de red o del servidor lo
   * conserva y deja la sesión sin comprobar (PBI-0257). Si mientras tanto alguien ingresó o cerró la sesión, la
   * respuesta de este token ya no cuenta.
   */
  private async comprobar(token: string): Promise<boolean> {
    try {
      const usuario = await this.auth.current(token);
      if (this.tokenState() !== token) return false;
      this.userState.set(usuario);
      this.sinComprobarState.set(false);
      return true;
    } catch (error) {
      if (this.tokenState() !== token) return false;
      if (error instanceof SesionVencidaError) this.clear();
      else this.sinComprobarState.set(true);
      return false;
    }
  }

  private clear(): void {
    this.userState.set(null);
    this.tokenState.set(null);
    this.sinComprobarState.set(false);
    this.rutaSinComprobar = null;
    sessionStorage.removeItem(SESSION_KEY);
  }
}
