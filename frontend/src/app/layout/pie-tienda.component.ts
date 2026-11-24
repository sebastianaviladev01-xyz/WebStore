import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink, UrlTree } from '@angular/router';

import { Categoria } from '../features/catalogo/domain/categoria.model';
import { ContenidoFacade } from '../features/contenido/application/contenido.facade';
import {
  contactosVisibles,
  enlaceDeTelefono,
  redesVisibles,
} from '../features/contenido/domain/contacto.rules';
import { gruposDelPie } from '../features/contenido/domain/pie.rules';

/**
 * Pie de la tienda, separado de `AppLayout` (PBI-0118). Desde el lote 15 (ADR-0021), las columnas después de
 * «Productos» salen de los «Accesos inferiores» de Contenido (PBI-0185) y el contacto muestra todos los correos y
 * teléfonos, y las redes (PBI-0169). Sin datos de contacto no muestra el párrafo de contacto.
 */
@Component({
  selector: 'ws-store-footer',
  imports: [RouterLink],
  template: `
    <footer class="ws-site-footer">
      <div class="ws-container ws-footer-inner">
        <div class="ws-footer-grid grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr_1fr]">
          <div class="ws-footer-brand">
            <div class="flex items-center gap-3 text-footer-heading">
              @if (content.settings().logoUrl) {
                <span class="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-surface">
                  <img
                    [src]="content.settings().logoUrl"
                    [alt]="content.settings().storeName + ' logo'"
                    class="h-full w-full object-contain p-1"
                  />
                </span>
              } @else {
                <span class="ws-brand-mark h-11 w-11" aria-hidden="true">
                  {{ content.settings().logoText }}
                </span>
              }
              <span class="text-xl font-semibold tracking-[-0.035em]">
                {{ content.settings().storeName }}
              </span>
            </div>
            <p class="max-w-xs text-sm leading-6 text-footer-text">
              {{ content.settings().footerText }}
            </p>
            @if (correos().length || telefonos().length) {
              <p class="ws-footer-contact text-sm leading-6">
                @for (correo of correos(); track correo.value) {
                  <a class="hover:text-footer-heading" [href]="'mailto:' + correo.value">
                    {{ correo.label ? correo.label + ': ' : '' }}{{ correo.value }}
                  </a>
                  <br />
                }
                @for (telefono of telefonos(); track telefono.value; let ultimo = $last) {
                  <a class="hover:text-footer-heading" [href]="enlaceDeTelefono(telefono.value)">
                    {{ telefono.label ? telefono.label + ': ' : '' }}{{ telefono.value }}
                  </a>
                  @if (!ultimo) {
                    <br />
                  }
                }
              </p>
            }
            @if (redes().length) {
              <ul
                class="ws-footer-social mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm"
                aria-label="Redes sociales"
              >
                @for (red of redes(); track red.url) {
                  <li>
                    <a
                      class="hover:text-footer-heading"
                      [href]="red.url"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ red.label }}
                      <span class="sr-only">(se abre en otra pestaña)</span>
                    </a>
                  </li>
                }
              </ul>
            }
          </div>

          <div>
            <h2 class="ws-footer-title">Productos</h2>
            <div class="ws-footer-links">
              @for (category of categorias().slice(0, 4); track category.id) {
                <a routerLink="/catalogo" [queryParams]="{ categoria: category.id }">{{ category.name }}</a>
              }
              <a routerLink="/catalogo">Ver todo</a>
            </div>
          </div>

          @for (grupo of grupos(); track grupo.titulo) {
            <div>
              <h2 class="ws-footer-title">{{ grupo.titulo }}</h2>
              <div class="ws-footer-links">
                @for (enlace of grupo.enlaces; track $index) {
                  @if (enlace.externo) {
                    <a [href]="enlace.url" target="_blank" rel="noopener noreferrer">
                      {{ enlace.label }}
                      <span class="sr-only">(se abre en otra pestaña)</span>
                    </a>
                  } @else {
                    <a [routerLink]="ruta(enlace.url)">{{ enlace.label }}</a>
                  }
                }
              </div>
            </div>
          }
        </div>

        <div
          class="ws-footer-legal flex flex-col gap-3 border-t border-footer-rule pt-6 text-footer-text sm:flex-row sm:items-center sm:justify-between"
        >
          <p>© {{ currentYear }} {{ content.settings().storeName }}. Todos los derechos reservados.</p>
          <p>Tecnología y hogar, a tu alcance.</p>
        </div>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieTiendaComponent {
  /** Categorías principales, en el orden de la cabecera; el pie muestra las cuatro primeras. */
  readonly categorias = input.required<readonly Categoria[]>();
  protected readonly content = inject(ContenidoFacade);
  private readonly router = inject(Router);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly correos = computed(() => contactosVisibles(this.content.settings().contactEmails));
  protected readonly telefonos = computed(() => contactosVisibles(this.content.settings().contactPhones));
  protected readonly redes = computed(() => redesVisibles(this.content.settings().socialLinks));
  /** Columnas de los «Accesos inferiores» (PBI-0185). */
  protected readonly grupos = computed(() =>
    gruposDelPie(this.content.settings().quickLinks, this.content.settings()),
  );
  protected readonly enlaceDeTelefono = enlaceDeTelefono;

  protected ruta(url: string): UrlTree {
    return this.router.parseUrl(url);
  }
}
