import { A11yModule } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { CuentaFacade } from '../features/cuenta/application/cuenta.facade';
import { CarritoFacade } from '../features/carrito/application/carrito.facade';
import { CatalogoFacade } from '../features/catalogo/application/catalogo.facade';
import { ContenidoFacade } from '../features/contenido/application/contenido.facade';
import { descendientesDeCategoria } from '../features/catalogo/domain/categoria.rules';
import { VarianteInicio } from '../features/contenido/domain/contenido.model';
import {
  EnlaceNavegacion,
  enlaceDeNavegacion,
  normalizarEtiqueta,
  ordenarPorNavegacion,
} from '../features/contenido/domain/navegacion.rules';
import { MenuCategoriasComponent } from './menu-categorias.component';
import { PieTiendaComponent } from './pie-tienda.component';

@Component({
  selector: 'ws-store-shell',
  imports: [A11yModule, MenuCategoriasComponent, PieTiendaComponent, RouterLink, RouterOutlet],
  template: `
    <div class="min-h-screen bg-store-canvas" [class.ws-shell-previous]="isPrevious()">
      <!-- Con <base href="/">, «#main-content» solo apuntaría a la portada: se mueve el foco (PBI-0109). -->
      <a href="#main-content" class="ws-skip-link" (click)="saltarAlContenido($event)">Saltar al contenido</a>

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
                class="h-12 w-full rounded-full border border-line bg-canvas pl-5 pr-14 text-sm outline-none transition placeholder:text-muted focus:border-link focus:bg-surface focus:ring-4 focus:ring-focus-ring/20"
                placeholder="Buscar productos"
                [value]="searchTerm()"
                (input)="updateSearch($event)"
              />
              <button
                type="submit"
                class="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-primary text-on-primary"
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
                  class="ws-cart-count absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-on-accent"
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
                class="h-11 w-full rounded-full border border-line bg-canvas pl-4 pr-12 text-sm outline-none focus:border-link focus:bg-surface"
                [placeholder]="isPrevious() ? 'Buscar en la tienda' : 'Buscar productos'"
                [value]="searchTerm()"
                (input)="updateSearch($event)"
              />
              <button
                type="submit"
                class="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full text-link"
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
          class="ws-drawer-backdrop fixed inset-0 z-50 bg-scrim backdrop-blur-[2px]"
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
              <span class="grid h-10 w-10 place-items-center rounded-xl bg-primary text-on-primary">
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
              class="mb-3 flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary"
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
                    class="rounded-xl px-3 py-2 text-sm font-semibold text-link"
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

      <main id="main-content" tabindex="-1" class="focus:outline-none"><router-outlet /></main>

      <ws-store-footer [categorias]="topCategories()" />
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
  private readonly document = inject(DOCUMENT);
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

  protected readonly topCategories = computed(() =>
    ordenarPorNavegacion(
      this.catalog.categories().filter((category) => !category.parentId),
      this.content.sideNavigation(),
    ),
  );
  /**
   * Enlaces de "Navegación superior" del CMS. Se omiten los que la cabecera ya ofrece (Inicio = logo,
   * Productos = Todas las categorías, Pedidos = acción de la cabecera), los de páginas desactivadas
   * y los que no tienen una página a la cual llevar (`navegacion.rules.ts`).
   */
  private readonly navigationLinks = computed<readonly EnlaceNavegacion[]>(() =>
    this.content
      .topNavigation()
      .map((label) => enlaceDeNavegacion(label, this.content.settings()))
      .filter((link): link is EnlaceNavegacion => link !== null),
  );
  /** A la derecha de las categorías; la versión anterior conserva su lista original. */
  protected readonly supplementalLinks = computed<readonly EnlaceNavegacion[]>(() =>
    this.isPrevious() ? this.previousSupplementalLinks() : this.navigationLinks(),
  );

  /** Enlaces tal como los mostraba la cabecera anterior (incluido que lo desconocido lleve al inicio). */
  private previousSupplementalLinks(): readonly EnlaceNavegacion[] {
    return this.content
      .topNavigation()
      .filter((label) => !normalizarEtiqueta(label).includes('producto'))
      .filter(
        (label) =>
          !normalizarEtiqueta(label).includes('envio') || this.content.settings().shippingPageEnabled,
      )
      .map((label) => {
        const key = normalizarEtiqueta(label);
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

  /** Lleva el foco al contenido de la página en la que se está, sin navegar (PBI-0109). */
  protected saltarAlContenido(event: Event): void {
    event.preventDefault();
    this.document.getElementById('main-content')?.focus();
  }
}
