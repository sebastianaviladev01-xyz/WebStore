import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconoDirective, TituloPaginaDirective } from '../../../shared/ui/icono.directive';

/**
 * Encabezado de una página de registro del backoffice, como los formularios del SGC (lote 44, ADR-0033, PBI-0268;
 * decidido por Sebastián Avila el 2026-11-26, sin esperar a Daniel): el título (`h1` con el ícono del módulo), su
 * descripción y, arriba a la derecha, «Regresar», con borde y una flecha, que vuelve al listado con sus filtros
 * (`queryParamsHandling: 'preserve'`). Sustituye al enlace «Volver a …» que iba encima del título. Va dentro de la
 * tarjeta y fuera del `<form>`: sigue a la vista mientras carga el registro o si ya no existe.
 */
@Component({
  selector: 'ws-admin-encabezado-registro',
  imports: [IconoDirective, RouterLink, TituloPaginaDirective],
  host: { class: 'flex flex-wrap items-start justify-between gap-x-6 gap-y-3' },
  template: `
    <div class="min-w-0">
      <h1 wsAdminTitulo [id]="tituloId()" class="text-2xl font-semibold tracking-tight text-ink">
        {{ titulo() }}
      </h1>
      <p class="mt-1 text-sm text-muted">{{ descripcion() }}</p>
    </div>
    <a
      class="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink hover:bg-subtle"
      [routerLink]="listado()"
      queryParamsHandling="preserve"
    >
      <svg wsAdminIcono="volver"></svg>
      Regresar
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EncabezadoRegistroComponent {
  readonly titulo = input.required<string>();
  /** `id` del `h1`: el `<form>` lo nombra con `aria-labelledby`. */
  readonly tituloId = input.required<string>();
  readonly descripcion = input.required<string>();
  /** Ruta del listado al que vuelve «Regresar» (`/productos`), con los filtros de la URL. */
  readonly listado = input.required<string>();
}
