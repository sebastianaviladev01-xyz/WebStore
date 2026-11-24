import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { TiendaFacade } from '../application/tienda.facade';
import { motivoParaNoEliminarMarca } from '../domain/eliminacion.rules';
import { EstadoFiltro, FILTROS_MARCAS_VACIOS } from '../domain/filtro-catalogo.model';
import {
  filtrarMarcas,
  leerFiltrosMarcas,
  leerPagina,
  ParametrosUrl,
  parametrosDeFiltrosMarcas,
} from '../domain/filtro-catalogo.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { ELEMENTOS_POR_PAGINA, paginar } from '../domain/listado.rules';
import { Marca } from '../domain/tienda.model';
import { conservarBorrador } from './borrador';
import { dialogoDeRegistro } from './dialogo-de-registro';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';

const MARCA_VACIA = { name: '', active: true };

/** Lo que se conserva del formulario si la sesión vence a mitad de la edición (PBI-0151). */
interface BorradorMarca {
  readonly base: Marca | null;
  readonly idNuevo: string;
  readonly valor: typeof MARCA_VACIA;
}

/**
 * Listado de marcas (feature 008): panel de filtros debajo del título, la lista a todo el ancho y la paginación.
 * Los filtros aplicados y la página viven en la URL; el panel edita un borrador que «Buscar» aplica después de traer
 * los datos actuales. Desde el lote 21 (ADR-0025, PBI-0211) la marca se crea y se edita en una ventana emergente, con
 * los mismos campos («Nombre» y «Activa»); antes tenía su propia interfaz (`/marcas/nueva` y `/marcas/:id`). Al editar
 * trae los datos actuales con `refresh()`.
 */
