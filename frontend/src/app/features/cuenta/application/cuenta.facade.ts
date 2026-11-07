import { computed, inject, Injectable, signal } from '@angular/core';

import { CuentaCliente, RegistrarCuentaCommand } from '../domain/cuenta.model';
import { CuentaGateway, CambioPerfil } from '../domain/cuenta.gateway';
import { messageOf } from '../../../core/bff-request.error';

const SESSION_KEY = 'webstore-account-session-v1';
const FALLBACK = 'No pudimos completar la solicitud. Inténtalo nuevamente.';

export interface ApiResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly testCode?: string;
}

@Injectable({ providedIn: 'root' })
export class CuentaFacade {
  private readonly gateway = inject(CuentaGateway);
  private readonly userState = signal<CuentaCliente | null>(null);
  private readonly tokenState = signal<string | null>(sessionStorage.getItem(SESSION_KEY));

  readonly currentUser = this.userState.asReadonly();
  /** Token de la sesión de cliente, para adjuntarlo en consultas protegidas (p. ej. pedidos). */
  readonly sessionToken = this.tokenState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly pending = signal(false);
  readonly ready = signal(false);

  constructor() {
    void this.restoreSession();
  }

  register(command: RegistrarCuentaCommand): Promise<ApiResult> {
    return this.run(async () => {
      const { testCode } = await this.gateway.register(command);
      return { ok: true, testCode };
    });
  }

  verify(email: string, code: string): Promise<ApiResult> {
    return this.run(async () => {
      await this.gateway.verify(email, code);
      return { ok: true };
    });
  }

  login(email: string, password: string): Promise<ApiResult> {
    return this.run(async () => {
      const session = await this.gateway.login(email, password);
      this.tokenState.set(session.token);
      this.userState.set(session.user);
      sessionStorage.setItem(SESSION_KEY, session.token);
      return { ok: true };
    });
  }

  async logout(): Promise<void> {
    const token = this.tokenState();
    this.clearSession();
    if (!token) return;
    try {
      await this.gateway.logout(token);
    } catch {
      // La sesión local ya está cerrada; el token remoto vencerá automáticamente.
    }
  }

  requestPasswordReset(email: string): Promise<ApiResult> {
    return this.run(async () => {
      const { testCode } = await this.gateway.requestPasswordReset(email);
      return { ok: true, testCode };
    });
  }

  resetPassword(email: string, code: string, password: string): Promise<ApiResult> {
    return this.run(async () => {
      await this.gateway.resetPassword(email, code, password);
      this.clearSession();
      return { ok: true };
    });
  }

  updateProfile(update: CambioPerfil): Promise<ApiResult> {
    return this.run(async () => {
      this.userState.set(await this.gateway.updateProfile(this.requireToken(), update));
      return { ok: true };
    });
  }

  deleteAccount(): Promise<ApiResult> {
    return this.run(async () => {
      await this.gateway.deleteAccount(this.requireToken());
      this.clearSession();
      return { ok: true };
    });
  }

  private async restoreSession(): Promise<void> {
    const token = this.tokenState();
    try {
      if (token) this.userState.set(await this.gateway.current(token));
    } catch {
      this.clearSession();
    } finally {
      this.ready.set(true);
    }
  }

  private async run(operation: () => Promise<ApiResult>): Promise<ApiResult> {
    if (this.pending()) return { ok: false, error: 'La solicitud ya está en curso.' };
    this.pending.set(true);
    try {
      return await operation();
    } catch (error) {
      return { ok: false, error: messageOf(error, FALLBACK) };
    } finally {
      this.pending.set(false);
    }
  }

  private requireToken(): string {
    const token = this.tokenState();
    if (!token) throw new Error('AUTHENTICATION_REQUIRED');
    return token;
  }

  private clearSession(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }
}
