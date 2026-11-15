import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Categoria } from '../features/catalogo/domain/categoria.model';
import { ContenidoFacade } from '../features/contenido/application/contenido.facade';

/**
 * Pie de la tienda, separado de `AppLayout` sin cambiar su marcado (PBI-0118). Sin datos de contacto (el contenido
 * no llegó, PBI-0111) no muestra el párrafo de contacto.
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
            @if (content.settings().contactEmail || content.settings().contactPhone) {
              <p class="ws-footer-contact text-sm leading-6">
                @if (content.settings().contactEmail) {
                  <a class="hover:text-footer-heading" [href]="'mailto:' + content.settings().contactEmail">
                    {{ content.settings().contactEmail }}
                  </a>
                  <br />
                }
                {{ content.settings().contactPhone }}
              </p>
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

          <div>
            <h2 class="ws-footer-title">Mi cuenta</h2>
            <div class="ws-footer-links">
              <a routerLink="/cuenta/login">Ingresar</a>
              <a routerLink="/cuenta/perfil">Mi perfil</a>
              <a routerLink="/pedidos">Mis pedidos</a>
              <a routerLink="/cuenta/recuperar">Recuperar acceso</a>
            </div>
          </div>

          <div>
            <h2 class="ws-footer-title">Información</h2>
            <div class="ws-footer-links">
              @if (content.settings().shippingPageEnabled) {
                <a routerLink="/info/envios">Envíos</a>
              }
              @if (content.settings().privacyPageEnabled) {
                <a routerLink="/info/privacidad">Privacidad</a>
              }
              @if (content.settings().termsPageEnabled) {
                <a routerLink="/info/terminos">Términos</a>
              }
            </div>
          </div>

          <div>
            <h2 class="ws-footer-title">Ayuda</h2>
            <div class="ws-footer-links">
              @if (content.settings().contactPageEnabled) {
                <a routerLink="/info/contacto">Contacto</a>
              }
              <a routerLink="/libro-reclamaciones">Libro de reclamaciones</a>
              <a routerLink="/carrito">Carrito</a>
            </div>
          </div>
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
  protected readonly currentYear = new Date().getFullYear();
}
