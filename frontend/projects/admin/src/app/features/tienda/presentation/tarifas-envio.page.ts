import { CurrencyPipe } from '@angular/common';
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
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { confirmarEliminacion } from '../../../shared/ui/confirmacion.dialog';
import { focoTrasEliminar } from '../../../shared/ui/foco-tras-eliminar';
import { eliminarRegistro } from '../../../shared/ui/eliminar-registro';
import { TiendaFacade } from '../application/tienda.facade';
import { distritoDeLasOpciones, opcionesDeDistrito } from '../domain/distrito.rules';
import { TablaExportable } from '../domain/exportacion.rules';
import { numeroDeFila, textoDeCantidad, textoDelTotal } from '../domain/listado.rules';
import { BorradorTarifas, borradorDeTarifasVigente } from '../domain/tarifa-envio.rules';
import { TarifaEnvio } from '../domain/tienda.model';
import {
  FILTROS_TARIFAS_VACIOS,
  filtrarTarifasDeEnvio,
  leerFiltrosTarifas,
  parametrosDeFiltrosTarifas,
} from '../domain/filtro-listado.rules';
import { conservarBorrador } from './borrador';
import { dialogoDeRegistro } from './dialogo-de-registro';
import { filtrosDeListado } from './filtros-de-listado';
import { CLASES_ACCION, CLASES_ACCION_ELIMINAR, CLASES_CANCELAR_SUAVE, FichaDeResumen } from './insignia';
import { ListadoComponent } from './listado.component';
import { BusquedaDelRegistro } from './paginacion-de-la-url';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { IconoDirective } from '../../../shared/ui/icono.directive';

const EMPTY_RATE = { origin: '', destinations: [] as string[], destination: '', price: 0 };

/**
 * Tarifas de envío. Lote 21 (ADR-0025): la tarifa se crea y se edita en una ventana emergente, porque tiene tres campos
 * (PBI-0211); el distrito se elige de una lista, varios al crear y uno al editar (PBI-0216); y ya no hay ajuste
 * porcentual: el precio se cambia tarifa por tarifa (PBI-0217).
 *
 * Lote 43 (ADR-0033, PBI-0265): en un solo panel, como la lista de proveedores del SGC, con «N°», las acciones de solo
 * ícono, «Exportar» y el pie con el total, los orígenes y la paginación de 10, 25 o 50 (el rango del pie reemplaza a
 * «Mostrando 1–25 de N tarifas»); la ventana de registro, con «Cancelar» de relleno suave (PBI-0268).
 */
