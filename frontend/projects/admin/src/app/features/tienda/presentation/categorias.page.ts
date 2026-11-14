import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { TiendaFacade } from '../application/tienda.facade';
import { aplanarArbolCategorias } from '../domain/categoria.rules';
import { FILTROS_CATEGORIAS_VACIOS, SIN_PADRE } from '../domain/filtro-catalogo.model';
import {
  filtrarCategorias,
  leerFiltrosCategorias,
  leerPagina,
  ParametrosUrl,
  parametrosDeFiltrosCategorias,
} from '../domain/filtro-catalogo.rules';
import { ELEMENTOS_POR_PAGINA, paginar } from '../domain/listado.rules';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';

/**
 * Listado de categorías (feature 008): panel de filtros debajo del título, la lista en orden de árbol a todo el
 * ancho y la paginación. Los filtros aplicados y la página viven en la URL; el panel edita un borrador que «Buscar»
 * aplica después de traer los datos actuales. Una categoría filtrada conserva su fila de siempre: sangría, «↳» y
 * «Padre: …», aunque el padre no salga en los resultados (D7). El registro se abre en `/categorias/nueva` y
 * `/categorias/:id` (`RegistroCategoriaPage`).
 */
@Component({
  selector: 'ws-categories-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-ink">Categorías</h1>
        <p class="mt-3 text-sm text-muted">
          Estructura por nombres y subcategorías; el orden puede ser explícito o alfabético.
        </p>
      </div>
      <a
        class="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
        routerLink="/categorias/nueva"
        queryParamsHandling="preserve"
      >
        Nueva categoría
      </a>
    </div>
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de categorías"
      [formGroup]="borrador"
      [buscando]="buscando()"
      [error]="errorBusqueda()"
      (buscar)="buscar()"
      (limpiar)="limpiar()"
    >
      <mat-form-field>
        <mat-label>Nombre</mat-label>
        <input matInput formControlName="nombre" />
      </mat-form-field>
      <mat-form-field>
        <mat-label>Categoría padre</mat-label>
        <mat-select formControlName="padreId">
          <mat-option value="">Todas</mat-option>
          <mat-option [value]="sinPadre">Sin padre</mat-option>
          @for (entry of tree(); track entry.category.id) {
            <mat-option [value]="entry.category.id">
              {{ indent(entry.depth) }}{{ entry.category.name }}
            </mat-option>
          }
        </mat-select>
      </mat-form-field>
    </ws-filter-panel>
    <section class="admin-card mt-6 p-4" aria-label="Lista de categorías">
      @for (entry of pagina().items; track entry.category.id) {
        <div
          class="flex items-center justify-between border-b border-line p-3"
          [style.padding-left.px]="12 + entry.depth * 24"
        >
          <div>
            <strong>{{ entry.depth ? '↳ ' : '' }}{{ entry.category.name }}</strong>
            <p class="text-xs text-muted">
              Orden: {{ entry.category.order ?? 'alfabético' }} · Padre:
              {{ parentName(entry.category.parentId) }}
            </p>
          </div>
          <div class="flex gap-3 text-sm font-semibold">
            <!-- inline-flex items-center: como enlace, centra el texto en la altura de «Eliminar» igual que el botón de antes. -->
            <a
              class="inline-flex items-center text-link"
              [routerLink]="['/categorias', entry.category.id]"
              queryParamsHandling="preserve"
            >
              Editar
            </a>
            <button class="text-danger" (click)="remove(entry.category.id)">Eliminar</button>
          </div>
        </div>
      } @empty {
        <p class="p-10 text-center text-sm text-muted">
          {{
            admin.categories().length ? 'Ninguna categoría cumple los filtros.' : 'Todavía no hay categorías.'
          }}
        </p>
      }
      <ws-pagination [pagina]="pagina()" etiqueta="Páginas de categorías" (cambiar)="irAPagina($event)" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly sinPadre = SIN_PADRE;
  /** Parámetros de consulta de la URL; con un parámetro repetido, el primero. */
  private readonly parametros = toSignal(
    this.route.queryParamMap.pipe(
      map((mapa): ParametrosUrl =>
        Object.fromEntries(mapa.keys.map((clave) => [clave, mapa.get(clave) ?? undefined])),
      ),
    ),
    { requireSync: true },
  );
  /** Filtros de la última búsqueda, los de la URL. */
  protected readonly aplicados = computed(() => leerFiltrosCategorias(this.parametros()));
  /** Resultados en orden de árbol, con la profundidad de cada categoría. */
  protected readonly resultados = computed(() =>
    filtrarCategorias(this.admin.categories(), this.aplicados()),
  );
  protected readonly pagina = computed(() =>
    paginar(this.resultados(), leerPagina(this.parametros()), ELEMENTOS_POR_PAGINA),
  );
  /** Opciones de «Categoría padre»: todas, en orden jerárquico. */
  protected readonly tree = computed(() => aplanarArbolCategorias(this.admin.categories()));
  /** Lo que se escribe en el panel; se aplica con «Buscar». */
  protected readonly borrador = new FormGroup({
    nombre: new FormControl('', { nonNullable: true }),
    padreId: new FormControl('', { nonNullable: true }),
  });
  protected readonly buscando = signal(false);
  protected readonly errorBusqueda = signal<string | null>(null);
  constructor() {
    // El borrador se iguala a los filtros aplicados cada vez que cambia la URL (también con atrás y adelante).
    effect(() => {
      const aplicados = this.aplicados();
      untracked(() => this.borrador.setValue({ ...aplicados }));
    });
  }
  /** Trae los datos actuales y aplica el borrador desde la página 1; si falla, conserva filtros y resultados. */
  protected async buscar() {
    this.buscando.set(true);
    this.errorBusqueda.set(null);
    const actual = await this.admin.refresh();
    this.buscando.set(false);
    if (!actual) {
      this.errorBusqueda.set(
        'No pudimos consultar las categorías actuales. La lista muestra la última búsqueda; inténtalo de nuevo.',
      );
      return;
    }
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: parametrosDeFiltrosCategorias(this.borrador.getRawValue()),
    });
  }
  /** Vacía todos los filtros del panel de una vez, sin buscar (AC-14). */
  protected limpiar() {
    this.borrador.setValue({ ...FILTROS_CATEGORIAS_VACIOS });
  }
  protected irAPagina(numero: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina: numero > 1 ? numero : null },
      queryParamsHandling: 'merge',
    });
  }
  protected indent(depth: number) {
    return '  '.repeat(depth) + (depth ? '↳ ' : '');
  }
  protected parentName(id?: string) {
    return id ? (this.admin.categories().find((c) => c.id === id)?.name ?? id) : '—';
  }
  protected async remove(id: string) {
    if (confirm('¿Eliminar categoría?')) await this.admin.deleteCategory(id);
  }
}
