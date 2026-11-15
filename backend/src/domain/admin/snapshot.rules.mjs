import { DomainError } from '../comun/domain-error.mjs';
import { can } from '../sesion/rol.rules.mjs';

/** Colección del snapshot → permiso necesario para modificarla. */
export const WRITE_PERMISSIONS = {
  categories: 'categories.manage',
  brands: 'brands.manage',
  customers: 'customers.manage',
  banners: 'banners.manage',
  rates: 'shipping.manage',
  complaints: 'complaints.manage',
  config: 'content.manage',
  users: 'users.manage',
  orders: 'orders.manage',
};

/** Rechaza el guardado si incluye una colección que el rol no puede modificar. */
export function requireWritableCollections(next, role) {
  for (const [key, permission] of Object.entries(WRITE_PERMISSIONS))
    if (next[key] !== undefined && !can(role, permission))
      throw new DomainError('forbidden', 'INSUFFICIENT_ROLE', 'Tu rol no permite realizar esta acción.', {
        collection: key,
      });
}
