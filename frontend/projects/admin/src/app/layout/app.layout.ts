import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { SesionFacade } from '../features/sesion/application/sesion.facade';
import { TiendaFacade } from '../features/tienda/application/tienda.facade';
import { Permiso } from '../features/sesion/domain/rol.rules';

interface NavigationItem {
  readonly path: string;
  readonly label: string;
  readonly permission: Permiso;
}

interface NavigationGroup {
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

const NAVIGATION: readonly NavigationGroup[] = [
  {
    label: 'General',
    items: [{ path: '/', label: 'Resumen', permission: 'dashboard.view' }],
  },
  {
    label: 'Catálogo',
    items: [
      { path: '/productos', label: 'Productos', permission: 'products.edit' },
      { path: '/inventario', label: 'Inventario', permission: 'inventory.manage' },
      { path: '/categorias', label: 'Categorías', permission: 'categories.manage' },
      { path: '/marcas', label: 'Marcas', permission: 'brands.manage' },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { path: '/pedidos', label: 'Pedidos', permission: 'orders.manage' },
      { path: '/clientes', label: 'Clientes', permission: 'customers.manage' },
      { path: '/reclamaciones', label: 'Reclamaciones', permission: 'complaints.manage' },
    ],
  },
  {
    label: 'Tienda',
    items: [
      { path: '/banners', label: 'Banners', permission: 'banners.manage' },
      { path: '/contenido', label: 'Contenido', permission: 'content.manage' },
      { path: '/envios', label: 'Tarifas de envío', permission: 'shipping.manage' },
    ],
  },
  {
    label: 'Accesos',
    items: [{ path: '/usuarios', label: 'Usuarios y roles', permission: 'users.manage' }],
  },
];

@Component({
  selector: 'ws-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
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
            @for (group of navigation(); track group.label) {
              <div class="contents lg:grid lg:gap-0.5">
                <p class="mb-1 hidden px-3 text-xs font-medium text-muted lg:block">{{ group.label }}</p>
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
            }
          </nav>
        </div>
      </aside>
      <div class="min-w-0">
        <header class="border-b border-line bg-surface px-5 py-3">
          <div class="admin-container flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-muted">Backoffice de la tienda</p>
            <div class="flex flex-wrap items-center gap-3">
              <div class="text-right leading-tight">
                <strong class="block text-sm font-semibold text-ink">{{ session.user()?.name }}</strong>
                <span class="text-xs text-muted">{{ session.roleLabel() }}</span>
              </div>
              <button
                class="min-h-10 rounded-lg border border-line px-4 text-sm font-medium hover:bg-subtle"
                type="button"
                (click)="admin.load()"
              >
                Actualizar
              </button>
              <button
                class="min-h-10 rounded-lg bg-soft px-4 text-sm font-medium hover:bg-line"
                type="button"
                (click)="logout()"
              >
                Cerrar sesión
              </button>
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

  constructor() {
    void this.admin.load();
  }

  protected async logout(): Promise<void> {
    await this.session.logout();
    await this.router.navigate(['/login']);
  }
}