@Component({
  selector: 'ws-shipping-page',
  imports: [
    IconoDirective,
    CurrencyPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ListadoComponent,
    PanelFiltrosComponent,
  ],
  template: `
    <ws-admin-listado
      titulo="Tarifas de envío"
      descripcion="Cada tarifa va de una tienda de origen a un distrito. En el checkout se cobra la tarifa más baja, que corresponde a la tienda más cercana."
      que="tarifas"
      [exportacion]="exportacion"
      [pagina]="ratePage()"
      [tamano]="filtros.tamano()"
      [fichas]="fichas()"
      (cambiarPagina)="filtros.irAPagina($event)"
      (cambiarTamano)="filtros.cambiarTamano($event)"
    >
      <!-- PBI-0155: la búsqueda y el origen van en el panel estándar de la feature 008, con los filtros en la URL. -->
      <ws-filter-panel
        etiqueta="Filtros de tarifas"
        agregarQue="tarifa"
        (agregar)="nuevo()"
        [formGroup]="filtros.borrador"
        [buscando]="filtros.buscando()"
        [error]="filtros.error()"
        (buscar)="filtros.buscar()"
        (limpiar)="filtros.limpiar()"
      >
        <mat-form-field>
          <mat-label>Buscar tarifa</mat-label>
          <input matInput formControlName="texto" />
          <mat-hint>Por distrito u origen</mat-hint>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Filtrar por origen</mat-label>
          <mat-select formControlName="origen">
            <mat-option value="">Todos los orígenes</mat-option>
            @for (origin of origins(); track origin) {
              <mat-option [value]="origin">{{ origin }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </ws-filter-panel>

      <!-- relative: contiene los textos sr-only de la tabla, que si no ensanchan la página a 375 px (como admin-card). -->
      <section class="relative overflow-x-auto border-t border-line" aria-label="Tarifas registradas">
        <table class="w-full min-w-[520px] text-left text-sm">
          <thead class="bg-subtle text-xs font-semibold uppercase text-muted">
            <tr>
              <th class="w-14 px-5 py-3">N°</th>
              <th class="px-4 py-3">Origen</th>
              <th class="px-4 py-3">Distrito</th>
              <th class="px-4 py-3 text-right">Precio</th>
              <th class="px-5 py-3"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            @for (rate of ratePage().items; track rate.id; let i = $index) {
              <tr class="border-t border-line" [class.bg-primary-soft]="rate.id === editing()">
                <td class="px-5 py-3 tabular-nums text-muted">{{ numero(i) }}</td>
                <td class="px-4 py-3">{{ rate.origin }}</td>
                <td class="px-4 py-3">{{ rate.destination }}</td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums">
                  {{ rate.price | currency: 'PEN' : 'symbol' : '1.2-2' }}
                </td>
                <td class="px-5 py-3">
                  <div class="flex justify-end gap-2">
                    <button
                      type="button"
                      [class]="accion"
                      [attr.aria-label]="'Editar tarifa de ' + rate.origin + ' a ' + rate.destination"
                      matTooltip="Editar"
                      (click)="edit(rate.id)"
                    >
                      <svg wsAdminIcono="editar"></svg>
                    </button>
                    <button
                      type="button"
                      [class]="accionEliminar"
                      [attr.aria-label]="'Eliminar tarifa de ' + rate.origin + ' a ' + rate.destination"
                      matTooltip="Eliminar"
                      data-eliminar
                      (click)="remove(rate.id, $event)"
                    >
                      <svg wsAdminIcono="eliminar"></svg>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="border-t border-line px-4 py-10 text-center text-muted">
                  {{
                    admin.rates().length
                      ? 'Ninguna tarifa cumple los filtros. Prueba con otro distrito u origen.'
                      : 'Todavía no hay tarifas.'
                  }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    </ws-admin-listado>

    <!-- PBI-0211: el registro, en la ventana emergente. -->
    <ng-template #registro>
      <h2 mat-dialog-title id="titulo-registro-tarifa">
        {{ editing() ? 'Editar tarifa' : 'Precio para uno o varios distritos' }}
      </h2>
      <form class="contents" [formGroup]="form" (ngSubmit)="save()" aria-labelledby="titulo-registro-tarifa">
        <mat-dialog-content>
          @if (borrador.aviso(); as aviso) {
            <p class="mb-4 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">{{ aviso }}</p>
          }
          <div class="grid gap-3 pt-1">
            <mat-form-field>
              <mat-label>Tienda de origen</mat-label>
              <input matInput formControlName="origin" [attr.list]="'origins'" />
              <datalist id="origins">
                @for (origin of origins(); track origin) {
                  <option [value]="origin"></option>
                }
              </datalist>
              <mat-error>Completa este campo.</mat-error>
            </mat-form-field>
            <!-- PBI-0216: el distrito se elige de la lista; al crear, varios a la vez. -->
            @if (editing()) {
              <mat-form-field>
                <mat-label>Distrito</mat-label>
                <mat-select formControlName="destination">
                  @for (district of districts(); track district) {
                    <mat-option [value]="district">{{ district }}</mat-option>
                  }
                </mat-select>
                <mat-error>Elige un distrito.</mat-error>
              </mat-form-field>
            } @else {
              <!-- La ayuda ocupa dos líneas: el espacio de abajo crece para no tapar el precio. -->
              <mat-form-field subscriptSizing="dynamic">
                <mat-label>Distritos</mat-label>
                <mat-select formControlName="destinations" multiple>
                  @for (district of districts(); track district) {
                    <mat-option [value]="district">{{ district }}</mat-option>
                  }
                </mat-select>
                <mat-hint>
                  Elige uno o varios. Los que ya tienen tarifa desde ese origen se actualizan.
                </mat-hint>
                <mat-error>Elige al menos un distrito.</mat-error>
              </mat-form-field>
            }
            <mat-form-field>
              <mat-label>Precio (S/)</mat-label>
              <input matInput type="number" min="0" step="0.1" formControlName="price" />
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
          <button [class]="botonCancelar" type="button" mat-dialog-close>
            <svg wsAdminIcono="cancelar"></svg>
            Cancelar
          </button>
          <button
            class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            <svg wsAdminIcono="guardar"></svg>
            {{
              admin.saving()
                ? 'Guardando…'
                : editing()
                  ? 'Guardar tarifa'
                  : 'Guardar ' + districtCount() + (districtCount() === 1 ? ' tarifa' : ' tarifas')
            }}
          </button>
        </mat-dialog-actions>
      </form>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarifasEnvioPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly dialog = inject(MatDialog);
  /** Lote 43 (PBI-0269): el foco tras eliminar, en la fila que ocupa su lugar. */
  // PBI-0273: con la página, el foco sabe cuándo la lista volvió a la anterior.
  private readonly foco = focoTrasEliminar({ pagina: () => this.ratePage().page });
  /** La plantilla del formulario, que se abre en la ventana emergente (PBI-0211). */
  private readonly registro = viewChild.required<TemplateRef<unknown>>('registro');
  protected readonly editing = signal<string | null>(null);
  /** Motivo del último guardado rechazado, dentro de la ventana; el formulario conserva lo escrito. */
  protected readonly errorGuardado = signal<string | null>(null);
  /** La tarifa tal como se cargó al pulsar «Editar»: lo que cambió se calcula contra ella (PBI-0120). */
  private base: TarifaEnvio | null = null;
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosTarifas,
    escribir: parametrosDeFiltrosTarifas,
    vacios: FILTROS_TARIFAS_VACIOS,
    que: 'las tarifas',
  });

  /** `destinations` al crear (varios distritos) y `destination` al editar (uno); el modo decide cuál se valida. */
  protected readonly form = new FormGroup({
    origin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    destinations: new FormControl<string[]>([], { nonNullable: true }),
    destination: new FormControl('', { nonNullable: true }),
    price: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
  });

  private readonly chosenDistricts = toSignal(this.form.controls.destinations.valueChanges, {
    initialValue: [] as string[],
  });

  protected readonly origins = computed(() =>
    [...new Set(this.admin.rates().map((rate) => rate.origin))].sort((a, b) => a.localeCompare(b, 'es')),
  );
  /** PBI-0216: los distritos de Lima y el Callao, y los que ya tienen tarifa con otro nombre. */
  protected readonly districts = computed(() => opcionesDeDistrito(this.admin.rates()));
  private readonly visibleRates = computed(() =>
    filtrarTarifasDeEnvio(this.admin.rates(), this.filtros.aplicados()),
  );
  /** Páginas de 10, 25 o 50 (con unas 1.600 tarifas), con la página y el tamaño en la URL (lote 43). */
  protected readonly ratePage = computed(() => this.filtros.paginar(this.visibleRates()));
  /** Dónde buscar una tarifa para ir a su página: con los filtros y sin ellos, en el orden del listado. */
  private readonly busqueda: BusquedaDelRegistro<TarifaEnvio> = {
    filtrados: () => this.visibleRates(),
    todos: () => filtrarTarifasDeEnvio(this.admin.rates(), FILTROS_TARIFAS_VACIOS),
    es: (rate, id) => rate.id === id,
  };
  /** El total de las que cumplen los filtros y de cuántos orígenes salen (lote 43, PBI-0265). */
  protected readonly fichas = computed((): FichaDeResumen[] => {
    const tarifas = this.visibleRates();
    const origenes = new Set(tarifas.map((rate) => rate.origin)).size;
    return [
      { texto: textoDelTotal(tarifas.length), tono: 'principal', icono: 'lista' },
      { texto: textoDeCantidad(origenes, 'origen', 'orígenes'), tono: 'neutro', icono: 'envios' },
    ];
  });
  protected readonly exportacion = (): TablaExportable => ({
    titulo: 'Tarifas de envío',
    columnas: ['N°', 'Origen', 'Distrito', 'Precio (S/)'],
    filas: this.visibleRates().map((rate, i) => [
      i + 1,
      rate.origin,
      rate.destination,
      rate.price.toFixed(2),
    ]),
  });
  protected readonly accion = CLASES_ACCION;
  protected readonly accionEliminar = CLASES_ACCION_ELIMINAR;
  protected readonly botonCancelar = CLASES_CANCELAR_SUAVE;
  protected numero(indice: number): number {
    return numeroDeFila(this.ratePage(), indice);
  }
  protected readonly districtCount = computed(() => this.chosenDistricts().length);

  /**
   * PBI-0157: si la sesión vence, lo escrito (y si se editaba una tarifa) vuelve al ingresar de nuevo, con la ventana
   * abierta; la edición de una tarifa que otra persona eliminó no se restaura (`borradorDeTarifasVigente`).
   */
  protected readonly borrador = conservarBorrador<BorradorTarifas>({
    form: this.form,
    guardar: () => ({
      editando: this.editing() ? this.base : null,
      tarifa: this.form.getRawValue(),
    }),
    restaurar: (guardado) => {
      const vigente = borradorDeTarifasVigente(guardado, this.admin.rates());
      if (!vigente) return false;
      this.base = vigente.editando;
      this.editing.set(vigente.editando?.id ?? null);
      this.form.setValue({ ...vigente.tarifa, destinations: [...vigente.tarifa.destinations] });
      return true;
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

  protected edit(id: string): void {
    const rate = this.admin.rates().find((candidate) => candidate.id === id);
    if (!rate) return;
    this.reset();
    this.base = rate;
    this.editing.set(id);
    this.form.setValue({
      origin: rate.origin,
      destinations: [],
      destination: distritoDeLasOpciones(this.districts(), rate.destination),
      price: rate.price,
    });
    this.dialogo.abrir();
  }

  protected async save(): Promise<void> {
    if (this.admin.saving()) return;
    const { origin, destinations, destination, price } = this.form.getRawValue();
    const editing = this.editing();
    const sinDistrito = editing ? !destination : destinations.length === 0;
    const distrito = editing ? this.form.controls.destination : this.form.controls.destinations;
    if (sinDistrito) distrito.setErrors({ required: true });
    if (this.form.invalid || sinDistrito) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorGuardado.set(null);
    const saved = editing
      ? await this.admin.guardarTarifa(this.base, {
          id: editing,
          origin: origin.trim(),
          destination,
          price,
        })
      : await this.admin.assignRatePrice(origin, destinations, price);
    if (!saved) {
      this.errorGuardado.set(this.admin.tomarError());
      return;
    }
    this.dialogo.cerrar();
    // Lote 43 (PBI-0265): al crear, el listado va a la página donde quedó el registro nuevo, para que se vea. Con
    // varios distritos, a la del primero.
    if (editing) return;
    const nueva = this.admin
      .rates()
      .find((rate) => rate.origin.trim() === origin.trim() && rate.destination === destinations[0]);
    if (nueva) this.filtros.irAlRegistro(this.busqueda, nueva.id);
  }

  protected async remove(id: string, evento: Event): Promise<void> {
    const lugar = this.foco.recordar(evento);
    const eliminado = await eliminarRegistro({
      nombre: this.nombreDeTarifa(id),
      id,
      confirmar: (nombre) => confirmarEliminacion(this.dialog, nombre),
      editando: () => this.editing(),
      eliminar: (idEliminado) => this.admin.eliminarTarifa(idEliminado),
      salirDeLaEdicion: () => this.reset(),
    });
    if (eliminado) this.foco.restaurar(lugar);
  }

  /** Nombre de la tarifa en la ventana de confirmación (PBI-0269): «Miraflores → Surco». */
  private nombreDeTarifa(id: string): string {
    const tarifa = this.admin.rates().find((rate) => rate.id === id);
    return tarifa ? `${tarifa.origin} → ${tarifa.destination}` : '';
  }

  /** «Agregar» (PBI-0171): abre la ventana para fijar el precio de uno o varios distritos. */
  protected nuevo(): void {
    this.reset();
    this.dialogo.abrir();
  }
  protected reset(): void {
    this.editing.set(null);
    this.base = null;
    this.errorGuardado.set(null);
    this.form.reset({ ...EMPTY_RATE, destinations: [] });
  }
}
