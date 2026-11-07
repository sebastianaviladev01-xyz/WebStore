import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { bearer } from '../../../core/bff-http';
import { SesionError, SesionGateway, SesionConcedida } from '../domain/sesion.gateway';
import { UsuarioAdmin } from '../domain/usuario-admin.model';

const SESSIONS_URL = '/bff/admin/sessions';

@Injectable()
export class BffSesionGateway implements SesionGateway {
  private readonly http = inject(HttpClient);

  async login(email: string, password: string): Promise<SesionConcedida> {
    try {
      return await firstValueFrom(this.http.post<SesionConcedida>(SESSIONS_URL, { email, password }));
    } catch (error) {
      throw new SesionError(this.message(error));
    }
  }

  async current(token: string): Promise<UsuarioAdmin> {
    const response = await firstValueFrom(
      this.http.get<{ user: UsuarioAdmin }>(`${SESSIONS_URL}/current`, { headers: bearer(token) }),
    );
    return response.user;
  }

  async logout(token: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${SESSIONS_URL}/current`, { headers: bearer(token) }));
  }

  private message(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'No pudimos iniciar sesión.';
    if (error.status === 0) return 'No pudimos conectar con el BFF. Verifica que esté iniciado.';
    return error.error?.error?.message ?? error.error?.message ?? 'No pudimos iniciar sesión.';
  }
}
