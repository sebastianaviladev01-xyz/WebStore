import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { Apariencia, TemasAdmin } from '../domain/tema.model';
import {
  EntradaTema,
  ReglaTemaError,
  TemasDesactualizadosError,
  TemasGateway,
} from '../domain/temas.gateway';
import { bearer } from '../../../core/bff-http';
import { ServicioNoDisponibleError, SesionVencidaError } from '../../sesion/domain/sesion.gateway';

const APARIENCIA_URL = '/bff/appearance';
const TEMAS_URL = '/bff/admin/themes';
const TEMA_ACTIVO_URL = '/bff/admin/active-theme';

/**
 * Adaptador de los temas contra el BFF (`backend/docs/BFF-CONTRACT.md`, «Apariencia y temas»). Traduce
 * `409 STALE_THEMES` a `TemasDesactualizadosError`, un `401` a `SesionVencidaError` (PBI-0124) y el resto de los 4xx con código del contrato a
 * `ReglaTemaError`, con su `code` y sus `details` para marcar el campo del formulario.
 */
@Injectable()
export class BffTemasGateway implements TemasGateway {
  private readonly http = inject(HttpClient);

  async apariencia(): Promise<Apariencia> {
    try {
      return await firstValueFrom(this.http.get<Apariencia>(APARIENCIA_URL));
    } catch (error) {
      // De `data/` no sale un `HttpErrorResponse` (lote 08, PBI-0134).
      throw error instanceof HttpErrorResponse ? new ServicioNoDisponibleError(error.status) : error;
    }
  }

  temasAdmin(token: string): Promise<TemasAdmin> {
    return this.enviar(this.http.get<TemasAdmin>(TEMAS_URL, { headers: bearer(token) }));
  }

  crear(revision: number, entrada: EntradaTema, token: string): Promise<TemasAdmin> {
    return this.enviar(
      this.http.post<TemasAdmin>(TEMAS_URL, { revision, ...entrada }, { headers: bearer(token) }),
    );
  }

  editar(id: string, revision: number, entrada: EntradaTema, token: string): Promise<TemasAdmin> {
    return this.enviar(
      this.http.put<TemasAdmin>(
        `${TEMAS_URL}/${encodeURIComponent(id)}`,
        { revision, ...entrada },
        { headers: bearer(token) },
      ),
    );
  }

  borrar(id: string, revision: number, token: string): Promise<TemasAdmin> {
    return this.enviar(
      this.http.delete<TemasAdmin>(`${TEMAS_URL}/${encodeURIComponent(id)}`, {
        headers: bearer(token),
        params: { revision },
      }),
    );
  }

  activar(themeId: string, revision: number, token: string): Promise<TemasAdmin> {
    return this.enviar(
      this.http.put<TemasAdmin>(TEMA_ACTIVO_URL, { revision, themeId }, { headers: bearer(token) }),
    );
  }

  private async enviar(peticion: Observable<TemasAdmin>): Promise<TemasAdmin> {
    try {
      return await firstValueFrom(peticion);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      const problema = error.error?.error;
      if (problema?.code === 'STALE_THEMES') throw new TemasDesactualizadosError();
      // PBI-0124: la sesión venció o se cerró a mitad de la operación.
      if (error.status === 401) throw new SesionVencidaError();
      if (error.status >= 400 && error.status < 500 && problema?.code && problema?.message)
        throw new ReglaTemaError(problema.message, problema.code, problema.details);
      // De `data/` no sale un `HttpErrorResponse` (lote 08, PBI-0134).
      throw new ServicioNoDisponibleError(error.status);
    }
  }
}
