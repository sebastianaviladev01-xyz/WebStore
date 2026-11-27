import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconoDirective } from './icono.directive';

/**
 * Tarjeta de las interfaces de registro cuando la consulta del snapshot falló y el panel no tenía el registro (lote 40,
 * ADR-0032, PBI-0256; confirmado por Sebastián Avila): no se sabe si existe, así que en lugar del formulario
 * avisa del fallo y ofrece «Reintentar». Tiene el mismo aspecto que la tarjeta «ya no existe» de cada registro.
 * `registro` completa el título: «del producto», «de la categoría»…
 */
@Component({
  selector: 'ws-admin-sin-datos',
  imports: [IconoDirective],
  host: { class: 'admin-card mt-7 block max-w-2xl p-6', role: 'alert' },
  template: `
    <p class="font-semibold">No pudimos traer los datos {{ registro() }}</p>
    <p class="mt-2 text-sm text-muted">El panel no respondió. Vuelve a intentarlo en un momento.</p>
    <button
      class="inline-flex min-h-11 gap-2 items-center mt-5 rounded-xl border border-line px-5 py-2.5 text-sm font-semibold"
      type="button"
      (click)="reintentar.emit()"
    >
      <svg wsAdminIcono="actualizar"></svg>
      Reintentar
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SinDatosComponent {
  readonly registro = input.required<string>();
  readonly reintentar = output<void>();
}
