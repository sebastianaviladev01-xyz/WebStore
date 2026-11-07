import { computed, inject, Injectable, signal } from '@angular/core';

import { Categoria } from '../domain/categoria.model';
import { Producto } from '../domain/producto.model';
import { CatalogoGateway } from '../domain/catalogo.gateway';

@Injectable({ providedIn: 'root' })
export class CatalogoFacade {
  private readonly repository = inject(CatalogoGateway);

  private readonly productsState = signal<readonly Producto[]>([]);
  private readonly categoriesState = signal<readonly Categoria[]>([]);
  private readonly loadingState = signal(true);
  private readonly errorState = signal<string | null>(null);

  readonly products = this.productsState.asReadonly();
  readonly categories = this.categoriesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly featuredProducts = computed(() => this.products().filter((product) => product.featured));

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const [products, categories] = await Promise.all([
        this.repository.getProducts(),
        this.repository.getCategories(),
      ]);
      this.productsState.set(products);
      this.categoriesState.set(categories);
    } catch {
      this.errorState.set('No pudimos cargar el catálogo. Inténtalo nuevamente.');
    } finally {
      this.loadingState.set(false);
    }
  }

  findBySlug(slug: string): Producto | null {
    return this.products().find((product) => product.slug === slug) ?? null;
  }
}
