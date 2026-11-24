import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  isActive,
  type IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, map } from 'rxjs';

import { NotificacionesFacade } from '../features/notificaciones/application/notificaciones.facade';
import { SesionFacade } from '../features/sesion/application/sesion.facade';
import { TiendaFacade } from '../features/tienda/application/tienda.facade';
import { Permiso } from '../features/sesion/domain/rol.rules';
import { alternarPlegable, FlechaPlegableDirective } from '../shared/ui/plegable.directive';
import { CampanaNotificacionesComponent } from './campana-notificaciones.component';
import { MenuUsuarioComponent } from './menu-usuario.component';

interface NavigationItem {
  readonly path: string;
  readonly label: string;
  readonly permission: Permiso;
  /** Trazos del ícono (SVG de 24 × 24, solo trazo): se ve con la etiqueta y, con el menú reducido, solo él. */
  readonly icon: string;
}

type NavigationGroupId = 'general' | 'catalogo' | 'ventas' | 'tienda' | 'accesos';

interface NavigationGroup {
  /** Fijo: forma el id de la región que pliega el grupo (`menu-grupo-<id>`). */
  readonly id: NavigationGroupId;
  readonly label: string;
  readonly items: readonly NavigationItem[];
}

/**
 * Íconos del menú (lote 07b, PBI-0044): SVG en línea con el mismo trazo que los de la tienda (el camión de «Tarifas
 * de envío» es el de su menú); sin dependencias nuevas ni fuentes de íconos.
 */
const ICONOS = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  productos: 'M3 12V4h8l9 9-8 8zM7.5 7.5h.01',
  inventario: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',
  categorias: 'M3 6h6l2 2h10v11H3z',
  marcas: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  pedidos: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  clientes:
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M21 20a6 6 0 0 0-4-5.6',
  reclamaciones: 'M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h11',
  banners: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01',
  contenido: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  entregas: 'M4 6h16v14H4zM8 3v5M16 3v5M4 10h16M8 14h2M14 14h2M8 17h2',
  temas:
    'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.7-1.4-.7-2.3 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5zM7.5 11h.01M10 7.5h.01M15 7.5h.01',
  envios:
    'M2 7h12v10H2zM14 11h4l4 3v3h-8M6 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM18 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  usuarios:
    'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 17a4 4 0 0 1 8 0',
} as const;

const NAVIGATION: readonly NavigationGroup[] = [
  {
    id: 'general',
    label: 'General',
    items: [{ path: '/', label: 'Dashboard', permission: 'dashboard.view', icon: ICONOS.dashboard }],
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    items: [
      { path: '/productos', label: 'Productos', permission: 'products.edit', icon: ICONOS.productos },
      { path: '/inventario', label: 'Inventario', permission: 'inventory.manage', icon: ICONOS.inventario },
      { path: '/categorias', label: 'Categorías', permission: 'categories.manage', icon: ICONOS.categorias },
      { path: '/marcas', label: 'Marcas', permission: 'brands.manage', icon: ICONOS.marcas },
    ],
  },
  {
    id: 'ventas',
    label: 'Ventas',
    items: [
      { path: '/pedidos', label: 'Pedidos', permission: 'orders.view', icon: ICONOS.pedidos },
      { path: '/clientes', label: 'Clientes', permission: 'customers.manage', icon: ICONOS.clientes },
      {
        path: '/reclamaciones',
        label: 'Reclamaciones',
        permission: 'complaints.manage',
        icon: ICONOS.reclamaciones,
      },
    ],
  },
  {
    id: 'tienda',
    label: 'Tienda',
    items: [
      { path: '/banners', label: 'Banners', permission: 'banners.manage', icon: ICONOS.banners },
      { path: '/contenido', label: 'Contenido', permission: 'content.manage', icon: ICONOS.contenido },
      // Lote 17 (ADR-0021, PBI-0178 y PBI-0183): configuración de la tienda, del superadministrador como Contenido.
      {
        path: '/entregas',
        label: 'Entregas y feriados',
        permission: 'content.manage',
        icon: ICONOS.entregas,
      },
      { path: '/temas', label: 'Temas', permission: 'themes.manage', icon: ICONOS.temas },
      { path: '/envios', label: 'Tarifas de envío', permission: 'shipping.manage', icon: ICONOS.envios },
    ],
  },
  {
    id: 'accesos',
    label: 'Accesos',
    items: [
      { path: '/usuarios', label: 'Usuarios y roles', permission: 'users.manage', icon: ICONOS.usuarios },
    ],
  },
];

