/**
 * Roles fijos acordados el 05/11: no se crean ni se editan, solo se asignan a usuarios. Replica la tabla del BFF
 * (backend/src/domain/sesion/rol.rules.mjs) solo para mostrar u ocultar opciones; el BFF vuelve a validar cada
 * operación. Permisos de la reunión del 11/11 (lote 07, PBI-0013; confirmados por Daniel el 2026-11-18, con un cambio).
 * Lote 11 (ADR-0021, PBI-0170; confirmado por Sebastián Avila): el vendedor también gestiona Inventario y ve Pedidos
 * (`orders.view`) sin cambiar su estado (`orders.manage`).
 */
export type Rol = 'superadmin' | 'admin' | 'vendedor';

export type Permiso =
  | 'dashboard.view'
  | 'products.edit'
  | 'products.manage'
  | 'products.delete'
  | 'inventory.manage'
  | 'categories.manage'
  | 'brands.manage'
  | 'customers.manage'
  | 'users.manage'
  | 'users.delete'
  | 'orders.view'
  | 'orders.manage'
  | 'banners.manage'
  | 'content.manage'
  | 'shipping.manage'
  | 'complaints.manage'
  | 'store.reset'
  | 'themes.manage';

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
  'products.delete',
  'inventory.manage',
  'categories.manage',
  'brands.manage',
  'customers.manage',
  'users.manage',
  'users.delete',
  'orders.view',
  'orders.manage',
  'banners.manage',
  'content.manage',
  'shipping.manage',
  'complaints.manage',
  'store.reset',
  'themes.manage',
];

/** Permisos exclusivos del superadministrador: configuración de la tienda y eliminar usuarios. */
const SOLO_SUPERADMIN: ReadonlySet<Permiso> = new Set<Permiso>([
  'users.delete',
  'content.manage',
  'store.reset',
  'themes.manage',
]);

export const ROLES: readonly DefinicionRol[] = [
  {
    id: 'superadmin',
    label: 'Superadministrador',
    description: 'Acceso total: configuración de la tienda, temas, contenido y todos los usuarios.',
    permissions: ALL,
  },
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Opera la tienda y gestiona a los vendedores, sin temas ni contenido.',
    permissions: ALL.filter((permission) => !SOLO_SUPERADMIN.has(permission)),
  },
  {
    id: 'vendedor',
    label: 'Vendedor',
    description: 'Crea y modifica productos, gestiona el inventario y ve los pedidos.',
    permissions: ['dashboard.view', 'products.edit', 'products.manage', 'inventory.manage', 'orders.view'],
  },
];

/** Roles de los usuarios que ve y gestiona cada rol con `users.manage` (PBI-0013), como el BFF. */
const ROLES_GESTIONABLES: Partial<Record<Rol, readonly Rol[]>> = {
  superadmin: ['superadmin', 'admin', 'vendedor'],
  admin: ['vendedor'],
};

export function definicionDeRol(role: Rol | null | undefined): DefinicionRol | undefined {
  return ROLES.find((definition) => definition.id === role);
}

export function rolPuede(role: Rol | null | undefined, permission: Permiso): boolean {
  return definicionDeRol(role)?.permissions.includes(permission) ?? false;
}

/** Roles de los usuarios que `role` puede ver, crear y editar en Usuarios; vacío si no gestiona usuarios. */
export function rolesGestionables(role: Rol | null | undefined): readonly Rol[] {
  return role && rolPuede(role, 'users.manage') ? (ROLES_GESTIONABLES[role] ?? []) : [];
}
