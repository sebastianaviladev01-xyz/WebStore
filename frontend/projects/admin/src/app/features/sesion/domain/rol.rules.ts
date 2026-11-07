/**
 * Roles fijos acordados el 05/11: no se crean ni se editan, solo se asignan a usuarios.
 * Replica la tabla del BFF (backend/src/domain/sesion/rol.rules.mjs) solo para mostrar u ocultar opciones;
 * el BFF vuelve a validar cada operación.
 */
export type Rol = 'superadmin' | 'admin' | 'vendedor';

export type Permiso =
  | 'dashboard.view'
  | 'products.edit'
  | 'products.manage'
  | 'inventory.manage'
  | 'categories.manage'
  | 'brands.manage'
  | 'customers.manage'
  | 'users.manage'
  | 'orders.manage'
  | 'banners.manage'
  | 'content.manage'
  | 'shipping.manage'
  | 'complaints.manage'
  | 'store.reset';

export interface DefinicionRol {
  readonly id: Rol;
  readonly label: string;
  readonly description: string;
  readonly permissions: readonly Permiso[];
}

const ALL: readonly Permiso[] = [
  'dashboard.view',
  'products.edit',
  'products.manage',
  'inventory.manage',
  'categories.manage',
  'brands.manage',
  'customers.manage',
  'users.manage',
  'orders.manage',
  'banners.manage',
  'content.manage',
  'shipping.manage',
  'complaints.manage',
  'store.reset',
];

export const ROLES: readonly DefinicionRol[] = [
  {
    id: 'superadmin',
    label: 'Superadministrador',
    description: 'Acceso total, incluida la gestión de usuarios y roles.',
    permissions: ALL,
  },
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Opera toda la tienda: catálogo, contenido, envíos, pedidos y reclamaciones.',
    permissions: ALL.filter((permission) => permission !== 'users.manage' && permission !== 'store.reset'),
  },
  {
    id: 'vendedor',
    label: 'Vendedor',
    description: 'Mantiene fichas e inventario y actualiza el estado de los pedidos.',
    permissions: ['dashboard.view', 'products.edit', 'inventory.manage', 'orders.manage'],
  },
];

export function definicionDeRol(role: Rol | null | undefined): DefinicionRol | undefined {
  return ROLES.find((definition) => definition.id === role);
}

export function rolPuede(role: Rol | null | undefined, permission: Permiso): boolean {
  return definicionDeRol(role)?.permissions.includes(permission) ?? false;
}
