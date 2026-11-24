import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { eliminarRegistro } from '../../../shared/ui/eliminar-registro';
import { TiendaFacade } from '../application/tienda.facade';
import {
  FILTROS_CLIENTES_VACIOS,
  filtrarClientes,
  leerFiltrosClientes,
  parametrosDeFiltrosClientes,
} from '../domain/filtro-listado.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { Cliente } from '../domain/tienda.model';
import { conservarBorrador } from './borrador';
import { dialogoDeRegistro } from './dialogo-de-registro';
import { filtrosDeListado } from './filtros-de-listado';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';

const CLIENTE_VACIO = { name: '', email: '', document: '' };

/** Lo que se conserva del formulario si la sesión vence a mitad de la edición (PBI-0151). */
interface BorradorCliente {
  readonly base: Cliente | null;
  readonly idNuevo: string;
  readonly valor: typeof CLIENTE_VACIO;
}

/**
 * Clientes (lote 07): panel de filtros (PBI-0139), la lista como tabla (PBI-0132) que en el celular no desborda
 * (PBI-0059), «Editar» y «Eliminar» con el nombre del cliente y el motivo de cada campo con error (PBI-0132). Desde el
 * lote 21 (ADR-0025, PBI-0211) el cliente se crea y se edita en una ventana emergente: tiene tres campos.
 */
