import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { type ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { IconoDirective } from '../shared/ui/icono.directive';
import { MENU } from './menu';
import { rutaDeNavegacion } from './ruta-de-navegacion';

/** La ruta activa más profunda: la de la página que se ve, con su título. */
function rutaActiva(raiz: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  let ruta = raiz;
  while (ruta.firstChild) ruta = ruta.firstChild;
  return ruta;
}

/**
 * Ruta de navegación de la barra superior del backoffice (lote 44, ADR-0033, PBI-0271; decidido por Sebastián Avila el
 * 2026-11-26, sin esperar a Daniel), como el SGC: el ícono del módulo, el grupo del menú lateral y la página; en un
 * registro, también su listado como enlace, que conserva los filtros de la URL (`queryParamsHandling: 'preserve'`), como
 * «Regresar». Los nombres salen del menú (`menu.ts`) y del título de la ruta (`rutaDeNavegacion`).
 *
 * En el celular (por debajo de 640 px) solo se ve la página actual: los demás tramos quedan en la lista, ocultos. La
 * página actual se acorta con puntos suspensivos antes que partir la barra.
 */
@Component({
  selector: 'ws-admin-ruta-navegacion',
  imports: [IconoDirective, RouterLink],
  host: { class: 'block' },
  template: `
    <!-- Los tramos son enlaces de texto, no botones: no llevan el ícono de una acción (PBI-0243). -->
    <nav
      aria-label="Ruta de navegación"
      class="flex min-w-0 items-center gap-2 text-sm"
      data-sin-icono="ruta de navegación: enlaces de texto"
    >
      @if (ruta().icono; as icono) {
        <svg [wsAdminIcono]="icono" class="text-muted"></svg>
      }
      <ol class="flex min-w-0 items-center gap-1.5">
        @for (tramo of ruta().tramos; track $index; let primero = $first, ultimo = $last) {
          <li class="min-w-0 items-center gap-1.5" [class]="ultimo ? 'flex' : 'flex max-sm:hidden'">
            @if (!primero) {
              <svg wsAdminIcono="siguiente" class="h-3.5! w-3.5! text-muted max-sm:hidden"></svg>
            }
            @if (tramo.actual) {
              <span class="truncate font-semibold text-ink" aria-current="page">{{ tramo.etiqueta }}</span>
            } @else if (tramo.enlace) {
              <a
                class="whitespace-nowrap font-medium text-link hover:underline"
                [routerLink]="tramo.enlace"
                queryParamsHandling="preserve"
              >
                {{ tramo.etiqueta }}
              </a>
            } @else {
              <span class="whitespace-nowrap text-muted">{{ tramo.etiqueta }}</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RutaNavegacionComponent {
  private readonly router = inject(Router);

  /** La URL y el título de la página activa, al terminar cada navegación. */
  private readonly actual = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      startWith(null),
      map(() => ({
        url: this.router.url,
        titulo: rutaActiva(this.router.routerState.snapshot.root).title,
      })),
    ),
    { requireSync: true },
  );

  protected readonly ruta = computed(() => {
    const { url, titulo } = this.actual();
    return rutaDeNavegacion(url, MENU, titulo);
  });
}
