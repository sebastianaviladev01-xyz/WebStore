import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { CuentaFacade } from '../features/cuenta/application/cuenta.facade';
import { CarritoFacade } from '../features/carrito/application/carrito.facade';
import { CatalogoFacade } from '../features/catalogo/application/catalogo.facade';
import { ContenidoFacade } from '../features/contenido/application/contenido.facade';
import { Categoria } from '../features/catalogo/domain/categoria.model';
import { descendientesDeCategoria } from '../features/catalogo/domain/categoria.rules';
import { VarianteInicio } from '../features/contenido/domain/contenido.model';
import { MenuCategoriasComponent, EnlaceMenu } from './menu-categorias.component';

@Component({
  selector: 'ws-store-shell',
  imports: [A11yModule, MenuCategoriasComponent, RouterLink, RouterOutlet],
  template: `
    <div class="min-h-screen bg-canvas" [class.ws-shell-previous]="isPrevious()">
      <a href="#main-content" class="ws-skip-link">Saltar al contenido</a>

      <div class="ws-utility-bar">
        <div
          class="ws-container flex min-h-9 items-center justify-center text-center text-xs font-medium sm:justify-between"
        >
          <p>{{ content.settings().headerMessage }}</p>
          <div class="hidden items-center gap-5 sm:flex">
            @if (isPrevious()) {
              <a routerLink="/pedidos" class="hover:underline">Seguimiento de pedidos</a>
            }
            @if (content.settings().contactPageEnabled) {
              <a routerLink="/info/contacto" class="hover:underline">Ayuda</a>
            }
          </div>
        </div>
      </div>

      <header class="ws-site-header sticky top-0 z-40 border-b border-line bg-surface">
        <div class="ws-container ws-header-main flex min-h-[76px] items-center gap-2 sm:gap-4">
          <button
            type="button"
            class="ws-icon-button ws-mobile-menu"
            aria-label="Abrir menú de navegación"
            [attr.aria-expanded]="sideOpen()"
            (click)="sideOpen.set(true)"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              class="h-5 w-5 fill-none stroke-current"
              stroke-width="1.8"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <a routerLink="/" class="flex shrink-0 items-center gap-3" aria-label="Ir al inicio">
            @if (content.settings().logoUrl) {
              <span
                class="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <img
                  [src]="content.settings().logoUrl"
                  [alt]="content.settings().storeName + ' logo'"
                  class="h-full w-full object-contain p-1"
                />
              </span>
            } @else {
              <span class="ws-brand-lockup">
                <span class="ws-brand-mark" aria-hidden="true">{{ content.settings().logoText }}</span>
                <span class="ws-header-wordmark">{{ content.settings().storeName }}</span>
              </span>
            }
            @if (content.settings().logoUrl) {
              <span class="hidden text-lg font-semibold sm:block">{{ content.settings().storeName }}</span>
            }
          </a>

          <form
            class="ws-header-search mx-auto hidden min-w-0 max-w-[560px] flex-1 md:block"
            role="search"
            (submit)="submitSearch($event)"
          >
            <label class="relative block">
              <span class="sr-only">Buscar productos</span>
              <input
                type="search"
                class="h-12 w-full rounded-full border border-line bg-canvas pl-5 pr-14 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:bg-surface focus:ring-4 focus:ring-primary/20"
                placeholder="Buscar productos"
                [value]="searchTerm()"
                (input)="updateSearch($event)"
              />
              <button
                type="submit"
                class="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-primary text-white"
                aria-label="Buscar"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  class="h-4 w-4 fill-none stroke-current"
                  stroke-width="2"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>
              </button>
            </label>
          </form>

          <div class="ml-auto flex items-center gap-1 sm:gap-2">
            <a
              [routerLink]="auth.isAuthenticated() ? '/cuenta/perfil' : '/cuenta/login'"
              class="ws-header-action"
              [attr.aria-label]="auth.isAuthenticated() ? 'Mi cuenta' : 'Ingresar'"
              [attr.title]="auth.isAuthenticated() ? 'Mi cuenta' : 'Ingresar'"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                class="h-5 w-5 fill-none stroke-current"
                stroke-width="1.7"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.6-4 3-6 7-6s6.4 2 7 6" />
              </svg>
              <span class="hidden xl:block">{{ auth.isAuthenticated() ? 'Mi cuenta' : 'Ingresar' }}</span>
            </a>
            <a
              routerLink="/pedidos"
              class="ws-header-action ws-orders-action"
              aria-label="Mis pedidos"
              title="Mis pedidos"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                class="h-5 w-5 fill-none stroke-current"
                stroke-width="1.7"
              >
                @if (isPrevious()) {
                  <path d="M5 7h14v13H5zM8 4h8v3H8z" />
                  <path d="M8 11h8M8 15h5" />
                } @else {
                  <path d="M4 8l8-4 8 4v9l-8 4-8-4V8Z" />
                  <path d="M4 8l8 4 8-4M12 12v9" />
                }
              </svg>
              <span class="hidden xl:block">Pedidos</span>
            </a>
            <a routerLink="/carrito" class="ws-header-action relative" aria-label="Carrito" title="Carrito">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                class="h-5 w-5 fill-none stroke-current"
                stroke-width="1.7"
              >
                <path d="M3 5h2l2 10h10l2-7H6" />
                <circle cx="9" cy="19" r="1" />
                <circle cx="17" cy="19" r="1" />
              </svg>
              <span class="hidden xl:block">Carrito</span>
              @if (cart.itemCount() > 0) {
                <span
                  class="ws-cart-count absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white"
                >
                  {{ cart.itemCount() }}
                </span>
              }
            </a>
          </div>
        </div>

        <div class="ws-container pb-3 md:hidden">
          <form role="search" (submit)="submitSearch($event)">
            <label class="relative block">
              <span class="sr-only">Buscar productos</span>
              <input
                type="search"
                class="h-11 w-full rounded-full border border-line bg-canvas pl-4 pr-12 text-sm outline-none focus:border-primary focus:bg-surface"
                [placeholder]="isPrevious() ? 'Buscar en la tienda' : 'Buscar productos'"
                [value]="searchTerm()"
                (input)="updateSearch($event)"
              />
              <button
                type="submit"
                class="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full text-primary"
                aria-label="Buscar"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  class="h-5 w-5 fill-none stroke-current"
                  stroke-width="1.7"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>
              </button>
            </label>
          </form>
        </div>

        <div class="ws-header-nav-row" [class.border-t]="isPrevious()" [class.border-line]="isPrevious()">
          <ws-category-mega-menu
            [categories]="catalog.categories()"
            [supplementalLinks]="supplementalLinks()"
            [allLabel]="isPrevious() ? 'Tienda online' : 'Todas las categorías'"
          />
        </div>
      </header>

      @if (sideOpen()) {
        <button
          type="button"
          class="ws-drawer-backdrop fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
          aria-label="Cerrar menú"
          (click)="sideOpen.set(false)"
        ></button>
        <aside
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          class="ws-drawer fixed inset-y-0 left-0 z-[60] w-[min(91vw,390px)] overflow-y-auto bg-surface p-5 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          (keydown.escape)="sideOpen.set(false)"
        >
          <div class="flex items-center justify-between gap-4 border-b border-line pb-5">
            <a routerLink="/" class="flex items-center gap-3 font-semibold" (click)="sideOpen.set(false)">
              <span class="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
                {{ content.settings().logoText }}
              </span>
              {{ content.settings().storeName }}
            </a>
            <button
              type="button"
              class="ws-icon-button"
              aria-label="Cerrar menú"
              (click)="sideOpen.set(false)"
            >
              ×
            </button>
          </div>

          <nav class="mt-5" aria-label="Navegación móvil">
            <a
              routerLink="/catalogo"
              class="mb-3 flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white"
              (click)="sideOpen.set(false)"
            >
              Ver todos los productos
            </a>
            @for (category of topCategories(); track category.id) {
              <details class="group border-b border-line">
                <summary
                  class="flex min-h-14 cursor-pointer list-none items-center justify-between py-3 font-semibold"
                >
                  {{ category.name }}
                  <span class="text-xl font-normal transition group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div class="grid gap-1 pb-4 pl-3">
                  <a
                    routerLink="/catalogo"
                    [queryParams]="{ categoria: category.id }"
                    class="rounded-xl px-3 py-2 text-sm font-semibold text-primary"
                    (click)="sideOpen.set(false)"
                  >
                    Ver toda la categoría
                  </a>
                  @for (entry of descendantsFor(category.id); track entry.category.id) {
                    <a
                      routerLink="/catalogo"
                      [queryParams]="{ categoria: entry.category.id }"
                      [style.padding-left.px]="12 + entry.depth * 14"
                      class="rounded-xl px-3 py-2 text-sm text-muted hover:bg-soft"
                      (click)="sideOpen.set(false)"
                    >
                      {{ entry.category.name }}
                    </a>
                  }
                </div>
              </details>
            }
            <div class="mt-5 grid gap-1">
              <a
                routerLink="/pedidos"
                class="rounded-xl px-3 py-3 text-sm font-semibold"
                (click)="sideOpen.set(false)"
              >
                Mis pedidos
              </a>
              <a
                [routerLink]="auth.isAuthenticated() ? '/cuenta/perfil' : '/cuenta/login'"
                class="rounded-xl px-3 py-3 text-sm font-semibold"
                (click)="sideOpen.set(false)"
              >
                Mi cuenta
              </a>
              @if (content.settings().contactPageEnabled) {
                <a
                  routerLink="/info/contacto"
                  class="rounded-xl px-3 py-3 text-sm font-semibold"
                  (click)="sideOpen.set(false)"
                >
                  Contacto
                </a>
              }
            </div>
          </nav>
        </aside>
      }

      <main id="main-content"><router-outlet /></main>

      <footer class="ws-site-footer">
        <div class="ws-container ws-footer-inner">
          <div class="ws-footer-grid grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr_1fr]">
            <div class="ws-footer-brand">
              <div class="flex items-center gap-3 text-white">
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
              <p class="ws-footer-contact text-sm leading-6">
                <a class="hover:text-white" [href]="'mailto:' + content.settings().contactEmail">
                  {{ content.settings().contactEmail }}
                </a>
                <br />
                {{ content.settings().contactPhone }}
              </p>
            </div>

            <div>
              <h2 class="ws-footer-title">Productos</h2>
              <div class="ws-footer-links">
                @for (category of topCategories().slice(0, 4); track category.id) {
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
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  protected readonly cart = inject(CarritoFacade);
  protected readonly auth = inject(CuentaFacade);
  protected readonly content = inject(ContenidoFacade);
  protected readonly catalog = inject(CatalogoFacade);
  private readonly router = inject(Router);
  protected readonly sideOpen = signal(false);
  /** /inicio-anterior conserva la cabecera previa para comparar; el resto de la tienda usa la actual. */
  private readonly variant = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.variantOf(this.router.routerState.snapshot.root)),
    ),
    { initialValue: this.variantOf(this.router.routerState.snapshot.root) },
  );
  protected readonly isPrevious = computed(() => this.variant() === 'anterior');
  protected readonly searchTerm = signal('');
  protected readonly currentYear = new Date().getFullYear();

  protected readonly topCategories = computed(() =>
    this.sortCategories(this.catalog.categories().filter((category) => !category.parentId)),
  );
  /**
   * Enlaces de "Navegación superior" del CMS. Se omiten los que la cabecera ya ofrece (Inicio = logo,
   * Productos = Todas las categorías, Pedidos = acción de la cabecera), los de páginas desactivadas
   * y los que no tienen una página a la cual llevar.
   */
  private readonly navigationLinks = computed<readonly EnlaceMenu[]>(() =>
    this.content
      .topNavigation()
      .map((label): EnlaceMenu | null => {
        const route = this.routeFor(label);
        if (route === null) return null;
        return this.normalize(label).includes('envio') ? { label, route, icon: 'truck' } : { label, route };
      })
      .filter((link): link is EnlaceMenu => link !== null),
  );
  /** A la derecha de las categorías; la versión anterior conserva su lista original. */
  protected readonly supplementalLinks = computed<readonly EnlaceMenu[]>(() =>
    this.isPrevious() ? this.previousSupplementalLinks() : this.navigationLinks(),
  );

  /** Enlaces tal como los mostraba la cabecera anterior (incluido que lo desconocido lleve al inicio). */
  private previousSupplementalLinks(): readonly EnlaceMenu[] {
    return this.content
      .topNavigation()
      .filter((label) => !this.normalize(label).includes('producto'))
      .filter(
        (label) => !this.normalize(label).includes('envio') || this.content.settings().shippingPageEnabled,
      )
      .map((label) => {
        const key = this.normalize(label);
        if (key.includes('pedido')) return { label, route: '/pedidos' };
        if (key.includes('envio')) return { label, route: '/info/envios' };
        return { label, route: '/' };
      });
  }

  private variantOf(route: ActivatedRouteSnapshot): VarianteInicio {
    let current = route;
    while (current.firstChild) current = current.firstChild;
    return current.data['variant'] === 'anterior' ? 'anterior' : 'actual';
  }

  protected descendantsFor(parentId: string) {
    return descendientesDeCategoria(this.catalog.categories(), parentId);
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected submitSearch(event: Event): void {
    event.preventDefault();
    const buscar = this.searchTerm().trim();
    void this.router.navigate(['/catalogo'], { queryParams: buscar ? { buscar } : {} });
    this.sideOpen.set(false);
  }

  private routeFor(label: string): string | null {
    const key = this.normalize(label);
    const settings = this.content.settings();
    if (key.includes('envio')) return settings.shippingPageEnabled ? '/info/envios' : null;
    if (key.includes('contacto') || key.includes('ayuda'))
      return settings.contactPageEnabled ? '/info/contacto' : null;
    if (key.includes('privacidad')) return settings.privacyPageEnabled ? '/info/privacidad' : null;
    if (key.includes('termino')) return settings.termsPageEnabled ? '/info/terminos' : null;
    if (key.includes('reclamacion')) return '/libro-reclamaciones';
    if (key.includes('cuenta')) return '/cuenta/login';
    return null;
  }

  private sortCategories(items: readonly Categoria[]): readonly Categoria[] {
    const preferred = this.content.sideNavigation().map((label) => this.normalize(label));
    return [...items].sort((a, b) => {
      const ai = preferred.indexOf(this.normalize(a.name));
      const bi = preferred.indexOf(this.normalize(b.name));
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return (
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name, 'es')
      );
    });
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('es-PE');
  }
}
