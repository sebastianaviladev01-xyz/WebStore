import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IconoDirective } from './icono.directive';

/**
 * Ayuda de un campo de un registro, con un ícono de información delante, como los formularios del SGC (lote 44,
 * ADR-0033, PBI-0268). El texto sigue a la vista y en el mismo lugar (bajo el campo o en su grupo): el ícono es
 * decorativo y no cambia la descripción accesible del campo.
 */
@Component({
  selector: 'ws-admin-texto-ayuda',
  imports: [IconoDirective],
  host: { class: 'inline-flex items-start gap-1.5' },
  template: `
    <svg wsAdminIcono="info" class="mt-px h-3.5! w-3.5!"></svg>
    <span><ng-content /></span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextoAyudaComponent {}