@Component({
  selector: 'ws-customers-page',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Clientes</h1>
    <p class="mt-3 text-sm text-muted">
      Cliente y usuario son registros distintos: una compra como invitado genera cliente sin obligar a crear
      cuenta.
    </p>
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de clientes"
      agregarQue="cliente"
      (agregar)="nuevo()"
      [formGroup]="filtros.borrador"
      [buscando]="filtros.buscando()"
      [error]="filtros.error()"
      (buscar)="filtros.buscar()"
      (limpiar)="filtros.limpiar()"
    >
      <mat-form-field>
        <mat-label>Buscar cliente</mat-label>
        <input matInput formControlName="texto" />
        <mat-hint>Nombre, correo o documento</mat-hint>
      </mat-form-field>
    </ws-filter-panel>
    <section class="admin-card mt-6 p-4" aria-label="Lista de clientes">
      <div role="table" aria-label="Clientes">
        <div role="row" class="sr-only">
          <span role="columnheader">Cliente</span>
          <span role="columnheader">Pedidos</span>
          <span role="columnheader">Acciones</span>
        </div>
        @for (c of pagina().items; track c.id) {
          <div
            role="row"
            class="grid grid-cols-[1fr_140px_90px] items-center border-b border-line p-3 max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-2"
          >
            <div role="cell" class="min-w-0 max-md:col-span-full">
              <strong class="break-words">{{ c.name }}</strong>
              <p class="break-words text-xs text-muted">{{ c.email }} · {{ c.document }}</p>
            </div>
            <span role="cell" class="text-sm">{{ c.orders }} pedidos</span>
            <div role="cell" class="flex gap-2 text-sm font-semibold">
              <button class="text-link" [attr.aria-label]="'Editar cliente ' + c.name" (click)="edit(c.id)">
                Editar
              </button>
              <button
                class="text-danger"
                [attr.aria-label]="'Eliminar cliente ' + c.name"
                (click)="remove(c.id)"
              >
                Eliminar
              </button>
            </div>
          </div>
        }
      </div>
      @if (!pagina().items.length) {
        <p class="p-8 text-center text-sm text-muted">
          {{ admin.customers().length ? 'Ningún cliente cumple los filtros.' : 'Todavía no hay clientes.' }}
        </p>
      }
      <ws-pagination
        [pagina]="pagina()"
        etiqueta="Páginas de clientes"
        (cambiar)="filtros.irAPagina($event)"
      />
    </section>

    <!-- PBI-0211: el registro, en la ventana emergente. -->
    <ng-template #registro>
      <h2 mat-dialog-title id="titulo-registro-cliente">
        {{ editing() ? 'Editar cliente' : 'Nuevo cliente' }}
      </h2>
      <form class="contents" [formGroup]="form" (ngSubmit)="save()" aria-labelledby="titulo-registro-cliente">
        <mat-dialog-content>
          @if (borrador.aviso(); as aviso) {
            <p class="mb-4 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">{{ aviso }}</p>
          }
          <div class="grid gap-3 pt-1">
            <mat-form-field>
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="name" />
              <mat-error>{{ error(form.controls.name.errors) }}</mat-error>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Correo</mat-label>
              <input matInput type="email" formControlName="email" />
              <mat-error>{{ error(form.controls.email.errors) }}</mat-error>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Documento</mat-label>
              <input matInput formControlName="document" />
              <mat-error>{{ error(form.controls.document.errors) }}</mat-error>
            </mat-form-field>
          </div>
          @if (errorGuardado(); as motivo) {
            <p class="rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger" role="alert">
              {{ motivo }}
            </p>
          }
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button
            type="button"
            class="rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
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
export class ClientesPage {
  protected readonly admin = inject(TiendaFacade);
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosClientes,
    escribir: parametrosDeFiltrosClientes,
    vacios: FILTROS_CLIENTES_VACIOS,
    que: 'los clientes',
  });
  protected readonly pagina = computed(() =>
    this.filtros.paginar(filtrarClientes(this.admin.customers(), this.filtros.aplicados())),
  );
  protected readonly error = mensajeDeError;
  /** La plantilla del formulario, que se abre en la ventana emergente (PBI-0211). */
  private readonly registro = viewChild.required<TemplateRef<unknown>>('registro');
  protected readonly editing = signal<string | null>(null);
  /** Motivo del último guardado rechazado, dentro de la ventana; el formulario conserva lo escrito. */
  protected readonly errorGuardado = signal<string | null>(null);
  /** El cliente tal como se cargó al pulsar «Editar»: lo que cambió se calcula contra él (PBI-0120). */
  private base: Cliente | null = null;
  /** Id del cliente nuevo; cambia al empezar otro, para que un segundo envío no cree otro (PBI-0121). */
  private idNuevo: string = crypto.randomUUID();
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    document: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  /**
   * PBI-0151: lo escrito vuelve si la sesión venció a mitad de la edición y se ingresa otra vez, con la ventana
   * abierta como estaba.
   */
  protected readonly borrador = conservarBorrador<BorradorCliente>({
    form: this.form,
    guardar: () => ({ base: this.base, idNuevo: this.idNuevo, valor: this.form.getRawValue() }),
    restaurar: (borrador) => {
      this.base = borrador.base;
      this.idNuevo = borrador.idNuevo;
      this.editing.set(borrador.base?.id ?? null);
      this.form.setValue(borrador.valor);
    },
    diferido: true,
  });
  private readonly dialogo = dialogoDeRegistro({
    plantilla: () => this.registro(),
    alCerrar: () => this.reset(),
  });
  constructor() {
    // La plantilla existe después de la primera vista: ahí se restaura el borrador y se abre la ventana.
    afterNextRender(() => {
      this.borrador.aplicar();
      if (this.borrador.aviso()) this.dialogo.abrir();
    });
  }
  protected edit(id: string) {
    const c = this.admin.customers().find((x) => x.id === id);
    if (!c) return;
    this.reset();
    this.base = c;
    this.editing.set(id);
    this.form.setValue({ name: c.name, email: c.email, document: c.document });
    this.dialogo.abrir();
  }
  protected async save() {
    if (this.admin.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const base = this.base;
    this.errorGuardado.set(null);
    const saved = await this.admin.guardarCliente(base, {
      id: base?.id ?? this.idNuevo,
      orders: base?.orders ?? 0,
      ...this.form.getRawValue(),
    });
    if (saved) this.dialogo.cerrar();
    else this.errorGuardado.set(this.admin.tomarError());
  }
  /** «Agregar» (PBI-0171): abre la ventana con «Nuevo cliente», vacía. */
  protected nuevo(): void {
    this.reset();
    this.dialogo.abrir();
  }
  /** Sale de la edición (PBI-0130): el formulario vuelve a «Nuevo cliente», vacío y sin errores a la vista. */
  protected reset() {
    this.editing.set(null);
    this.base = null;
    this.idNuevo = crypto.randomUUID();
    this.errorGuardado.set(null);
    this.form.reset(CLIENTE_VACIO);
  }
  /** Si se elimina el cliente en edición, el formulario sale de la edición: «Guardar» no lo vuelve a crear (PBI-0122). */
  protected async remove(id: string) {
    await eliminarRegistro({
      pregunta: '¿Eliminar cliente?',
      id,
      editando: () => this.editing(),
      eliminar: (idEliminado) => this.admin.eliminarCliente(idEliminado),
      salirDeLaEdicion: () => this.reset(),
    });
  }
}
