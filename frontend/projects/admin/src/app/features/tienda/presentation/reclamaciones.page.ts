import { CurrencyPipe, DatePipe, formatDate } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
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
import { TablaExportable } from '../domain/exportacion.rules';
import { mensajeDeError } from '../domain/formulario.rules';
import { contarPorClave, numeroDeFila, textoDeCantidad, textoDelTotal } from '../domain/listado.rules';
import { ZONA_HORARIA_LIMA } from '../domain/pedido.rules';
import { conservarBorrador } from './borrador';
import { filtrosDeListado } from './filtros-de-listado';
import { clasesDeInsignia, FichaDeResumen, Tono } from './insignia';
import { ListadoComponent } from './listado.component';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { IconoDirective } from '../../../shared/ui/icono.directive';
import { NombreIcono } from '../../../shared/ui/iconos';

/**
 * Cada estado de una reclamación: el tono de su insignia y su ficha del pie (lote 43, PBI-0265). Recibido, del
 * principal; en revisión, naranja; resuelto, verde.
 */
const ESTADOS_RECLAMO: Readonly<
  Record<Reclamo['status'], { tono: Tono; icono: NombreIcono; singular: string; plural: string }>
> = {
  received: { tono: 'principal', icono: 'reclamaciones', singular: 'recibida', plural: 'recibidas' },
  'in-review': { tono: 'alerta', icono: 'ver', singular: 'en revisión', plural: 'en revisión' },
  resolved: { tono: 'exito', icono: 'activar', singular: 'resuelta', plural: 'resueltas' },
};

@Component({
  selector: 'ws-complaints-admin-page',
  imports: [
    IconoDirective,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ListadoComponent,
    PanelFiltrosComponent,
  ],
  template: `
    @if (borrador.aviso(); as aviso) {
      <p class="mb-6 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">{{ aviso }}</p>
    }
    <!--
      Lote 43 (ADR-0033, PBI-0265): la lista, en un solo panel como la lista de proveedores del SGC; el detalle sigue a
      su lado desde 1280 px y debajo por debajo de ese ancho.
    -->
    <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <ws-admin-listado
        titulo="Reclamaciones"
        descripcion="Consulta la información registrada por el consumidor, actualiza el estado y documenta la respuesta del proveedor."
        que="reclamaciones"
        [exportacion]="exportacion"
        [pagina]="pagina()"
        [tamano]="filtros.tamano()"
        [fichas]="fichas()"
        (cambiarPagina)="filtros.irAPagina($event)"
        (cambiarTamano)="filtros.cambiarTamano($event)"
      >
        <ws-filter-panel
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
        <section class="border-t border-line" aria-label="Lista de reclamaciones">
          <!--
          Lote 25 (ADR-0025): la reclamación abierta en el detalle se marca en la lista, con aria-current para un lector
          de pantalla y, a la vista, con el fondo de la fila y una barra del color de los enlaces a la izquierda.
        -->
          @for (item of pagina().items; track item.id; let i = $index) {
            <button
              data-sin-icono="fila"
              type="button"
              class="grid w-full grid-cols-[2rem_minmax(0,1fr)] gap-x-4 gap-y-2 border-b border-line px-5 py-4 text-left last:border-b-0 hover:bg-subtle sm:grid-cols-[2.5rem_150px_minmax(0,1fr)_auto] sm:items-center"
              [class.ws-fila-actual]="selected()?.id === item.id"
              [attr.aria-current]="selected()?.id === item.id ? 'true' : null"
              (click)="select(item)"
            >
              <span class="text-sm tabular-nums text-muted max-sm:row-span-3 max-sm:self-start">
                {{ numero(i) }}
              </span>
              <span>
                <strong class="block">{{ item.id }}</strong>
                <small class="text-muted">{{ item.createdAt | date: 'short' : zonaLima }}</small>
              </span>
              <span>
                <strong class="block">{{ item.subject }}</strong>
                <small class="text-muted">{{ item.name }} · {{ item.email }}</small>
              </span>
              <span [class]="insignia(estados[item.status].tono)">{{ statusLabels[item.status] }}</span>
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
        </section>
      </ws-admin-listado>
      @if (selected(); as item) {
        <aside class="admin-card h-fit scroll-mt-6 p-6" aria-labelledby="titulo-detalle-reclamacion">
          <!-- Lote 25: por debajo de 1280 px, el detalle va debajo de la lista; al abrirlo, la vista y el foco van aquí. -->
          <h2 id="titulo-detalle-reclamacion" class="text-xl font-semibold" tabindex="-1">{{ item.id }}</h2>
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
              class="inline-flex items-center gap-2 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
              type="submit"
            >
              <svg wsAdminIcono="guardar"></svg>
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
  protected readonly resultados = computed(() =>
    filtrarReclamos(this.admin.complaints(), this.filtros.aplicados()),
  );
  protected readonly pagina = computed(() => this.filtros.paginar(this.resultados()));
  protected readonly insignia = clasesDeInsignia;
  protected readonly estados = ESTADOS_RECLAMO;
  /** El total y cuántas hay en cada estado (lote 43, PBI-0265). */
  protected readonly fichas = computed((): FichaDeResumen[] => {
    const resultados = this.resultados();
    return [
      { texto: textoDelTotal(resultados.length), tono: 'principal', icono: 'lista' },
      ...contarPorClave(resultados, (item) => item.status, this.statuses).map(({ clave, cantidad }) => {
        const estado = ESTADOS_RECLAMO[clave];
        return {
          texto: textoDeCantidad(cantidad, estado.singular, estado.plural),
          tono: estado.tono,
          icono: estado.icono,
        };
      }),
    ];
  });
  protected readonly exportacion = (): TablaExportable => ({
    titulo: 'Reclamaciones',
    columnas: ['N°', 'Código', 'Fecha', 'Asunto', 'Consumidor', 'Correo', 'Estado'],
    filas: this.resultados().map((item, i) => [
      i + 1,
      item.id,
      formatDate(item.createdAt, 'dd/MM/yyyy HH:mm', 'es-PE', ZONA_HORARIA_LIMA),
      item.subject,
      item.name,
      item.email,
      this.statusLabels[item.status],
    ]),
  });
  protected numero(indice: number): number {
    return numeroDeFila(this.pagina(), indice);
  }
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

  private readonly injector = inject(Injector);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  protected select(item: Reclamo) {
    this.saved.set(false);
    this.selected.set(item);
    this.form.setValue({ status: item.status, providerResponse: item.providerResponse });
    this.mostrarDetalle();
  }
  /**
   * Lote 25 (ADR-0025): por debajo de `xl` (1280 px) el detalle no está al lado de la lista sino debajo, fuera de la
   * vista: al abrir una reclamación, la vista baja al detalle y el foco pasa a su título, para que un lector de
   * pantalla lo anuncie. Desde 1280 px el detalle ya está a la vista y el foco se queda en la fila.
   */
  private mostrarDetalle() {
    if (!window.matchMedia('(width < 80rem)').matches) return;
    afterNextRender(
      () => {
        const titulo = this.host.querySelector<HTMLElement>('#titulo-detalle-reclamacion');
        if (!titulo) return;
        const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        titulo.closest('aside')?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
        titulo.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
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
