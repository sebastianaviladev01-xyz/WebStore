import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';

import { TiendaFacade } from '../application/tienda.facade';
import {
  aniosDelCalendario,
  diaDeLaSemana,
  diasDelAnio,
  esHoraDeCorte,
  explicacionDeLaRegla,
  MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE,
  MODOS_DE_DIRECCION,
  motivoParaNoAgregarDia,
  REGLAS_DE_PRIMERA_ENTREGA,
} from '../domain/entrega.rules';
import { fechaDeEntrega } from '../domain/pedido.rules';
import {
  ConfiguracionTienda,
  DiaNoLaborable,
  ModoDeDireccion,
  ReglaDePrimeraEntrega,
} from '../domain/tienda.model';
import { confirmarEliminacion } from '../../../shared/ui/confirmacion.dialog';
import { focoTrasEliminar } from '../../../shared/ui/foco-tras-eliminar';
import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

const FECHA_DE_LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * «Entregas y feriados» (lote 17, ADR-0021; confirmado por Sebastián Avila), del superadministrador, como
 * Contenido: la primera fecha de entrega que puede elegir el comprador (PBI-0178) y el calendario de días no laborables
 * (PBI-0183), que usan esa fecha con «el siguiente día hábil» y el plazo de los reclamos. Desde el lote 19 (PBI-0006),
 * también si el pedido lleva una sola dirección de entrega o una por producto. El BFF valida y decide.
 */
