import { computed, inject, Injectable, signal } from '@angular/core';

import { CuentaCliente, RegistrarCuentaCommand } from '../domain/cuenta.model';
import { CuentaGateway, CambioPerfil } from '../domain/cuenta.gateway';
import { BffRequestError, messageOf } from '../../../core/bff-request.error';

const SESSION_KEY = 'webstore-account-session-v1';
const FALLBACK = 'No pudimos completar la solicitud. Inténtalo nuevamente.';
const RESTORE_FAILED = 'No pudimos cargar tu cuenta. Revisa tu conexión e inténtalo nuevamente.';

export interface ApiResult {
  readonly ok: boolean;
  readonly error?: string;
  /** Código del BFF del error (por ejemplo, `ACCOUNT_NOT_VERIFIED`). */
  readonly code?: string;
  readonly testCode?: string;
}

/** Código de demostración del último alta o reenvío: solo en memoria, nunca en la URL (PBI-0098). */
export interface CodigoDeDemostracion {
  readonly email: string;
  readonly code: string;
}

/** El BFF ya no reconoce el token (vencido o revocado). Unas credenciales incorrectas también son 401, pero no esto. */
const esSesionVencida = (error: unknown): boolean =>
  error instanceof BffRequestError && error.status === 401 && error.code === 'AUTHENTICATION_REQUIRED';

@Injectable({ providedIn: 'root' })
export class CuentaFacade {
  private readonly gateway = inject(CuentaGateway);
  private readonly userState = signal<CuentaCliente | null>(null);
  private readonly tokenState = signal<string | null>(sessionStorage.getItem(SESSION_KEY));
  private readonly expiredState = signal(false);
  private readonly restoreErrorState = signal<string | null>(null);
  private readonly demoCodeState = signal<CodigoDeDemostracion | null>(null);

  readonly currentUser = this.userState.asReadonly();
  /** Token de la sesión de cliente, para adjuntarlo en consultas protegidas (p. ej. pedidos). */
  readonly sessionToken = this.tokenState.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  /** La sesión venció o se revocó en el BFF: la cuenta lleva a ingresar con un aviso (PBI-0114). */
  readonly sesionVencida = this.expiredState.asReadonly();
  /** No se pudo recuperar la sesión guardada por un fallo que no es de la sesión (BFF caído, PBI-0114). */
  readonly errorAlRecuperar = this.restoreErrorState.asReadonly();
  readonly codigoDeDemostracion = this.demoCodeState.asReadonly();
  readonly pending = signal(false);
  readonly ready = signal(false);

  constructor() {
    void this.restoreSession();
  }

  register(command: RegistrarCuentaCommand): Promise<ApiResult> {
    return this.run(async () => {
      const { testCode } = await this.gateway.register(command);
      this.rememberDemoCode(command.email, testCode);
      return { ok: true, testCode };
    });
  }

  /** Pide un código de verificación nuevo; el BFF responde igual exista o no la cuenta (PBI-0098). */
  resendVerification(email: string): Promise<ApiResult> {
    return this.run(async () => {
      const { testCode } = await this.gateway.resendVerification(email);
      this.rememberDemoCode(email, testCode);
      return { ok: true, testCode };
    });
  }

  verify(email: string, code: string): Promise<ApiResult> {
    return this.run(async () => {
      await this.gateway.verify(email, code);
      this.demoCodeState.set(null);
      return { ok: true };
    });
  }

  login(email: string, password: string): Promise<ApiResult> {
    return this.run(async () => {
      const session = await this.gateway.login(email, password);
      this.tokenState.set(session.token);
      this.userState.set(session.user);
      this.expiredState.set(false);
      this.restoreErrorState.set(null);
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

  /**
   * Vuelve a preguntar al BFF por la sesión guardada: al abrir la cuenta, para no mostrar un perfil en memoria de
   * una sesión que ya venció, y para reintentar después de un fallo de red (PBI-0114).
   */
  async comprobarSesion(): Promise<void> {
    const token = this.tokenState();
    if (!token) return;
    try {
      this.userState.set(await this.gateway.current(token));
      this.restoreErrorState.set(null);
    } catch (error) {
      if (esSesionVencida(error)) this.expire();
      else if (!this.userState()) this.restoreErrorState.set(RESTORE_FAILED);
    }
  }

  /** Cierra la sesión local porque el BFF ya no la reconoce, y lo deja dicho para el ingreso (PBI-0114). */
  expire(): void {
    this.clearSession();
    this.expiredState.set(true);
  }

  /** El aviso de la sesión vencida ya se mostró. */
  olvidarSesionVencida(): void {
    this.expiredState.set(false);
  }

  private async restoreSession(): Promise<void> {
    try {
      await this.comprobarSesion();
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
      // Solo las operaciones con la sesión envían el token: un 401 en ellas es una sesión vencida.
      if (esSesionVencida(error) && this.tokenState()) this.expire();
      return {
        ok: false,
        error: messageOf(error, FALLBACK),
        code: error instanceof BffRequestError ? error.code : undefined,
      };
    } finally {
      this.pending.set(false);
    }
  }

  private rememberDemoCode(email: string, code: string | undefined): void {
    this.demoCodeState.set(code ? { email: email.trim().toLowerCase(), code } : null);
  }

  private requireToken(): string {
    const token = this.tokenState();
    if (!token) throw new Error('AUTHENTICATION_REQUIRED');
    return token;
  }

  private clearSession(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    this.restoreErrorState.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }
}
