import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BFF_BASE_URL } from '../../../core/bff.config';
import { VisitaGateway } from '../domain/visita.gateway';

@Injectable()
export class BffVisitaGateway implements VisitaGateway {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BFF_BASE_URL);

  async latido(visitId: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.base}/visits`, { visitId }));
  }
}