@Component({
  selector: 'ws-admin-deliveries-page',
  imports: [
    IconoDirective,
    TituloPaginaDirective,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
  ],
  template: `
    <h1 wsAdminTitulo class="text-3xl font-semibold tracking-tight text-ink">Entregas y feriados</h1>
    <p class="mt-3 max-w-3xl text-sm text-muted">
      Desde qué fecha puede pedir la entrega el comprador y qué días no se trabaja. Los días no laborables
      también cuentan para el plazo de respuesta del libro de reclamaciones.
    </p>

    <div class="mt-7 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="grid h-fit min-w-0 gap-6">
        <form [formGroup]="entrega" (ngSubmit)="guardarEntrega()" class="admin-card h-fit min-w-0 p-6">
          <fieldset>
            <legend id="ws-primera-entrega" class="text-lg font-semibold">Primera fecha de entrega</legend>
            <p id="ws-primera-entrega-ayuda" class="mt-1 text-sm leading-6 text-muted">
              La primera fecha que el comprador puede elegir en el checkout. La tienda la propone y no acepta
              una anterior.
            </p>
            <mat-radio-group
              formControlName="firstDeliveryDay"
              class="mt-4 grid gap-2"
              aria-labelledby="ws-primera-entrega"
              aria-describedby="ws-primera-entrega-ayuda"
            >
              @for (regla of reglas; track regla.valor) {
                <mat-radio-button [value]="regla.valor">{{ regla.etiqueta }}</mat-radio-button>
              }
            </mat-radio-group>
          </fieldset>
          <mat-form-field class="mt-5 w-full sm:max-w-80">
            <mat-label>Hora de corte (opcional)</mat-label>
            <input matInput type="time" formControlName="deliveryCutoffTime" />
            <mat-hint>En hora de Lima. Vacía: sin hora de corte.</mat-hint>
            @if (entrega.controls.deliveryCutoffTime.invalid) {
              <mat-error>Usa una hora de 24 horas, como 14:00, o déjala vacía.</mat-error>
            }
          </mat-form-field>
          <p class="mt-4 rounded-xl bg-subtle p-3 text-sm leading-6" aria-live="polite">
            {{ explicacion() }}
          </p>
          @if (errorDeEntrega()) {
            <p
              class="mt-4 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
              role="alert"
            >
              {{ errorDeEntrega() }}
            </p>
          }
          <div class="mt-5 flex flex-wrap items-center gap-4">
            <button
              class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
              type="submit"
              [disabled]="admin.saving()"
            >
              <svg wsAdminIcono="guardar"></svg>
              {{ admin.saving() ? 'Guardando…' : 'Guardar primera fecha' }}
            </button>
            @if (entregaGuardada()) {
              <p class="text-sm text-on-primary-soft" role="status">La tienda ya usa esta regla.</p>
            }
          </div>
        </form>

        <!-- Lote 19 (ADR-0021, PBI-0006; confirmado por Sebastián Avila): una dirección por pedido o una por producto. -->
        <form
          [formGroup]="direcciones"
          (ngSubmit)="guardarDirecciones()"
          class="admin-card h-fit min-w-0 p-6"
        >
          <fieldset>
            <legend id="ws-direccion-entrega" class="text-lg font-semibold">Dirección de entrega</legend>
            <p id="ws-direccion-entrega-ayuda" class="mt-1 text-sm leading-6 text-muted">
              Si cada pedido va a una sola dirección o si el comprador puede enviar cada producto a otra.
            </p>
            <mat-radio-group
              formControlName="deliveryAddressMode"
              class="mt-4 grid gap-2"
              aria-labelledby="ws-direccion-entrega"
              aria-describedby="ws-direccion-entrega-ayuda"
            >
              @for (modo of modos; track modo.valor) {
                <mat-radio-button [value]="modo.valor">{{ modo.etiqueta }}</mat-radio-button>
              }
            </mat-radio-group>
          </fieldset>
          <p class="mt-4 rounded-xl bg-subtle p-3 text-sm leading-6" aria-live="polite">
            {{ explicacionDelModo() }}
          </p>
          @if (errorDeDirecciones()) {
            <p
              class="mt-4 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
              role="alert"
            >
              {{ errorDeDirecciones() }}
            </p>
          }
          <div class="mt-5 flex flex-wrap items-center gap-4">
            <button
              class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-50"
              type="submit"
              [disabled]="admin.saving()"
            >
              <svg wsAdminIcono="guardar"></svg>
              {{ admin.saving() ? 'Guardando…' : 'Guardar dirección de entrega' }}
            </button>
            @if (direccionesGuardadas()) {
              <p class="text-sm text-on-primary-soft" role="status">La tienda ya usa esta opción.</p>
            }
          </div>
        </form>
      </div>

      <section class="admin-card h-fit min-w-0 p-6" aria-labelledby="ws-dias-no-laborables">
        <h2 id="ws-dias-no-laborables" class="text-lg font-semibold">Días no laborables</h2>
        <p class="mt-1 text-sm leading-6 text-muted">
          Feriados y días en que la tienda no atiende. Además, nunca son hábiles los sábados ni los domingos.
          Agrega los del año siguiente antes de que empiece.
        </p>

        <form
          [formGroup]="nuevoDia"
          (ngSubmit)="agregar()"
          class="mt-5 grid gap-3 sm:grid-cols-[180px_1fr_auto]"
        >
          <mat-form-field>
            <mat-label>Fecha</mat-label>
            <input matInput type="date" formControlName="date" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Nombre (opcional)</mat-label>
            <input matInput formControlName="name" [attr.maxlength]="maximoNombre" />
            <mat-hint>Por ejemplo, «Fiestas Patrias».</mat-hint>
          </mat-form-field>
          <button
            class="inline-flex items-center gap-2 h-14 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-50"
            type="submit"
            [disabled]="admin.saving()"
          >
            <svg wsAdminIcono="agregar"></svg>
            Agregar
          </button>
        </form>
        @if (errorDeDia()) {
          <p
            class="mt-3 rounded-xl border border-danger-line bg-danger-soft p-3 text-sm text-danger"
            role="alert"
          >
            {{ errorDeDia() }}
          </p>
        }

        <div class="mt-5 flex flex-wrap items-end justify-between gap-3">
          <mat-form-field class="max-w-40">
            <mat-label>Año</mat-label>
            <mat-select [value]="anio()" (selectionChange)="anio.set($event.value)">
              @for (opcion of anios(); track opcion) {
                <mat-option [value]="opcion">{{ opcion }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <p class="pb-5 text-sm text-muted" aria-live="polite">
            {{ delAnio().length }} {{ delAnio().length === 1 ? 'día' : 'días' }} en {{ anio() }}
          </p>
        </div>
        <div class="overflow-x-auto rounded-2xl border border-line">
          <table class="w-full text-left text-sm" [attr.aria-label]="'Días no laborables de ' + anio()">
            <thead class="bg-subtle text-xs text-muted">
              <tr>
                <th class="px-4 py-3 font-medium">Fecha</th>
                <th class="px-4 py-3 font-medium">Día</th>
                <th class="px-4 py-3 font-medium">Nombre</th>
                <th class="px-4 py-3"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (dia of delAnio(); track dia.id) {
                <tr class="border-t border-line">
                  <td class="px-4 py-3 font-medium tabular-nums">{{ fecha(dia.date) }}</td>
                  <td class="px-4 py-3">{{ diaDeLaSemana(dia.date) }}</td>
                  <td class="px-4 py-3">{{ dia.name || '—' }}</td>
                  <td class="px-4 py-3 text-right">
                    <button
                      class="inline-flex items-center gap-2 font-medium text-danger disabled:opacity-50"
                      type="button"
                      [disabled]="admin.saving()"
                      [attr.aria-label]="'Quitar el ' + fecha(dia.date)"
                      data-eliminar
                      (click)="quitar(dia, $event)"
                    >
                      <svg wsAdminIcono="quitar"></svg>
                      Quitar
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-4 py-8 text-center text-muted">
                    No hay días no laborables en {{ anio() }}: solo se descansan sábados y domingos.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntregasPage {
  protected readonly admin = inject(TiendaFacade);
  private readonly dialog = inject(MatDialog);
  /** Lote 43 (PBI-0269): el foco tras eliminar, en la fila que ocupa su lugar. */
  private readonly foco = focoTrasEliminar();
  protected readonly reglas = REGLAS_DE_PRIMERA_ENTREGA;
  protected readonly maximoNombre = MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE;
  protected readonly diaDeLaSemana = diaDeLaSemana;
  protected readonly fecha = fechaDeEntrega;

  protected readonly entrega = new FormGroup({
    firstDeliveryDay: new FormControl<ReglaDePrimeraEntrega>('next-calendar-day', { nonNullable: true }),
    deliveryCutoffTime: new FormControl('', {
      nonNullable: true,
      validators: [(control) => (esHoraDeCorte(String(control.value ?? '')) ? null : { hora: true })],
    }),
  });
  private readonly valorDeEntrega = toSignal(this.entrega.valueChanges, {
    initialValue: this.entrega.getRawValue(),
  });
  protected readonly explicacion = computed(() => {
    const { firstDeliveryDay, deliveryCutoffTime } = this.valorDeEntrega();
    return explicacionDeLaRegla(firstDeliveryDay ?? 'next-calendar-day', deliveryCutoffTime ?? '');
  });
  /** La configuración tal como se cargó en el formulario: solo viaja lo que cambió (PBI-0120). */
  private base: ConfiguracionTienda | null = null;
  protected readonly errorDeEntrega = signal<string | null>(null);
  protected readonly entregaGuardada = signal(false);

  protected readonly modos = MODOS_DE_DIRECCION;
  protected readonly direcciones = new FormGroup({
    deliveryAddressMode: new FormControl<ModoDeDireccion>('per-order', { nonNullable: true }),
  });
  private readonly modoElegido = toSignal(this.direcciones.controls.deliveryAddressMode.valueChanges, {
    initialValue: this.direcciones.controls.deliveryAddressMode.value,
  });
  protected readonly explicacionDelModo = computed(
    () => MODOS_DE_DIRECCION.find((modo) => modo.valor === this.modoElegido())?.explicacion ?? '',
  );
  /** La configuración tal como se cargó en el formulario de la dirección: solo viaja lo que cambió (PBI-0120). */
  private baseDeDirecciones: ConfiguracionTienda | null = null;
  protected readonly errorDeDirecciones = signal<string | null>(null);
  protected readonly direccionesGuardadas = signal(false);

  protected readonly nuevoDia = new FormGroup({
    date: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true }),
  });
  protected readonly errorDeDia = signal<string | null>(null);
  private readonly anioActual = FECHA_DE_LIMA.format(new Date()).slice(0, 4);
  protected readonly anio = signal(this.anioActual);
  protected readonly anios = computed(() =>
    aniosDelCalendario(this.admin.nonWorkingDates(), this.anioActual),
  );
  protected readonly delAnio = computed(() => diasDelAnio(this.admin.nonWorkingDates(), this.anio()));

  constructor() {
    // Los datos del BFF rellenan el formulario mientras la persona no lo editó (PBI-0125).
    effect(() => {
      const config = this.admin.config();
      if (!config || this.entrega.dirty) return;
      this.base = config;
      this.entrega.setValue({
        firstDeliveryDay: config.firstDeliveryDay ?? 'next-calendar-day',
        deliveryCutoffTime: config.deliveryCutoffTime ?? '',
      });
    });
    effect(() => {
      const config = this.admin.config();
      if (!config || this.direcciones.dirty) return;
      this.baseDeDirecciones = config;
      this.direcciones.setValue({ deliveryAddressMode: config.deliveryAddressMode ?? 'per-order' });
    });
  }

  protected async guardarDirecciones(): Promise<void> {
    this.direccionesGuardadas.set(false);
    this.errorDeDirecciones.set(null);
    const base = this.baseDeDirecciones;
    if (!base || this.admin.saving()) return;
    if (!(await this.admin.guardarConfiguracion(base, { ...base, ...this.direcciones.getRawValue() }))) {
      this.errorDeDirecciones.set(
        this.admin.tomarError() ?? 'No pudimos guardar la dirección de entrega. Inténtalo de nuevo.',
      );
      return;
    }
    this.baseDeDirecciones = this.admin.config() ?? base;
    this.direcciones.markAsPristine();
    this.direccionesGuardadas.set(true);
  }

  protected async guardarEntrega(): Promise<void> {
    this.entregaGuardada.set(false);
    this.errorDeEntrega.set(null);
    const base = this.base;
    if (!base || this.admin.saving()) return;
    if (this.entrega.invalid) {
      this.entrega.markAllAsTouched();
      return;
    }
    if (!(await this.admin.guardarConfiguracion(base, { ...base, ...this.entrega.getRawValue() }))) {
      this.errorDeEntrega.set(
        this.admin.tomarError() ?? 'No pudimos guardar la primera fecha de entrega. Inténtalo de nuevo.',
      );
      return;
    }
    this.base = this.admin.config() ?? base;
    this.entrega.markAsPristine();
    this.entregaGuardada.set(true);
  }

  protected async agregar(): Promise<void> {
    this.errorDeDia.set(null);
    if (this.admin.saving()) return;
    const { date, name } = this.nuevoDia.getRawValue();
    const motivo = motivoParaNoAgregarDia(this.admin.nonWorkingDates(), date, name);
    if (motivo) {
      this.errorDeDia.set(motivo);
      return;
    }
    const dia: DiaNoLaborable = { id: crypto.randomUUID(), date, name: name.trim() };
    if (!(await this.admin.agregarDiaNoLaborable(dia))) {
      this.errorDeDia.set(this.admin.tomarError() ?? 'No pudimos agregar el día. Inténtalo de nuevo.');
      return;
    }
    // El año del día agregado queda a la vista.
    this.anio.set(date.slice(0, 4));
    this.nuevoDia.reset();
  }

  protected async quitar(dia: DiaNoLaborable, evento: Event): Promise<void> {
    this.errorDeDia.set(null);
    const nombre = dia.name ? ` (${dia.name})` : '';
    // Lote 43 (ADR-0033, PBI-0269): la ventana propia de confirmación, con la fecha y su nombre.
    const lugar = this.foco.recordar(evento);
    if (!(await confirmarEliminacion(this.dialog, `${this.fecha(dia.date)}${nombre}`))) return;
    if (await this.admin.quitarDiaNoLaborable(dia.id)) this.foco.restaurar(lugar);
    else this.errorDeDia.set(this.admin.tomarError() ?? 'No pudimos quitar el día. Inténtalo de nuevo.');
  }
}
