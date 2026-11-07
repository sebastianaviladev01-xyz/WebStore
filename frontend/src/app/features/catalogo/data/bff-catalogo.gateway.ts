import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Categoria } from '../domain/categoria.model';
import { Producto } from '../domain/producto.model';
import { BFF_BASE_URL } from '../../../core/bff.config';
import { CatalogoGateway } from '../domain/catalogo.gateway';

/** Adaptador del catálogo público del BFF. */
@Injectable()
export class BffCatalogoGateway implements CatalogoGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(BFF_BASE_URL);

  getCategories(): Promise<readonly Categoria[]> {
    return firstValueFrom(this.http.get<readonly Categoria[]>(`${this.baseUrl}/catalog/categories`));
  }

  getProducts(): Promise<readonly Producto[]> {
    return firstValueFrom(this.http.get<readonly Producto[]>(`${this.baseUrl}/catalog/products`));
  }

  getProductBySlug(slug: string): Promise<Producto | null> {
    return firstValueFrom(
      this.http.get<Producto | null>(`${this.baseUrl}/catalog/products/${encodeURIComponent(slug)}`),
    );
  }
}
