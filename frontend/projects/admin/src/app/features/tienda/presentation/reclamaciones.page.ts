import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TiendaFacade } from '../application/tienda.facade';
import { Reclamo, ETIQUETAS_ESTADO_RECLAMO } from '../domain/tienda.model';
import {
  FILTROS_RECLAMOS_VACIOS,
  filtrarReclamos,
  leerFiltrosReclamos,
  parametrosDeFiltrosReclamos,
} from '../domain/filtro-listado.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { ZONA_HORARIA_LIMA } from '../domain/pedido.rules';
import { conservarBorrador } from './borrador';
import { filtrosDeListado } from './filtros-de-listado';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';

@Component({
  selector: 'ws-complaints-admin-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Reclamaciones</h1>
    <p class="mt-3 max-w-3xl text-sm leading-6 text-muted">
      Consulta la información registrada por el consumidor, actualiza el estado y documenta la respuesta del
      proveedor.
    </p>
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de reclamaciones"
      [formGroup]="filtros.borrador"
      [buscando]="filtros.buscando()"
      [error]="filtros.error()"
      (buscar)="filtros.buscar()"
      (limpiar)="filtros.limpiar()"
    >
      <mat-form-field>
        <mat-label>Buscar reclamación</mat-label>
        <input matInput formControlName="texto" />
        <mat-hint>Código, asunto, nombre o correo</mat-hint>
      </mat-form-field>
      <mat-form-field>
        <mat-label>Filtrar por estado</mat-label>
        <mat-select formControlName="estado">
          <mat-option value="">Todos</mat-option>
          @for (status of statuses; track status) {
            <mat-option [value]="status">{{ statusLabels[status] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </ws-filter-panel>
    @if (borrador.aviso(); as aviso) {
      <p class="mt-6 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">{{ aviso }}</p>
    }
    <div class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section class="admin-card overflow-hidden" aria-label="Lista de reclamaciones">
        @for (item of pagina().items; track item.id) {
          <button
            type="button"
            class="grid w-full gap-2 border-b border-line p-5 text-left hover:bg-subtle sm:grid-cols-[150px_1fr_auto]"
            (click)="select(item)"
          >
            <span>
              <strong class="block">{{ item.id }}</strong>
              <small class="text-muted">{{ item.createdAt | date: 'short' : zonaLima }}</small>
            </span>
            <span>
              <strong class="block">{{ item.subject }}</strong>
              <small class="text-muted">{{ item.name }} · {{ item.email }}</small>
            </span>
            <span class="rounded-full bg-soft px-3 py-1 text-xs font-semibold">
              {{ statusLabels[item.status] }}
            </span>
          </button>
        } @empty {
          <div class="p-8 text-center text-muted">
            {{
              admin.complaints().length
                ? 'Ninguna reclamación cumple los filtros.'
                : 'Todavía no se registraron solicitudes.'
            }}
          </div>
        }
        <ws-pagination
          [pagina]="pagina()"
          etiqueta="Páginas de reclamaciones"
          (cambiar)="filtros.irAPagina($event)"
        />
      </section>
      @if (selected(); as item) {
        <aside class="admin-card h-fit p-6">
          <h2 class="text-xl font-semibold">{{ item.id }}</h2>
          <dl class="mt-5 grid gap-3 text-sm">
            <div>
              <dt class="text-muted">Consumidor</dt>
              <dd class="font-semibold">{{ item.name }} · {{ item.document }}</dd>
            </div>
            <div>
              <dt class="text-muted">Contacto</dt>
              <dd class="font-semibold">{{ item.email }} · {{ item.phone }}</dd>
            </div>
            <div>
              <dt class="text-muted">Domicilio</dt>
              <dd>{{ item.address }}</dd>
            </div>
            <div>
              <dt class="text-muted">Tipo y monto</dt>
              <dd class="font-semibold">
                {{ item.type }} · {{ item.amount | currency: 'PEN' : 'symbol' : '1.2-2' }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">Plazo interno de atención</dt>
              <dd class="font-semibold">{{ item.dueAt | date: 'longDate' : zonaLima }}</dd>
            </div>
            <div>
              <dt class="text-muted">Detalle</dt>
              <dd class="whitespace-pre-line">{{ item.detail }}</dd>
            </div>
            <div>
              <dt class="text-muted">Pedido</dt>
              <dd class="whitespace-pre-line">{{ item.request }}</dd>
            </div>
          </dl>
          <form [formGroup]="form" (ngSubmit)="save()" class="mt-6 grid gap-3">
            <mat-form-field>
              <mat-label>Estado</mat-label>
              <mat-select formControlName="status">
                @for (status of statuses; track status) {
                  <mat-option [value]="status">{{ statusLabels[status] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Respuesta del proveedor</mat-label>
              <textarea matInput rows="5" formControlName="providerResponse"></textarea>
              <mat-error>{{ mensaje(form.controls.providerResponse.errors) }}</mat-error>
            </mat-form-field>
            <button
              class="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
              type="submit"
            >
              Guardar atención
            </button>
            @if (saved()) {
              <p class="text-sm text-on-primary-soft" role="status">Atención guardada.</p>
            }
          </form>
        </aside>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReclamacionesPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly statusLabels = ETIQUETAS_ESTADO_RECLAMO;
  protected readonly statuses = Object.keys(ETIQUETAS_ESTADO_RECLAMO) as Reclamo['status'][];
  protected readonly selected = signal<Reclamo | null>(null);
  protected readonly form = new FormGroup({
    status: new FormControl<Reclamo['status']>('received', { nonNullable: true }),
    providerResponse: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(4000)] }),
  });
  protected readonly saved = signal(false);
  /** PBI-0149: la fecha del reclamo y el plazo, en la hora de Lima, como los pedidos (PBI-0067). */
  protected readonly zonaLima = ZONA_HORARIA_LIMA;
  protected readonly mensaje = mensajeDeError;
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosReclamos,
    escribir: parametrosDeFiltrosReclamos,
    vacios: FILTROS_RECLAMOS_VACIOS,
    que: 'las reclamaciones',
  });
  protected readonly pagina = computed(() =>
    this.filtros.paginar(filtrarReclamos(this.admin.complaints(), this.filtros.aplicados())),
  );
  /** PBI-0151: la respuesta escrita vuelve si la sesión venció a mitad de la edición y se ingresa otra vez. */
  protected readonly borrador = conservarBorrador({
    form: this.form,
    guardar: () => ({ id: this.selected()?.id ?? null, valor: this.form.getRawValue() }),
    restaurar: (borrador) => {
      const reclamo = this.admin.complaints().find((item) => item.id === borrador.id);
      if (!reclamo) return false;
      this.selected.set(reclamo);
      this.form.setValue(borrador.valor);
      return true;
    },
    diferido: true,
  });
  constructor() {
    // Los reclamos llegan con los datos de la página: el borrador se aplica cuando ya están.
    effect(() => {
      if (this.admin.complaints().length) untracked(() => this.borrador.aplicar());
    });
  }

  protected select(item: Reclamo) {
    this.saved.set(false);
    this.selected.set(item);
    this.form.setValue({ status: item.status, providerResponse: item.providerResponse });
  }
  protected async save() {
    const item = this.selected();
    if (!item || this.admin.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.set(false);
    // Solo viajan el estado y la respuesta que cambió la persona; la fecha de actualización la pone el BFF.
    if (!(await this.admin.guardarReclamo(item, { ...item, ...this.form.getRawValue() }))) return;
    this.selected.set(this.admin.complaints().find((reclamo) => reclamo.id === item.id) ?? null);
    this.saved.set(true);
  }
}
