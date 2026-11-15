import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { bearer } from '../../../core/bff-http';
import {
  PerfilError,
  SesionError,
  SesionGateway,
  SesionConcedida,
  SesionVencidaError,
} from '../domain/sesion.gateway';
import { UsuarioAdmin } from '../domain/usuario-admin.model';

const SESSIONS_URL = '/bff/admin/sessions';
const PROFILE_URL = '/bff/admin/profile';
/** Campo del formulario del perfil al que corresponde cada código del BFF (PBI-0034). */
const CAMPO_POR_CODIGO: Readonly<Record<string, PerfilError['campo']>> = {
  ADMIN_EMAIL_TAKEN: 'email',
  INVALID_EMAIL: 'email',
  INVALID_CURRENT_PASSWORD: 'currentPassword',
  WEAK_PASSWORD: 'newPassword',
};

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

  async actualizarPerfil(
    datos: { readonly name: string; readonly email: string },
    token: string,
  ): Promise<UsuarioAdmin> {
    try {
      const respuesta = await firstValueFrom(
        this.http.patch<{ user: UsuarioAdmin }>(PROFILE_URL, datos, { headers: bearer(token) }),
      );
      return respuesta.user;
    } catch (error) {
      throw this.errorDelPerfil(error, 'No pudimos guardar tus datos. Inténtalo de nuevo.');
    }
  }

  async cambiarContrasena(actual: string, nueva: string, token: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.put<void>(
          `${PROFILE_URL}/password`,
          { currentPassword: actual, newPassword: nueva },
          { headers: bearer(token) },
        ),
      );
    } catch (error) {
      throw this.errorDelPerfil(error, 'No pudimos cambiar la contraseña. Inténtalo de nuevo.');
    }
  }

  /** `401`: la sesión venció (PBI-0124); un 4xx con código: su mensaje y su campo; si no, `porDefecto`. */
  private errorDelPerfil(error: unknown, porDefecto: string): Error {
    if (!(error instanceof HttpErrorResponse)) return new PerfilError(porDefecto);
    if (error.status === 401) return new SesionVencidaError();
    if (error.status === 0)
      return new PerfilError('No pudimos conectar con el BFF. Verifica que esté iniciado.');
    const problema = error.error?.error;
    if (error.status >= 400 && error.status < 500 && problema?.message)
      return new PerfilError(problema.message, CAMPO_POR_CODIGO[problema.code] ?? null);
    return new PerfilError(porDefecto);
  }

  private message(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) return 'No pudimos iniciar sesión.';
    if (error.status === 0) return 'No pudimos conectar con el BFF. Verifica que esté iniciado.';
    return error.error?.error?.message ?? error.error?.message ?? 'No pudimos iniciar sesión.';
  }
}