@Component({
  selector: 'ws-brands-page',
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Marcas</h1>
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de marcas"
      agregarQue="marca"
      (agregar)="nueva()"
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
    @if (avisoEliminar()) {
      <p class="mt-6 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
        {{ avisoEliminar() }}
      </p>
    }
    <section class="admin-card mt-6 p-4" aria-label="Lista de marcas">
      @for (b of pagina().items; track b.id) {
        <div class="flex items-center justify-between border-b border-line p-3">
          <div>
            <strong>{{ b.name }}</strong>
            <p class="text-xs text-muted">{{ b.active ? 'Activa' : 'Inactiva' }}</p>
          </div>
          <div class="flex gap-3 text-sm font-semibold">
            <button class="text-link" [attr.aria-label]="'Editar marca ' + b.name" (click)="editar(b.id)">
              Editar
            </button>
            <button class="text-danger" [attr.aria-label]="'Eliminar marca ' + b.name" (click)="remove(b.id)">
              Eliminar
            </button>
          </div>
        </div>
      } @empty {
        <p class="p-10 text-center text-sm text-muted">
          {{ admin.brands().length ? 'Ninguna marca cumple los filtros.' : 'Todavía no hay marcas.' }}
        </p>
      }
      <ws-pagination [pagina]="pagina()" etiqueta="Páginas de marcas" (cambiar)="irAPagina($event)" />
    </section>

    <!-- PBI-0211: el registro, en la ventana emergente. -->
    <ng-template #registro>
      <h2 mat-dialog-title id="titulo-registro-marca">{{ editing() ? 'Editar' : 'Nueva' }} marca</h2>
      <form class="contents" [formGroup]="form" (ngSubmit)="save()" aria-labelledby="titulo-registro-marca">
        <mat-dialog-content>
          @if (registroBorrador.aviso(); as aviso) {
            <p class="mb-4 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">{{ aviso }}</p>
          }
          @if (staleNotice()) {
            <p class="mb-4 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="alert">
              {{ staleNotice() }}
            </p>
          }
          <div class="grid pt-1">
            <mat-form-field>
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="name" />
              <mat-error>{{ mensaje(form.controls.name.errors) }}</mat-error>
            </mat-form-field>
            <mat-checkbox formControlName="active">Activa</mat-checkbox>
          </div>
          @if (error()) {
            <p class="mt-3 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
              {{ error() }}
            </p>
          }
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button
            type="button"
            class="inline-flex items-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
            mat-dialog-close
          >
            Cancelar
          </button>
          <button
            class="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            {{ admin.saving() ? 'Guardando…' : 'Guardar' }}
          </button>
        </mat-dialog-actions>
      </form>
    </ng-template>
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
  /** Por qué no se puede eliminar la marca elegida (PBI-0131) o por qué no se puede editar (otra persona la eliminó). */
  protected readonly avisoEliminar = signal<string | null>(null);

  /** La plantilla del formulario, que se abre en la ventana emergente (PBI-0211). */
  private readonly registro = viewChild.required<TemplateRef<unknown>>('registro');
  protected readonly editing = signal<string | null>(null);
  /** La marca tal como se cargó al abrir la edición: lo que cambió la persona se calcula contra ella (PBI-0120). */
  private base: Marca | null = null;
  /** Id de la marca nueva; cambia al empezar otra, para que un segundo envío no cree otra (PBI-0121). */
  private idNuevo: string = crypto.randomUUID();
  /** Aviso si no se pudieron traer los datos actuales y el formulario usa los que había en memoria. */
  protected readonly staleNotice = signal<string | null>(null);
  /** Motivo del último guardado rechazado, dentro de la ventana; el formulario conserva lo escrito. */
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    active: new FormControl(true, { nonNullable: true }),
  });
  protected readonly mensaje = mensajeDeError;
  /** PBI-0151: lo escrito vuelve si la sesión venció a mitad de la edición, con la ventana abierta como estaba. */
  protected readonly registroBorrador = conservarBorrador<BorradorMarca>({
    form: this.form,
    guardar: () => ({ base: this.base, idNuevo: this.idNuevo, valor: this.form.getRawValue() }),
    restaurar: (guardado) => {
      // Si otra persona eliminó la marca que se editaba, restaurarla la volvería a crear (PBI-0122).
      if (guardado.base && !this.admin.brands().some((marca) => marca.id === guardado.base?.id)) return false;
      this.base = guardado.base;
      this.idNuevo = guardado.idNuevo;
      this.editing.set(guardado.base?.id ?? null);
      this.form.setValue(guardado.valor);
      return true;
    },
    diferido: true,
  });
  private readonly dialogo = dialogoDeRegistro({
    plantilla: () => this.registro(),
    alCerrar: () => this.reset(),
  });

  constructor() {
    // El borrador se iguala a los filtros aplicados cada vez que cambia la URL (también con atrás y adelante).
    effect(() => {
      const aplicados = this.aplicados();
      untracked(() => this.borrador.setValue({ ...aplicados }));
    });
    // La plantilla existe después de la primera vista: ahí se restaura el registro y se abre la ventana.
    afterNextRender(() => {
      this.registroBorrador.aplicar();
      if (this.registroBorrador.aviso()) this.dialogo.abrir();
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
  /** «Agregar» (PBI-0171): abre la ventana con «Nueva marca», vacía. */
  protected nueva() {
    this.avisoEliminar.set(null);
    this.reset();
    this.dialogo.abrir();
  }
  /** Trae los datos actuales y abre la ventana con la marca; si ya no existe, lo dice; si la consulta falla, avisa. */
  protected async editar(id: string) {
    this.avisoEliminar.set(null);
    this.reset();
    const actual = await this.admin.refresh();
    const marca = this.admin.brands().find((item) => item.id === id);
    if (!marca) {
      this.avisoEliminar.set('Esta marca ya no existe: otra persona la eliminó.');
      return;
    }
    if (!actual) {
      this.staleNotice.set(
        'No pudimos traer los datos actuales: la ficha muestra los últimos que cargó el panel.',
      );
    }
    this.base = marca;
    this.editing.set(id);
    this.form.setValue({ name: marca.name, active: marca.active });
    this.dialogo.abrir();
  }
  protected async save() {
    if (this.admin.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    const saved = await this.admin.guardarMarca(this.base, {
      id: this.editing() ?? this.idNuevo,
      ...this.form.getRawValue(),
    });
    if (saved) {
      this.dialogo.cerrar();
      return;
    }
    this.error.set(this.admin.tomarError() ?? 'No pudimos guardar la marca. Inténtalo de nuevo.');
  }
  /** Sale de la edición: el formulario vuelve a «Nueva marca», vacío y sin avisos. */
  private reset() {
    this.editing.set(null);
    this.base = null;
    this.idNuevo = crypto.randomUUID();
    this.error.set(null);
    this.staleNotice.set(null);
    this.form.reset(MARCA_VACIA);
  }
  /** PBI-0131: una marca que usan productos no se elimina; se dice cuántos la usan, sin pedir confirmación. */
  protected async remove(id: string) {
    this.avisoEliminar.set(null);
    const marca = this.admin.brands().find((item) => item.id === id);
    if (!marca) return;
    const motivo = motivoParaNoEliminarMarca(marca, this.admin.products());
    if (motivo) {
      this.avisoEliminar.set(motivo);
      return;
    }
    if (confirm('¿Eliminar marca?')) await this.admin.eliminarMarca(id);
  }
}
