import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  linkedSignal,
  untracked,
} from '@angular/core';
import {
  isActive,
  type IsActiveMatchOptions,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { SesionFacade } from '../features/sesion/application/sesion.facade';
import { TiendaFacade } from '../features/tienda/application/tienda.facade';
import { Permiso } from '../features/sesion/domain/rol.rules';
import { alternarPlegable, FlechaPlegableDirective } from '../shared/ui/plegable.directive';
import { MenuUsuarioComponent } from './menu-usuario.component';

interface NavigationItem {
  readonly path: string;
  readonly label: string;
  readonly permission: Permiso;
}

type NavigationGroupId = 'general' | 'catalogo' | 'ventas' | 'tienda' | 'accesos';

interface NavigationGroup {
  /** Fijo: forma el id de la región que pliega el grupo (`menu-grupo-<id>`). */
  readonly id: NavigationGroupId;
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

const NAVIGATION: readonly NavigationGroup[] = [
  {
    id: 'general',
    label: 'General',
    items: [{ path: '/', label: 'Resumen', permission: 'dashboard.view' }],
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    items: [
      { path: '/productos', label: 'Productos', permission: 'products.edit' },
      { path: '/inventario', label: 'Inventario', permission: 'inventory.manage' },
      { path: '/categorias', label: 'Categorías', permission: 'categories.manage' },
      { path: '/marcas', label: 'Marcas', permission: 'brands.manage' },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas',
    items: [
      { path: '/pedidos', label: 'Pedidos', permission: 'orders.manage' },
      { path: '/clientes', label: 'Clientes', permission: 'customers.manage' },
      { path: '/reclamaciones', label: 'Reclamaciones', permission: 'complaints.manage' },
    ],
  },
  {
    id: 'tienda',
    label: 'Tienda',
    items: [
      { path: '/banners', label: 'Banners', permission: 'banners.manage' },
      { path: '/contenido', label: 'Contenido', permission: 'content.manage' },
      { path: '/temas', label: 'Temas', permission: 'themes.manage' },
      { path: '/envios', label: 'Tarifas de envío', permission: 'shipping.manage' },
    ],
  },
  {
    id: 'accesos',
    label: 'Accesos',
    items: [{ path: '/usuarios', label: 'Usuarios y roles', permission: 'users.manage' }],
  },
];

/** Las mismas reglas con que `routerLinkActive` marca el enlace: `/` exacto, el resto por prefijo. */
function opcionesDePaginaActual(path: string): IsActiveMatchOptions {
  return {
    paths: path === '/' ? 'exact' : 'subset',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
}

@Component({
  selector: 'ws-admin-shell',
  imports: [FlechaPlegableDirective, MenuUsuarioComponent, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside class="border-b border-line bg-surface lg:min-h-screen lg:border-r lg:border-b-0">
        <div class="px-5 pt-5 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto lg:pb-5">
          <a routerLink="/" class="flex items-center gap-3">
            <span class="grid h-9 w-9 place-items-center rounded-lg bg-primary font-semibold text-on-primary">
              W
            </span>
            <span class="font-semibold text-ink">WebStore Admin</span>
          </a>
          <nav
            class="-mx-5 mt-4 flex gap-1 overflow-x-auto px-5 pb-3 text-sm lg:mx-0 lg:mt-8 lg:grid lg:gap-5 lg:overflow-visible lg:px-0"
            aria-label="Administración"
          >
            @for (group of navigation(); track group.id) {
              <div class="contents lg:grid lg:gap-0.5">
                <!-- Solo en escritorio (D3). -mt-1 y py-1 dan 24 px de objetivo sin mover el texto ni los enlaces. -->
                <button
                  type="button"
                  class="-mt-1 hidden w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1 text-left text-xs font-medium text-muted hover:text-ink lg:flex"
                  [attr.aria-expanded]="grupoAbierto(group.id)"
                  [attr.aria-controls]="'menu-grupo-' + group.id"
                  (click)="alternarGrupo(group.id)"
                >
                  {{ group.label }}
                  <svg wsAdminFlecha class="ws-plegable-indicador h-3.5 w-3.5"></svg>
                </button>
                <div
                  class="ws-plegable ws-plegable-lg"
                  [id]="'menu-grupo-' + group.id"
                  [attr.data-plegado]="grupoAbierto(group.id) ? null : ''"
                >
                  <div class="ws-plegable-contenido lg:grid lg:gap-0.5">
                    @for (item of group.items; track item.path) {
                      <a
                        [routerLink]="item.path"
                        routerLinkActive="bg-primary-soft text-on-primary-soft"
                        [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                        class="flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-lg px-3 font-medium text-body hover:bg-subtle"
                      >
                        {{ item.label }}
                      </a>
                    }
                  </div>
                </div>
              </div>
            }
          </nav>
        </div>
      </aside>
      <div class="min-w-0">
        <header class="border-b border-line bg-surface px-5 py-3">
          <div class="admin-container flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-muted">Backoffice de la tienda</p>
            <!--
              ml-auto: si la cabecera se parte en dos líneas, el menú de usuario sigue a la derecha. Sin «Actualizar»
              (PBI-0140): cada página consulta sus datos al entrar y el Resumen tiene su propio botón.
            -->
            <div class="ml-auto flex min-w-0 items-center gap-3">
              <ws-admin-menu-usuario />
            </div>
          </div>
        </header>
        <main class="admin-container py-7">
          @if (admin.error()) {
            <div
              class="mb-5 rounded-xl border border-danger-line bg-danger-soft p-4 text-sm text-danger"
              role="alert"
            >
              {{ admin.error() }}
            </div>
          }
          @if (admin.loading() && !admin.snapshot()) {
            <div class="admin-card p-8 text-center text-muted" role="status">Cargando operación…</div>
          } @else {
            <router-outlet />
          }
        </main>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  protected readonly session = inject(SesionFacade);
  protected readonly admin = inject(TiendaFacade);
  private readonly router = inject(Router);

  /** Solo se listan los módulos que el rol puede abrir; los grupos vacíos desaparecen. */
  protected readonly navigation = computed(() =>
    NAVIGATION.map((group) => ({
      ...group,
      items: group.items.filter((item) => this.session.can(item.permission)),
    })).filter((group) => group.items.length > 0),
  );

  /** Cada enlace del menú con su grupo y si es la página actual, según el router. */
  private readonly enlaces = NAVIGATION.flatMap((group) =>
    group.items.map((item) => ({
      path: item.path,
      grupo: group.id,
      activo: isActive(item.path, this.router, opcionesDePaginaActual(item.path)),
    })),
  );

  /** `path` del enlace de la página actual, o `null` fuera del menú (por ejemplo, en `/perfil`). */
  private readonly paginaActual = computed(
    () => this.enlaces.find((enlace) => enlace.activo())?.path ?? null,
  );

  /**
   * Grupos desplegados (D2). Empieza solo con el grupo de la página de entrada; al cambiar de página
   * conserva los que había y despliega el de la nueva. Vive con el layout: al recargar o al volver a
   * iniciar sesión vuelve a empezar, y no se guarda en el navegador (D4, STD-08).
   */
  protected readonly gruposAbiertos = linkedSignal<string | null, ReadonlySet<NavigationGroupId>>({
    source: this.paginaActual,
    computation: (pagina, anterior) => {
      const abiertos = new Set(anterior?.value);
      const grupo = this.enlaces.find((enlace) => enlace.path === pagina)?.grupo;
      if (grupo) abiertos.add(grupo);
      return abiertos;
    },
  });

  constructor() {
    // PBI-0124: si la sesión vence o se cierra a mitad de una operación, se vuelve al acceso, que dice por qué.
    effect(() => {
      if (!this.session.isAuthenticated())
        untracked(() => {
          // PBI-0151: si venció, el acceso lleva de vuelta a esta página tras ingresar.
          this.session.anotarRutaVencida(this.router.url);
          void this.router.navigate(['/login']);
        });
    });
  }

  protected grupoAbierto(id: NavigationGroupId): boolean {
    return this.gruposAbiertos().has(id);
  }

  protected alternarGrupo(id: NavigationGroupId): void {
    this.gruposAbiertos.update((abiertos) => alternarPlegable(abiertos, id));
  }
}
