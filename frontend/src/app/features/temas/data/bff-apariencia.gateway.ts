import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BFF_BASE_URL } from '../../../core/bff.config';
import { AparienciaGateway } from '../domain/apariencia.gateway';
import { Apariencia } from '../domain/tema.model';

@Injectable()
export class BffAparienciaGateway implements AparienciaGateway {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BFF_BASE_URL);

  apariencia(): Promise<Apariencia> {
    return firstValueFrom(this.http.get<Apariencia>(`${this.base}/appearance`));
  }
}