/** Escritorio: el menú lateral fijo (con grupos plegables y la opción de reducirlo a íconos). */
const ESCRITORIO = '(min-width: 1024px)';

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
  imports: [
    A11yModule,
    CampanaNotificacionesComponent,
    FlechaPlegableDirective,
    MenuUsuarioComponent,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  template: `
    <ng-template #icono let-trazo>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        class="h-5 w-5 shrink-0 fill-none stroke-current"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path [attr.d]="trazo" />
      </svg>
    </ng-template>

    <ng-template #hamburguesa>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        class="h-5 w-5 fill-none stroke-current"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </ng-template>

    <ng-template #marca let-conTexto>
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary font-semibold text-on-primary"
      >
        W
      </span>
      @if (conTexto) {
        <span class="font-semibold text-ink">WebStore Admin</span>
      }
    </ng-template>

    <!--
      Enlace del menú. Con el menú reducido (escritorio, PBI-0044) solo se ve el ícono: la etiqueta sigue en el nombre
      accesible del enlace y en su «title».
    -->
    <ng-template #enlace let-item let-movil="movil">
      <a
        [routerLink]="item.path"
        routerLinkActive="bg-primary-soft text-on-primary-soft"
        [routerLinkActiveOptions]="{ exact: item.path === '/' }"
        class="flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 font-medium whitespace-nowrap text-body hover:bg-subtle"
        [class.justify-center]="reducido() && !movil"
        [attr.title]="reducido() && !movil ? item.label : null"
        (click)="cerrarMenuMovil()"
      >
        <ng-container *ngTemplateOutlet="icono; context: { $implicit: item.icon }" />
        <span [class.sr-only]="reducido() && !movil">{{ item.label }}</span>
      </a>
    </ng-template>

    <div
      class="min-h-screen lg:grid"
      [class]="reducido() ? 'lg:grid-cols-[76px_minmax(0,1fr)]' : 'lg:grid-cols-[248px_minmax(0,1fr)]'"
    >
      @if (escritorio()) {
        <aside class="min-h-screen border-r border-line bg-surface">
          <div class="sticky top-0 max-h-screen overflow-y-auto py-5" [class]="reducido() ? 'px-3' : 'px-5'">
            <a
              routerLink="/"
              class="flex items-center gap-3"
              [attr.aria-label]="reducido() ? 'WebStore Admin' : null"
            >
              <ng-container *ngTemplateOutlet="marca; context: { $implicit: !reducido() }" />
            </a>
            <nav id="menu-lateral" class="mt-8 grid gap-5 text-sm" aria-label="Administración">
              @for (group of navigation(); track group.id) {
                <div class="grid gap-0.5">
                  @if (reducido()) {
                    <!-- Reducido: todos los íconos a la vista, un grupo tras otro, separados por una línea. -->
                    @if (!$first) {
                      <div class="mx-2 mb-2 border-t border-line" aria-hidden="true"></div>
                    }
                    @for (item of group.items; track item.path) {
                      <ng-container *ngTemplateOutlet="enlace; context: { $implicit: item, movil: false }" />
                    }
                  } @else {
                    <!-- -mt-1 y py-1 dan 24 px de objetivo sin mover el texto ni los enlaces. -->
                    <button
                      type="button"
                      class="-mt-1 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1 text-left text-xs font-medium text-muted hover:text-ink"
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
                      <div class="ws-plegable-contenido grid gap-0.5">
                        @for (item of group.items; track item.path) {
                          <ng-container
                            *ngTemplateOutlet="enlace; context: { $implicit: item, movil: false }"
                          />
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </nav>
          </div>
        </aside>
      } @else {
        <!-- PBI-0044: en el celular y la tableta, el menú se abre en un panel lateral en lugar de la tira horizontal. -->
        <div class="flex items-center gap-3 border-b border-line bg-surface px-5 py-3">
          <button
            type="button"
            class="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
            aria-label="Abrir el menú"
            [attr.aria-expanded]="menuMovil()"
            aria-haspopup="dialog"
            (click)="menuMovil.set(true)"
          >
            <ng-container *ngTemplateOutlet="hamburguesa" />
          </button>
          <a routerLink="/" class="flex items-center gap-3">
            <ng-container *ngTemplateOutlet="marca; context: { $implicit: true }" />
          </a>
        </div>
        @if (menuMovil()) {
          <button
            type="button"
            class="fixed inset-0 z-40 bg-scrim"
            aria-label="Cerrar el menú"
            tabindex="-1"
            (click)="cerrarMenuMovil()"
          ></button>
          <div
            cdkTrapFocus
            [cdkTrapFocusAutoCapture]="true"
            class="fixed inset-y-0 left-0 z-50 w-[min(85vw,300px)] overflow-y-auto bg-surface p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de administración"
            (keydown.escape)="cerrarMenuMovil()"
          >
            <div class="flex items-center justify-between gap-3">
              <a routerLink="/" class="flex items-center gap-3" (click)="cerrarMenuMovil()">
                <ng-container *ngTemplateOutlet="marca; context: { $implicit: true }" />
              </a>
              <button
                type="button"
                class="grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
                aria-label="Cerrar el menú"
                (click)="cerrarMenuMovil()"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  class="h-5 w-5 fill-none stroke-current"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav class="mt-6 grid gap-5 text-sm" aria-label="Administración">
              @for (group of navigation(); track group.id) {
                <div class="grid gap-0.5">
                  <p class="px-3 pb-1 text-xs font-medium text-muted">{{ group.label }}</p>
                  @for (item of group.items; track item.path) {
                    <ng-container *ngTemplateOutlet="enlace; context: { $implicit: item, movil: true }" />
                  }
                </div>
              }
            </nav>
          </div>
        }
      }
      <div class="min-w-0">
        <header class="border-b border-line bg-surface px-5 py-3">
          <div class="admin-container flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              @if (escritorio()) {
                <!--
                  PBI-0044: reduce el menú lateral a íconos, como en OpenCart. Solo en la memoria de la página (STD-08),
                  no en el navegador.
                -->
                <button
                  type="button"
                  class="-ml-2 grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
                  [attr.aria-label]="reducido() ? 'Expandir el menú' : 'Reducir el menú'"
                  [attr.aria-expanded]="!reducido()"
                  aria-controls="menu-lateral"
                  (click)="alternarReducido()"
                >
                  <ng-container *ngTemplateOutlet="hamburguesa" />
                </button>
              }
              <p class="text-sm text-muted">Backoffice de la tienda</p>
            </div>
            <!--
              ml-auto: si la cabecera se parte en dos líneas, el menú de usuario sigue a la derecha. Sin «Actualizar»
              (PBI-0140): cada página consulta sus datos al entrar y el Dashboard tiene su propio botón. La campana
              (PBI-0033) solo está para los roles que reciben avisos (PBI-0173).
            -->
            <div class="ml-auto flex min-w-0 items-center gap-2">
              @if (notificaciones.disponible()) {
                <ws-admin-campana />
              }
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
          @if (admin.desactualizado()) {
            <!-- PBI-0085: sin el aviso, las cifras de la consulta anterior parecerían las de ahora. -->
            <p class="mb-5 rounded-xl bg-warning-soft p-4 text-sm text-warning" role="status">
              No pudimos actualizar los datos de esta página: ves los de la última consulta.
            </p>
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
  protected readonly notificaciones = inject(NotificacionesFacade);
  private readonly router = inject(Router);

  /** Escritorio (desde 1024 px): menú lateral fijo; por debajo, botón de hamburguesa y panel lateral (PBI-0044). */
  protected readonly escritorio = toSignal(
    inject(BreakpointObserver)
      .observe(ESCRITORIO)
      .pipe(map((estado) => estado.matches)),
    { initialValue: typeof matchMedia === 'function' && matchMedia(ESCRITORIO).matches },
  );

  /**
   * Menú reducido a íconos en escritorio (PBI-0044). Vive con el layout: dura mientras se navega y vuelve a empezar
   * al recargar o al volver a iniciar sesión; no se guarda en el navegador (STD-08), como los grupos plegados.
   */
  protected readonly reducido = signal(false);
  /** Panel lateral del celular y la tableta abierto. */
  protected readonly menuMovil = signal(false);

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
    // PBI-0033: la campana se pone al día al entrar y en cada cambio de página, como los datos del panel.
    void this.notificaciones.consultar();
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => void this.notificaciones.consultar());
    // PBI-0160: y también sin cambiar de página, al volver a la pestaña y cada minuto mientras está visible.
    inject(DestroyRef).onDestroy(this.notificaciones.iniciarActualizacion());
    // Al pasar a escritorio con el panel abierto, el panel ya no existe.
    effect(() => {
      if (this.escritorio()) untracked(() => this.menuMovil.set(false));
    });
  }

  protected grupoAbierto(id: NavigationGroupId): boolean {
    return this.gruposAbiertos().has(id);
  }

  protected alternarGrupo(id: NavigationGroupId): void {
    this.gruposAbiertos.update((abiertos) => alternarPlegable(abiertos, id));
  }

  protected alternarReducido(): void {
    this.reducido.update((reducido) => !reducido);
  }

  protected cerrarMenuMovil(): void {
    this.menuMovil.set(false);
  }
}
