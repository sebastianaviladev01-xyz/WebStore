import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Banner, ConfiguracionTienda } from '../domain/contenido.model';
import { BFF_BASE_URL } from '../../../core/bff.config';
import { ContenidoGateway } from '../domain/contenido.gateway';

@Injectable()
export class BffContenidoGateway implements ContenidoGateway {
  private readonly http = inject(HttpClient);
  private readonly base = inject(BFF_BASE_URL);

  getSettings(): Promise<Partial<ConfiguracionTienda>> {
    return firstValueFrom(this.http.get<Partial<ConfiguracionTienda>>(`${this.base}/content/settings`));
  }

  getBanners(): Promise<readonly Banner[]> {
    return firstValueFrom(this.http.get<readonly Banner[]>(`${this.base}/content/banners`));
  }
}
