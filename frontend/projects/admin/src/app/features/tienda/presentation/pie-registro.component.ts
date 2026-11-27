import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconoDirective } from '../../../shared/ui/icono.directive';

/**
 * Pie de una página de registro, como los formularios del SGC (lote 44, ADR-0033, PBI-0268), a la derecha:
 * «Cancelar», con relleno suave, vuelve al listado con sus filtros; «Guardar y continuar», con borde y solo al crear,
 * guarda y abre el registro creado en «Editar» para seguir completándolo; y «Guardar», relleno del principal, guarda y
 * vuelve al listado. Al editar, solo «Cancelar» y «Guardar». El motivo de un guardado rechazado se proyecta encima de
 * los botones, junto a ellos.
 */
@Component({
  selector: 'ws-admin-pie-registro',
  imports: [IconoDirective, RouterLink],
  host: { class: 'block border-t border-line pt-5' },
  template: `
    <ng-content />
    <div class="flex flex-wrap justify-end gap-3">
      <a
        class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-soft px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-ink"
        [routerLink]="listado()"
        queryParamsHandling="preserve"
      >
        <svg wsAdminIcono="cancelar"></svg>
        Cancelar
      </a>
      @if (creando()) {
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-lg border border-link bg-surface px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-link disabled:opacity-50"
          [disabled]="guardando() || deshabilitado()"
          (click)="continuar.emit()"
        >
          <svg wsAdminIcono="guardar"></svg>
          {{ guardando() && continuando() ? 'Guardando…' : 'Guardar y continuar' }}
        </button>
      }
      <button
        type="submit"
        class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold whitespace-nowrap text-on-primary disabled:opacity-50"
        [disabled]="guardando() || deshabilitado()"
      >
        <svg wsAdminIcono="guardar"></svg>
        {{ guardando() && !continuando() ? 'Guardando…' : 'Guardar' }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieRegistroComponent {
  /** Ruta del listado al que vuelve «Cancelar» (`/productos`), con los filtros de la URL. */
  readonly listado = input.required<string>();
  /** Al crear se ofrece «Guardar y continuar»; al editar, solo «Cancelar» y «Guardar». */
  readonly creando = input.required<boolean>();
  readonly guardando = input(false);
  /** Mientras no se puede guardar (por ejemplo, se prepara una imagen). */
  readonly deshabilitado = input(false);
  /** El guardado en curso lo pidió «Guardar y continuar». */
  readonly continuando = input(false);
  /** «Guardar y continuar»: la página guarda y abre el registro creado en «Editar». */
  readonly continuar = output<void>();
}
