import type { Permiso } from '../features/sesion/domain/rol.rules';

/**
 * Menú lateral del backoffice: sus grupos y sus entradas, en su orden. Es la única fuente de los nombres de los módulos:
 * lo usan el menú lateral (`AppLayout`) y la ruta de navegación de la barra superior (lote 44, PBI-0271). Sin Angular,
 * para que la regla de la ruta se pruebe sin DOM.
 */
export interface EntradaDelMenu {
  readonly path: string;
  readonly label: string;
  readonly permission: Permiso;
}

export type IdDeGrupo = 'general' | 'catalogo' | 'ventas' | 'tienda' | 'accesos';

export interface GrupoDelMenu {
  /** Fijo: forma el id de la región que pliega el grupo (`menu-grupo-<id>`). */
  readonly id: IdDeGrupo;
  readonly label: string;
  readonly items: readonly EntradaDelMenu[];
}

export const MENU: readonly GrupoDelMenu[] = [
  {
    id: 'general',
    label: 'General',
    items: [{ path: '/', label: 'Dashboard', permission: 'dashboard.view' }],
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
      { path: '/pedidos', label: 'Pedidos', permission: 'orders.view' },
      { path: '/clientes', label: 'Clientes', permission: 'customers.manage' },
      {
        path: '/reclamaciones',
        label: 'Reclamaciones',
        permission: 'complaints.manage',
      },
    ],
  },
  {
    id: 'tienda',
    label: 'Tienda',
    items: [
      { path: '/banners', label: 'Banners', permission: 'banners.manage' },
      { path: '/contenido', label: 'Contenido', permission: 'content.manage' },
      // Lote 17 (ADR-0021, PBI-0178 y PBI-0183): configuración de la tienda, del superadministrador como Contenido.
      {
        path: '/entregas',
        label: 'Entregas y feriados',
        permission: 'content.manage',
      },
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
