/**
 * Roles fijos del Admin acordados el 05/11: no se crean ni se editan desde el panel, solo se asignan.
 * El BFF es la autoridad; el Admin replica esta tabla únicamente para mostrar u ocultar opciones.
 */
export const ADMIN_PERMISSIONS = [
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

const OPERATION = ADMIN_PERMISSIONS.filter(
  (permission) => permission !== 'users.manage' && permission !== 'store.reset',
);

export const ADMIN_ROLES = [
  {
    id: 'superadmin',
    label: 'Superadministrador',
    description: 'Acceso total, incluida la gestión de usuarios y roles.',
    permissions: ADMIN_PERMISSIONS,
  },
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Opera toda la tienda: catálogo, contenido, envíos, pedidos y reclamaciones.',
    permissions: OPERATION,
  },
  {
    id: 'vendedor',
    label: 'Vendedor',
    description: 'Mantiene fichas e inventario y actualiza el estado de los pedidos.',
    permissions: ['dashboard.view', 'products.edit', 'inventory.manage', 'orders.manage'],
  },
];

/** Roles de versiones anteriores del mock y su equivalente fijo. */
export const LEGACY_ROLES = { owner: 'superadmin', 'catalog-maintainer': 'vendedor' };

const permissionsByRole = new Map(ADMIN_ROLES.map((role) => [role.id, new Set(role.permissions)]));

export const isAdminRole = (role) => permissionsByRole.has(role);

export const can = (role, permission) => permissionsByRole.get(role)?.has(permission) ?? false;

export const migrateRole = (role) => LEGACY_ROLES[role] ?? role;
