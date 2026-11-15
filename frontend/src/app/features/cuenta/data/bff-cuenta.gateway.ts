import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { CuentaCliente, RegistrarCuentaCommand } from '../domain/cuenta.model';
import { CuentaGateway, SesionCuenta, EntregaCodigo, CambioPerfil } from '../domain/cuenta.gateway';
import { BFF_BASE_URL } from '../../../core/bff.config';
import { bffHeaders, callBff } from '../../../core/bff-http';

const FALLBACK = 'No pudimos completar la solicitud. Inténtalo nuevamente.';

@Injectable()
export class BffCuentaGateway implements CuentaGateway {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BFF_BASE_URL);

  register(command: RegistrarCuentaCommand): Promise<EntregaCodigo> {
    return this.call(this.http.post<EntregaCodigo>(`${this.base}/accounts`, command));
  }

  resendVerification(email: string): Promise<EntregaCodigo> {
    return this.call(this.http.post<EntregaCodigo>(`${this.base}/account-verification-requests`, { email }));
  }

  verify(email: string, code: string): Promise<void> {
    return this.call(this.http.post<void>(`${this.base}/account-verifications`, { email, code }));
  }

  login(email: string, password: string): Promise<SesionCuenta> {
    return this.call(this.http.post<SesionCuenta>(`${this.base}/account-sessions`, { email, password }));
  }

  logout(token: string): Promise<void> {
    return this.call(
      this.http.delete<void>(`${this.base}/account-sessions/current`, { headers: bffHeaders(token) }),
    );
  }

  async current(token: string): Promise<CuentaCliente> {
    const response = await this.call(
      this.http.get<{ readonly user: CuentaCliente }>(`${this.base}/account-sessions/current`, {
        headers: bffHeaders(token),
      }),
    );
    return response.user;
  }

  requestPasswordReset(email: string): Promise<EntregaCodigo> {
    return this.call(this.http.post<EntregaCodigo>(`${this.base}/password-reset-requests`, { email }));
  }

  resetPassword(email: string, code: string, password: string): Promise<void> {
    return this.call(this.http.post<void>(`${this.base}/password-resets`, { email, code, password }));
  }

  async updateProfile(token: string, update: CambioPerfil): Promise<CuentaCliente> {
    const response = await this.call(
      this.http.patch<{ readonly user: CuentaCliente }>(`${this.base}/accounts/current`, update, {
        headers: bffHeaders(token),
      }),
    );
    return response.user;
  }

  deleteAccount(token: string): Promise<void> {
    return this.call(this.http.delete<void>(`${this.base}/accounts/current`, { headers: bffHeaders(token) }));
  }

  private call<T>(request: Observable<T>): Promise<T> {
    return callBff(() => firstValueFrom(request), FALLBACK);
  }
}
