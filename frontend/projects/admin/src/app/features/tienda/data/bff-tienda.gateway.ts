import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { SnapshotTienda } from '../domain/tienda.model';
import {
  TiendaGateway,
  ReglaTiendaError,
  CambiosTienda,
  SnapshotDesactualizadoError,
} from '../domain/tienda.gateway';
import { bearer } from '../../../core/bff-http';
import { ServicioNoDisponibleError, SesionVencidaError } from '../../sesion/domain/sesion.gateway';

const SNAPSHOT_URL = '/bff/admin/snapshot';
const MENSAJE_DEMASIADO_GRANDE =
  'Lo que intentas guardar pesa demasiado (más de 2 MB). Usa imágenes más livianas o una URL.';

/** De `data/` no sale un `HttpErrorResponse` (PBI-0134): un fallo sin traducir es del servicio. */
const errorDelDominio = (error: HttpErrorResponse): ServicioNoDisponibleError =>
  new ServicioNoDisponibleError(error.status);

@Injectable()
export class BffTiendaGateway implements TiendaGateway {
  private readonly http = inject(HttpClient);

  async load(token: string): Promise<SnapshotTienda> {
    try {
      return await firstValueFrom(this.http.get<SnapshotTienda>(SNAPSHOT_URL, { headers: bearer(token) }));
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      if (error.status === 401) throw new SesionVencidaError();
      throw errorDelDominio(error);
    }
  }

  async save(update: CambiosTienda, token: string): Promise<SnapshotTienda> {
    try {
      return await firstValueFrom(
        this.http.put<SnapshotTienda>(SNAPSHOT_URL, update, {
          headers: bearer(token),
        }),
      );
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      const problem = error.error?.error;
      if (problem?.code === 'STALE_SNAPSHOT') throw new SnapshotDesactualizadoError();
      // PBI-0124: la sesión venció o se cerró a mitad de la edición.
      if (error.status === 401) throw new SesionVencidaError();
      // PBI-0119: un guardado que no cabe (por ejemplo, un logo muy pesado) se explica, no se deja en un error genérico.
      if (error.status === 413) throw new ReglaTiendaError(MENSAJE_DEMASIADO_GRANDE);
      if (error.status >= 400 && error.status < 500 && problem?.message)
        throw new ReglaTiendaError(problem.message);
      throw errorDelDominio(error);
    }
  }
}
