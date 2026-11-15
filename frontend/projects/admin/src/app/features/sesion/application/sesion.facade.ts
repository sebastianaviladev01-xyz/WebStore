import { computed, inject, Injectable, signal } from '@angular/core';

import { AVISO_SESION_VENCIDA, SesionGateway, SesionError } from '../domain/sesion.gateway';
import { Permiso, Rol, rolPuede, definicionDeRol } from '../domain/rol.rules';
import { UsuarioAdmin } from '../domain/usuario-admin.model';

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
    this.clear();
    this.error.set(AVISO_SESION_VENCIDA);
  }

  /** Token vigente para los adaptadores HTTP; sin sesión no se debe llegar a llamar al BFF. */
  requireToken(): string {
    const token = this.tokenState();
    if (!token) throw new Error('ADMIN_AUTHENTICATION_REQUIRED');
    return token;
  }

  private async restore(): Promise<void> {
    const token = this.tokenState();
    if (!token) return;
    try {
      this.userState.set(await this.auth.current(token));
    } catch {
      this.clear();
    }
  }

  private clear(): void {
    this.userState.set(null);
    this.tokenState.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }
}
