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

const SNAPSHOT_URL = '/bff/admin/snapshot';

@Injectable()
export class BffTiendaGateway implements TiendaGateway {
  private readonly http = inject(HttpClient);

  load(token: string): Promise<SnapshotTienda> {
    return firstValueFrom(this.http.get<SnapshotTienda>(SNAPSHOT_URL, { headers: bearer(token) }));
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
      if (error.status >= 400 && error.status < 500 && problem?.message)
        throw new ReglaTiendaError(problem.message);
      throw error;
    }
  }
}
