import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { of, startWith, switchMap } from 'rxjs';

import { SesionFacade } from '../../sesion/application/sesion.facade';
import { fechaDeCabecera } from '../domain/registro.rules';
import { IconoDirective } from '../../../shared/ui/icono.directive';

let siguienteId = 0;

/**
 * Fila de cabecera de una página de registro, como los formularios del SGC (lote 44, ADR-0033, PBI-0268): bajo una
 * línea divisoria, «Estado» como selector en píldora (Activo o Inactivo, solo en los registros que lo tienen),
 * «Usuario» (la persona de la sesión, que registra o edita) y «Fecha» (la fecha y la hora al abrir la página, en hora de
 * Lima, `dd/mm/aaaa hh:mm`). No cambia el BFF: el usuario y la fecha no se guardan. El selector es un `<select>` nativo
 * con su `<label>`, dentro del `<form>`; cambia el control `active` del formulario.
 */
@Component({
  selector: 'ws-admin-datos-registro',
  imports: [IconoDirective],
  host: { class: 'block' },
  template: `
    <div
      role="group"
      aria-label="Datos del registro"
      class="flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-line pt-5"
    >
      @if (estado(); as control) {
        <div class="grid gap-1.5">
          <label [for]="idEstado" class="text-xs font-semibold text-muted">Estado</label>
          <span class="relative inline-flex">
            <select
              [id]="idEstado"
              class="min-h-9 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface py-1.5 pr-10 pl-4 text-sm font-semibold text-ink"
              [value]="activo() === false ? 'inactivo' : 'activo'"
              (change)="elegirEstado(control, $event)"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <svg
              wsAdminIcono="siguiente"
              class="pointer-events-none absolute top-1/2 right-3 h-4! w-4! -translate-y-1/2 rotate-90 text-muted"
            ></svg>
          </span>
        </div>
      }
      <div class="grid min-w-0 gap-1.5">
        <span class="text-xs font-semibold text-muted">Usuario</span>
        <span class="flex min-h-9 min-w-0 items-center gap-2 text-sm font-semibold text-ink">
          <svg wsAdminIcono="perfil" class="text-muted"></svg>
          <span class="truncate">{{ sesion.user()?.name }}</span>
        </span>
      </div>
      <div class="grid gap-1.5">
        <span class="text-xs font-semibold text-muted">Fecha</span>
        <span class="flex min-h-9 items-center gap-2 text-sm font-semibold whitespace-nowrap text-ink">
          <svg wsAdminIcono="calendario" class="text-muted"></svg>
          {{ fecha }}
        </span>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatosRegistroComponent {
  protected readonly sesion = inject(SesionFacade);
  /** El estado del registro (activo o no); sin él, la fila no tiene «Estado» (por ejemplo, las categorías). */
  readonly estado = input<FormControl<boolean>>();
  protected readonly idEstado = `estado-registro-${++siguienteId}`;
  /** La fecha y la hora al abrir la página, en hora de Lima. */
  protected readonly fecha = fechaDeCabecera(new Date());
  /**
   * El valor del control, también cuando lo cambia la página (al traer el registro o al restaurar un borrador): la
   * página es `OnPush` y el control es el mismo, así que se escucha su `valueChanges`.
   */
  protected readonly activo = toSignal(
    toObservable(this.estado).pipe(
      switchMap((control) => (control ? control.valueChanges.pipe(startWith(control.value)) : of(null))),
    ),
    { initialValue: null },
  );

  protected elegirEstado(control: FormControl<boolean>, evento: Event): void {
    control.setValue((evento.target as HTMLSelectElement).value === 'activo');
    control.markAsDirty();
  }
}
