import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconoDirective } from '../../../shared/ui/icono.directive';
import type { NombreIcono } from '../../../shared/ui/iconos';

/**
 * Sección de una página de registro, como los formularios del SGC (lote 44, ADR-0033, PBI-0268): su título (`h2`) con
 * un ícono y sus campos en un recuadro con borde.
 */
@Component({
  selector: 'ws-admin-seccion-registro',
  imports: [IconoDirective],
  host: { class: 'block' },
  template: `
    <section class="grid gap-3">
      <h2 class="flex items-center gap-2 text-base font-semibold text-ink">
        <svg [wsAdminIcono]="icono()" class="text-link"></svg>
        {{ titulo() }}
      </h2>
      <div class="grid min-w-0 gap-3 rounded-xl border border-line p-4 sm:p-5">
        <ng-content />
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeccionRegistroComponent {
  readonly titulo = input.required<string>();
  readonly icono = input.required<NombreIcono>();
}
