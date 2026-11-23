/**
 * Roles fijos del Admin acordados el 05/11: no se crean ni se editan desde el panel, solo se asignan.
 * El BFF es la autoridad; el Admin replica esta tabla únicamente para mostrar u ocultar opciones.
 *
 * Permisos de la reunión del 11/11 (lote 07, ADR-0017, PBI-0013; provisional, por confirmar con Daniel): el
 * superadministrador tiene la configuración de la tienda (temas, contenido y reinicio) y todo lo demás; el
 * administrador opera la tienda, elimina productos y gestiona a los vendedores; el vendedor crea productos y
 * modifica todos sus campos, sin eliminarlos.
 *
 * Lote 11 (ADR-0021, PBI-0170; provisional, por confirmar con Daniel): el vendedor también gestiona Inventario y ve
 * Pedidos (`orders.view`) sin cambiar su estado (`orders.manage`, del administrador y del superadministrador).
 */
export const ADMIN_PERMISSIONS = [
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
const SOLO_SUPERADMIN = new Set(['users.delete', 'content.manage', 'store.reset', 'themes.manage']);

const OPERATION = ADMIN_PERMISSIONS.filter((permission) => !SOLO_SUPERADMIN.has(permission));

export const ADMIN_ROLES = [
  {
    id: 'superadmin',
    label: 'Superadministrador',
    description: 'Acceso total: configuración de la tienda, temas, contenido y todos los usuarios.',
    permissions: ADMIN_PERMISSIONS,
  },
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Opera la tienda y gestiona a los vendedores, sin temas ni contenido.',
    permissions: OPERATION,
  },
  {
    id: 'vendedor',
    label: 'Vendedor',
    description:
      'Crea productos y modifica sus fichas, precios y stock; gestiona el inventario y ve los pedidos.',
    permissions: ['dashboard.view', 'products.edit', 'products.manage', 'inventory.manage', 'orders.view'],
  },
];

/**
 * Roles de los usuarios que ve y gestiona cada rol con `users.manage` (PBI-0013): el superadministrador, todos; el
 * administrador, solo los vendedores (y solo puede asignarles ese rol).
 */
const MANAGED_USER_ROLES = {
  superadmin: ['superadmin', 'admin', 'vendedor'],
  admin: ['vendedor'],
};

/** Roles de los usuarios que puede ver, crear y editar `role`; vacío si no gestiona usuarios. */
export const managedUserRoles = (role) => (can(role, 'users.manage') ? (MANAGED_USER_ROLES[role] ?? []) : []);

/** Roles de versiones anteriores del mock y su equivalente fijo. */
export const LEGACY_ROLES = { owner: 'superadmin', 'catalog-maintainer': 'vendedor' };

const permissionsByRole = new Map(ADMIN_ROLES.map((role) => [role.id, new Set(role.permissions)]));

export const isAdminRole = (role) => permissionsByRole.has(role);

export function can(role, permission) {
  return permissionsByRole.get(role)?.has(permission) ?? false;
}

export const migrateRole = (role) => LEGACY_ROLES[role] ?? role;
