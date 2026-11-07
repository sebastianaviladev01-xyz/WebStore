import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RegistrarReclamoCommand, ConstanciaReclamo } from '../domain/reclamo.model';
import { BFF_BASE_URL } from '../../../core/bff.config';
import { ReclamoGateway } from '../domain/reclamo.gateway';
import { callBff } from '../../../core/bff-http';

@Injectable()
export class BffReclamoGateway implements ReclamoGateway {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BFF_BASE_URL);

  submit(command: RegistrarReclamoCommand): Promise<ConstanciaReclamo> {
    return callBff(
      () => firstValueFrom(this.http.post<ConstanciaReclamo>(`${this.base}/complaints`, command)),
      'No pudimos registrar la solicitud.',
    );
  }
}
