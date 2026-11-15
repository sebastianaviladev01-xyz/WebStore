import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TiendaFacade } from '../application/tienda.facade';
import { BorradorTarifas, borradorDeTarifasVigente, leerDistritos } from '../domain/tarifa-envio.rules';
import { TarifaEnvio } from '../domain/tienda.model';
import {
  FILTROS_TARIFAS_VACIOS,
  filtrarTarifasDeEnvio,
  leerFiltrosTarifas,
  parametrosDeFiltrosTarifas,
} from '../domain/filtro-listado.rules';
import { conservarBorrador } from './borrador';
import { filtrosDeListado } from './filtros-de-listado';
import { PaginacionComponent } from './paginacion.component';
import { PanelFiltrosComponent } from './panel-filtros.component';

const EMPTY_RATE = { origin: '', destinations: '', price: 0 };

@Component({
  selector: 'ws-shipping-page',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    PanelFiltrosComponent,
    PaginacionComponent,
  ],
  template: `
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Tarifas de envío</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Cada tarifa va de una tienda de origen a un distrito. En el checkout se cobra la tarifa más baja, que
      corresponde a la tienda más cercana.
    </p>

    <!-- PBI-0155: la búsqueda y el origen van en el panel estándar de la feature 008, con los filtros en la URL. -->
    <ws-filter-panel
      class="mt-7"
      etiqueta="Filtros de tarifas"
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
    @if (borrador.aviso(); as aviso) {
      <p class="mt-6 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">{{ aviso }}</p>
    }

    <div class="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section class="admin-card overflow-x-auto" aria-label="Tarifas registradas">
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
                      class="text-link"
                      type="button"
                      [attr.aria-label]="'Editar tarifa de ' + rate.origin + ' a ' + rate.destination"
                      (click)="edit(rate.id)"
                    >
                      Editar
                    </button>
                    <button
                      class="text-danger"
                      type="button"
                      [attr.aria-label]="'Eliminar tarifa de ' + rate.origin + ' a ' + rate.destination"
                      (click)="remove(rate.id)"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-4 py-10 text-center text-muted">
                  {{
                    admin.rates().length ? 'Prueba con otro distrito u origen.' : 'Todavía no hay tarifas.'
                  }}
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

      <div class="grid h-fit gap-6">
        <form #rateForm="ngForm" [formGroup]="form" (ngSubmit)="save()" class="admin-card p-6">
          <h2 class="text-lg font-semibold">
            {{ editing() ? 'Editar tarifa' : 'Precio para uno o varios distritos' }}
          </h2>
          <div class="mt-4 grid gap-3">
            <mat-form-field>
              <mat-label>Tienda de origen</mat-label>
              <input matInput formControlName="origin" [attr.list]="'origins'" />
              <datalist id="origins">
                @for (origin of origins(); track origin) {
                  <option [value]="origin"></option>
                }
              </datalist>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ editing() ? 'Distrito' : 'Distritos' }}</mat-label>
              <textarea matInput rows="3" formControlName="destinations"></textarea>
              @if (!editing()) {
                <mat-hint>Uno por línea o separados por coma. Los que ya existen se actualizan.</mat-hint>
              }
            </mat-form-field>
            <mat-form-field>
              <mat-label>Precio (S/)</mat-label>
              <input matInput type="number" min="0" step="0.1" formControlName="price" />
            </mat-form-field>
          </div>
          <div class="mt-4 flex flex-wrap gap-3">
            <button
              class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
              type="submit"
            >
              {{
                editing()
                  ? 'Guardar tarifa'
                  : 'Guardar ' + districtCount() + (districtCount() === 1 ? ' tarifa' : ' tarifas')
              }}
            </button>
            @if (editing()) {
              <button
                class="rounded-lg border border-line px-5 py-2.5 text-sm font-medium"
                type="button"
                (click)="reset()"
              >
                Cancelar
              </button>
            }
          </div>
        </form>

        <form [formGroup]="adjustment" (ngSubmit)="adjust()" class="admin-card p-6">
          <h2 class="text-lg font-semibold">Ajuste porcentual</h2>
          <p class="mt-1 text-sm text-muted">
            Sube o baja precios de golpe, por ejemplo para actualizar por inflación.
          </p>
          <div class="mt-4 grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
            <mat-form-field>
              <mat-label>Porcentaje</mat-label>
              <input matInput type="number" step="0.5" formControlName="percent" />
              <span matTextSuffix>%</span>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Aplicar a</mat-label>
              <mat-select formControlName="origin">
                <mat-option value="">Todas las tarifas</mat-option>
                @for (origin of origins(); track origin) {
                  <mat-option [value]="origin">Origen {{ origin }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <button
            class="mt-2 rounded-lg border border-link px-5 py-2.5 text-sm font-semibold text-link"
            type="submit"
          >
            Aplicar a {{ adjustmentScope() }} {{ adjustmentScope() === 1 ? 'tarifa' : 'tarifas' }}
          </button>
        </form>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarifasEnvioPage {
  protected readonly admin = inject(TiendaFacade);
  /** resetForm (no form.reset) limpia también el estado enviado; si no, el formulario vacío se muestra con errores. */
  private readonly formDirective = viewChild.required<FormGroupDirective>('rateForm');
  protected readonly editing = signal<string | null>(null);
  /** La tarifa tal como se cargó al pulsar «Editar»: lo que cambió se calcula contra ella (PBI-0120). */
  private base: TarifaEnvio | null = null;
  protected readonly filtros = filtrosDeListado({
    leer: leerFiltrosTarifas,
    escribir: parametrosDeFiltrosTarifas,
    vacios: FILTROS_TARIFAS_VACIOS,
    que: 'las tarifas',
  });

  protected readonly form = new FormGroup({
    origin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    destinations: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
  });
  protected readonly adjustment = new FormGroup({
    percent: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(-90)],
    }),
    origin: new FormControl('', { nonNullable: true }),
  });

  private readonly destinationsText = toSignal(this.form.controls.destinations.valueChanges, {
    initialValue: '',
  });
  private readonly adjustmentOrigin = toSignal(this.adjustment.controls.origin.valueChanges, {
    initialValue: '',
  });

  protected readonly origins = computed(() =>
    [...new Set(this.admin.rates().map((rate) => rate.origin))].sort((a, b) => a.localeCompare(b, 'es')),
  );
  private readonly visibleRates = computed(() =>
    filtrarTarifasDeEnvio(this.admin.rates(), this.filtros.aplicados()),
  );
  /** Páginas de 25 (con unas 1.600 tarifas), con la página en la URL como los demás listados. */
  protected readonly ratePage = computed(() => this.filtros.paginar(this.visibleRates()));
  protected readonly districtCount = computed(() => leerDistritos(this.destinationsText()).length);
  protected readonly adjustmentScope = computed(() => {
    const origin = this.adjustmentOrigin();
    return origin
      ? this.admin.rates().filter((rate) => rate.origin === origin).length
      : this.admin.rates().length;
  });

  /**
   * PBI-0157: si la sesión vence, lo escrito en los dos formularios (y si se editaba una tarifa) vuelve al ingresar de
   * nuevo; la edición de una tarifa que otra persona eliminó no se restaura (`borradorDeTarifasVigente`).
   */
  protected readonly borrador = conservarBorrador<BorradorTarifas>({
    form: new FormGroup({ tarifa: this.form, ajuste: this.adjustment }),
    guardar: () => ({
      editando: this.editing() ? this.base : null,
      tarifa: this.form.getRawValue(),
      ajuste: this.adjustment.getRawValue(),
    }),
    restaurar: (guardado) => {
      const vigente = borradorDeTarifasVigente(guardado, this.admin.rates());
      if (!vigente) return false;
      this.base = vigente.editando;
      this.editing.set(vigente.editando?.id ?? null);
      this.form.setValue(vigente.tarifa);
      this.adjustment.setValue(vigente.ajuste);
      return true;
    },
  });

  protected edit(id: string): void {
    const rate = this.admin.rates().find((candidate) => candidate.id === id);
    if (!rate) return;
    this.base = rate;
    this.editing.set(id);
    this.form.setValue({ origin: rate.origin, destinations: rate.destination, price: rate.price });
  }

  protected async save(): Promise<void> {
    if (this.admin.saving()) return;
    const destinations = leerDistritos(this.form.controls.destinations.value);
    if (this.form.invalid || destinations.length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const { origin, price } = this.form.getRawValue();
    const editing = this.editing();
    const saved = editing
      ? await this.admin.guardarTarifa(this.base, {
          id: editing,
          origin: origin.trim(),
          destination: destinations[0],
          price,
        })
      : await this.admin.assignRatePrice(origin, destinations, price);
    if (saved) this.reset();
  }

  protected async adjust(): Promise<void> {
    const { percent, origin } = this.adjustment.getRawValue();
    if (this.adjustment.invalid || percent === 0) return;
    const scope = origin ? `las tarifas con origen ${origin}` : 'todas las tarifas';
    if (!confirm(`¿Aplicar ${percent > 0 ? '+' : ''}${percent}% a ${scope}?`)) return;
    if (await this.admin.adjustRatePrices(percent, origin || null))
      this.adjustment.reset({ percent: 0, origin });
  }

  protected async remove(id: string): Promise<void> {
    if (!confirm('¿Eliminar tarifa?')) return;
    // Si se elimina la tarifa en edición, el formulario sale de la edición: no se vuelve a crear (PBI-0122).
    if ((await this.admin.eliminarTarifa(id)) && this.editing() === id) this.reset();
  }

  protected reset(): void {
    this.editing.set(null);
    this.base = null;
    this.formDirective().resetForm(EMPTY_RATE);
  }
}
