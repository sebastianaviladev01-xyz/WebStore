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
import { EstadoFiltro, FILTROS_MARCAS_VACIOS } from '../domain/filtro-catalogo.model';
import {
  filtrarMarcas,
  leerFiltrosMarcas,
  leerPagina,
  ParametrosUrl,
  parametrosDeFiltrosMarcas,
} from '../domain/filtro-catalogo.rules';
import { ELEMENTOS_POR_PAGINA, paginar } from '../domain/listado.rules';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';

/**
 * Listado de marcas (feature 008): panel de filtros debajo del título, la lista a todo el ancho y la paginación.
 * Los filtros aplicados y la página viven en la URL; el panel edita un borrador que «Buscar» aplica después de traer
 * los datos actuales. El registro se abre en `/marcas/nueva` y `/marcas/:id` (`RegistroMarcaPage`).
 */
@Component({
  selector: 'ws-brands-page',
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
      <h1 class="text-3xl font-semibold tracking-tight text-ink">Marcas</h1>
      <a
        class="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
        routerLink="/marcas/nueva"
        queryParamsHandling="preserve"
      >
        Nueva marca
      </a>
    </div>
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de marcas"
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
        <mat-label>Estado</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="todos">Todos</mat-option>
          <mat-option value="activos">Activos</mat-option>
          <mat-option value="inactivos">Inactivos</mat-option>
        </mat-select>
      </mat-form-field>
    </ws-filter-panel>
    <section class="admin-card mt-6 p-4" aria-label="Lista de marcas">
      @for (b of pagina().items; track b.id) {
        <div class="flex items-center justify-between border-b border-line p-3">
          <div>
            <strong>{{ b.name }}</strong>
            <p class="text-xs text-muted">{{ b.active ? 'Activa' : 'Inactiva' }}</p>
          </div>
          <div class="flex gap-3 text-sm font-semibold">
            <!-- inline-flex items-center: como enlace, centra el texto en la altura de «Eliminar» igual que el botón de antes. -->
            <a
              class="inline-flex items-center text-link"
              [routerLink]="['/marcas', b.id]"
              queryParamsHandling="preserve"
            >
              Editar
            </a>
            <button class="text-danger" (click)="remove(b.id)">Eliminar</button>
          </div>
        </div>
      } @empty {
        <p class="p-10 text-center text-sm text-muted">
          {{ admin.brands().length ? 'Ninguna marca cumple los filtros.' : 'Todavía no hay marcas.' }}
        </p>
      }
      <ws-pagination [pagina]="pagina()" etiqueta="Páginas de marcas" (cambiar)="irAPagina($event)" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarcasPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
  protected readonly aplicados = computed(() => leerFiltrosMarcas(this.parametros()));
  protected readonly resultados = computed(() => filtrarMarcas(this.admin.brands(), this.aplicados()));
  protected readonly pagina = computed(() =>
    paginar(this.resultados(), leerPagina(this.parametros()), ELEMENTOS_POR_PAGINA),
  );
  /** Lo que se escribe en el panel; se aplica con «Buscar». */
  protected readonly borrador = new FormGroup({
    nombre: new FormControl('', { nonNullable: true }),
    estado: new FormControl<EstadoFiltro>('todos', { nonNullable: true }),
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
        'No pudimos consultar las marcas actuales. La lista muestra la última búsqueda; inténtalo de nuevo.',
      );
      return;
    }
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: parametrosDeFiltrosMarcas(this.borrador.getRawValue()),
    });
  }
  /** Vacía todos los filtros del panel de una vez, sin buscar (AC-14). */
  protected limpiar() {
    this.borrador.setValue({ ...FILTROS_MARCAS_VACIOS });
  }
  protected irAPagina(numero: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina: numero > 1 ? numero : null },
      queryParamsHandling: 'merge',
    });
  }
  protected async remove(id: string) {
    if (confirm('¿Eliminar marca?')) await this.admin.deleteBrand(id);
  }
}
