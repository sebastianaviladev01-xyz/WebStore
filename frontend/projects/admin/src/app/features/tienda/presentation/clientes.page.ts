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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { confirmarEliminacion } from '../../../shared/ui/confirmacion.dialog';
import { focoTrasEliminar } from '../../../shared/ui/foco-tras-eliminar';
import { eliminarRegistro } from '../../../shared/ui/eliminar-registro';
import { TiendaFacade } from '../application/tienda.facade';
import {
  FILTROS_CLIENTES_VACIOS,
  filtrarClientes,
  leerFiltrosClientes,
  parametrosDeFiltrosClientes,
} from '../domain/filtro-listado.rules';
import { TablaExportable } from '../domain/exportacion.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { numeroDeFila, textoDeCantidad, textoDelTotal } from '../domain/listado.rules';
import { Cliente } from '../domain/tienda.model';
import { conservarBorrador } from './borrador';
import { dialogoDeRegistro } from './dialogo-de-registro';
import { filtrosDeListado } from './filtros-de-listado';
import { CLASES_ACCION, CLASES_ACCION_ELIMINAR, CLASES_CANCELAR_SUAVE, FichaDeResumen } from './insignia';
import { ListadoComponent } from './listado.component';
import { BusquedaDelRegistro } from './paginacion-de-la-url';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { IconoDirective } from '../../../shared/ui/icono.directive';

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
    IconoDirective,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    ListadoComponent,
    PanelFiltrosComponent,
  ],
  template: `
    <!-- Lote 43 (ADR-0033, PBI-0265): en un solo panel, como la lista de proveedores del SGC. -->
    <ws-admin-listado
      titulo="Clientes"
      descripcion="Cliente y usuario son registros distintos: una compra como invitado genera cliente sin obligar a crear cuenta."
      que="clientes"
      [exportacion]="exportacion"
      [pagina]="pagina()"
      [tamano]="filtros.tamano()"
      [fichas]="fichas()"
      (cambiarPagina)="filtros.irAPagina($event)"
      (cambiarTamano)="filtros.cambiarTamano($event)"
    >
      <ws-filter-panel
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
      <section class="border-t border-line" aria-label="Lista de clientes">
        <div role="table" aria-label="Clientes">
          <!-- Lote 43: la fila de encabezados se ve en escritorio; en el celular sigue solo para lectores de pantalla. -->
          <div
            role="row"
            class="grid grid-cols-[2.5rem_minmax(0,1fr)_140px_88px] gap-x-4 bg-subtle px-5 py-3 text-xs font-semibold uppercase text-muted max-md:sr-only"
          >
            <span role="columnheader">N°</span>
            <span role="columnheader">Cliente</span>
            <span role="columnheader">Pedidos</span>
            <span role="columnheader"><span class="sr-only">Acciones</span></span>
          </div>
          @for (c of pagina().items; track c.id; let i = $index) {
            <div
              role="row"
              class="grid grid-cols-[2.5rem_minmax(0,1fr)_140px_88px] items-center gap-x-4 border-t border-line px-5 py-3 max-md:grid-cols-[2rem_minmax(0,1fr)_auto] max-md:gap-y-2"
            >
              <span role="cell" class="text-sm tabular-nums text-muted max-md:self-start">
                {{ numero(i) }}
              </span>
              <div role="cell" class="min-w-0 max-md:col-span-2">
                <strong class="break-words">{{ c.name }}</strong>
                <p class="break-words text-xs text-muted">{{ c.email }} · {{ c.document }}</p>
              </div>
              <span role="cell" class="text-sm max-md:col-start-2">{{ pedidos(c.orders) }}</span>
              <div role="cell" class="flex justify-end gap-2">
                <button
                  type="button"
                  [class]="accion"
                  [attr.aria-label]="'Editar cliente ' + c.name"
                  matTooltip="Editar"
                  (click)="edit(c.id)"
                >
                  <svg wsAdminIcono="editar"></svg>
                </button>
                <button
                  type="button"
                  [class]="accionEliminar"
                  [attr.aria-label]="'Eliminar cliente ' + c.name"
                  matTooltip="Eliminar"
                  data-eliminar
                  (click)="remove(c.id, $event)"
                >
                  <svg wsAdminIcono="eliminar"></svg>
                </button>
              </div>
            </div>
          }
        </div>
        @if (!pagina().items.length) {
          <p class="border-t border-line p-8 text-center text-sm text-muted">
            {{ admin.customers().length ? 'Ningún cliente cumple los filtros.' : 'Todavía no hay clientes.' }}
          </p>
        }
      </section>
    </ws-admin-listado>

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
        <!-- Lote 43 (PBI-0268): el pie a la derecha, «Cancelar» de relleno suave y «Guardar» relleno del principal. -->
        <mat-dialog-actions align="end" class="gap-2">
          <button type="button" [class]="botonCancelar" mat-dialog-close>
            <svg wsAdminIcono="cancelar"></svg>
            Cancelar
          </button>
          <button
            class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            <svg wsAdminIcono="guardar"></svg>
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
  private readonly dialog = inject(MatDialog);
  /** Lote 43 (PBI-0269): el foco tras eliminar, en la fila que ocupa su lugar. */
  // PBI-0273: con la página, el foco sabe cuándo la lista volvió a la anterior.
  private readonly foco = focoTrasEliminar({ pagina: () => this.pagina().page });
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosClientes,
    escribir: parametrosDeFiltrosClientes,
    vacios: FILTROS_CLIENTES_VACIOS,
    que: 'los clientes',
  });
  protected readonly resultados = computed(() =>
    filtrarClientes(this.admin.customers(), this.filtros.aplicados()),
  );
  protected readonly pagina = computed(() => this.filtros.paginar(this.resultados()));
  /** Dónde buscar un cliente para ir a su página: con los filtros y sin ellos, en el orden del listado. */
  private readonly busqueda: BusquedaDelRegistro<Cliente> = {
    filtrados: () => this.resultados(),
    todos: () => filtrarClientes(this.admin.customers(), FILTROS_CLIENTES_VACIOS),
    es: (cliente, id) => cliente.id === id,
  };
  /** Lote 43 (PBI-0265): los clientes no tienen estado; el pie dice el total. */
  protected readonly fichas = computed((): FichaDeResumen[] => [
    { texto: textoDelTotal(this.resultados().length), tono: 'principal', icono: 'clientes' },
  ]);
  protected readonly exportacion = (): TablaExportable => ({
    titulo: 'Clientes',
    columnas: ['N°', 'Cliente', 'Correo', 'Documento', 'Pedidos'],
    filas: this.resultados().map((c, i) => [i + 1, c.name, c.email, c.document, c.orders]),
  });
  protected readonly accion = CLASES_ACCION;
  protected readonly accionEliminar = CLASES_ACCION_ELIMINAR;
  protected readonly botonCancelar = CLASES_CANCELAR_SUAVE;
  /** «1 pedido», «2 pedidos» (lote 43; antes, «1 pedidos»). */
  protected pedidos(cantidad: number): string {
    return textoDeCantidad(cantidad, 'pedido', 'pedidos');
  }
  protected numero(indice: number): number {
    return numeroDeFila(this.pagina(), indice);
  }
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
    const id = base?.id ?? this.idNuevo;
    const saved = await this.admin.guardarCliente(base, {
      id,
      orders: base?.orders ?? 0,
      ...this.form.getRawValue(),
    });
    if (!saved) {
      this.errorGuardado.set(this.admin.tomarError());
      return;
    }
    this.dialogo.cerrar();
    // Lote 43 (PBI-0265): al crear, el listado va a la página donde quedó el registro nuevo, para que se vea.
    if (!base) this.filtros.irAlRegistro(this.busqueda, id);
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
  protected async remove(id: string, evento: Event) {
    const lugar = this.foco.recordar(evento);
    const eliminado = await eliminarRegistro({
      nombre: this.admin.customers().find((c) => c.id === id)?.name ?? '',
      id,
      confirmar: (nombre) => confirmarEliminacion(this.dialog, nombre),
      editando: () => this.editing(),
      eliminar: (idEliminado) => this.admin.eliminarCliente(idEliminado),
      salirDeLaEdicion: () => this.reset(),
    });
    if (eliminado) this.foco.restaurar(lugar);
  }
}
