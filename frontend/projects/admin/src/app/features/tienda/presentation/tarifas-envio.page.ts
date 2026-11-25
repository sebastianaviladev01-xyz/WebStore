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
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { eliminarRegistro } from '../../../shared/ui/eliminar-registro';
import { TiendaFacade } from '../application/tienda.facade';
import { distritoDeLasOpciones, opcionesDeDistrito } from '../domain/distrito.rules';
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
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

const EMPTY_RATE = { origin: '', destinations: [] as string[], destination: '', price: 0 };

/**
 * Tarifas de envío. Lote 21 (ADR-0025): la tarifa se crea y se edita en una ventana emergente, porque tiene tres campos
 * (PBI-0211); el distrito se elige de una lista, varios al crear y uno al editar (PBI-0216); y ya no hay ajuste
 * porcentual: el precio se cambia tarifa por tarifa (PBI-0217).
 */
@Component({
  selector: 'ws-shipping-page',
  imports: [
    IconoDirective,
    TituloPaginaDirective,
    CurrencyPipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <h1 wsAdminTitulo class="text-3xl font-semibold tracking-tight text-ink">Tarifas de envío</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Cada tarifa va de una tienda de origen a un distrito. En el checkout se cobra la tarifa más baja, que
      corresponde a la tienda más cercana.
    </p>

    <!-- PBI-0155: la búsqueda y el origen van en el panel estándar de la feature 008, con los filtros en la URL. -->
    <ws-filter-panel
      class="mt-7"
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

    <section class="admin-card mt-6 overflow-x-auto" aria-label="Tarifas registradas">
      <p class="border-b border-line p-4 text-sm text-muted" aria-live="polite">
        @if (ratePage().total) {
          Mostrando {{ ratePage().from }}–{{ ratePage().to }} de {{ ratePage().total }} tarifas
          @if (ratePage().total !== admin.rates().length) {
            (de {{ admin.rates().length }} en total)
          }
        } @else if (admin.rates().length) {
          Ninguna tarifa cumple los filtros.
        } @else {
          0 tarifas
        }
      </p>
      <table class="w-full min-w-[520px] text-left text-sm">
        <thead class="bg-subtle text-xs text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">Origen</th>
            <th class="px-4 py-3 font-medium">Distrito</th>
            <th class="px-4 py-3 text-right font-medium">Precio</th>
            <th class="px-4 py-3"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          @for (rate of ratePage().items; track rate.id) {
            <tr class="border-t border-line" [class.bg-primary-soft]="rate.id === editing()">
              <td class="px-4 py-3">{{ rate.origin }}</td>
              <td class="px-4 py-3">{{ rate.destination }}</td>
              <td class="px-4 py-3 text-right font-semibold tabular-nums">
                {{ rate.price | currency: 'PEN' : 'symbol' : '1.2-2' }}
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-3 font-medium">
                  <button
                    class="inline-flex items-center gap-2 text-link"
                    type="button"
                    [attr.aria-label]="'Editar tarifa de ' + rate.origin + ' a ' + rate.destination"
                    (click)="edit(rate.id)"
                  >
                    <svg wsAdminIcono="editar"></svg>
                    Editar
                  </button>
                  <button
                    class="inline-flex items-center gap-2 text-danger"
                    type="button"
                    [attr.aria-label]="'Eliminar tarifa de ' + rate.origin + ' a ' + rate.destination"
                    (click)="remove(rate.id)"
                  >
                    <svg wsAdminIcono="eliminar"></svg>
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4" class="px-4 py-10 text-center text-muted">
                {{ admin.rates().length ? 'Prueba con otro distrito u origen.' : 'Todavía no hay tarifas.' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
      <ws-pagination
        [pagina]="ratePage()"
        etiqueta="Páginas de tarifas"
        (cambiar)="filtros.irAPagina($event)"
      />
    </section>

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
        <mat-dialog-actions align="end">
          <button
            class="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-medium"
            type="button"
            mat-dialog-close
          >
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
  /** Páginas de 25 (con unas 1.600 tarifas), con la página en la URL como los demás listados. */
  protected readonly ratePage = computed(() => this.filtros.paginar(this.visibleRates()));
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
    if (saved) this.dialogo.cerrar();
    else this.errorGuardado.set(this.admin.tomarError());
  }

  protected async remove(id: string): Promise<void> {
    await eliminarRegistro({
      pregunta: '¿Eliminar tarifa?',
      id,
      editando: () => this.editing(),
      eliminar: (idEliminado) => this.admin.eliminarTarifa(idEliminado),
      salirDeLaEdicion: () => this.reset(),
    });
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
