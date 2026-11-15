import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

import { bearer } from '../../../core/bff-http';
import { ServicioNoDisponibleError, SesionVencidaError } from '../../sesion/domain/sesion.gateway';
import { Notificaciones } from '../domain/notificacion.model';
import { NotificacionesGateway } from '../domain/notificaciones.gateway';

const NOTIFICACIONES_URL = '/bff/admin/notifications';

@Injectable()
export class BffNotificacionesGateway implements NotificacionesGateway {
  private readonly http = inject(HttpClient);

  consultar(token: string): Promise<Notificaciones> {
    return this.enviar(this.http.get<Notificaciones>(NOTIFICACIONES_URL, { headers: bearer(token) }));
  }

  marcarVisto(hasta: string, token: string): Promise<Notificaciones> {
    return this.enviar(
      this.http.put<Notificaciones>(
        `${NOTIFICACIONES_URL}/seen`,
        { until: hasta },
        { headers: bearer(token) },
      ),
    );
  }

  private async enviar(peticion: Observable<Notificaciones>): Promise<Notificaciones> {
    try {
      return await firstValueFrom(peticion);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      // De `data/` no sale un `HttpErrorResponse` (lote 08, PBI-0134).
      throw error.status === 401 ? new SesionVencidaError() : new ServicioNoDisponibleError(error.status);
    }
  }
}
