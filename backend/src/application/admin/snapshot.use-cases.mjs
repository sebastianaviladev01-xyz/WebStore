import {
  applyComplaintUpdates,
  orderStatusChanges,
  requireValidBanners,
  requireValidBrands,
  requireValidCategories,
  requireValidConfig,
  requireValidCustomers,
  requireValidOrderStatuses,
  requireValidProductContent,
  requireValidProducts,
  requireValidRates,
  requireValidUserShapes,
  resolveCollectionChanges,
} from '../../domain/admin/colecciones.rules.mjs';
import { sinColoresDeContenido } from '../../domain/admin/configuracion.rules.mjs';
import { requireWritableCollections } from '../../domain/admin/snapshot.rules.mjs';
import { requireUsersInScope, requireValidAdminUsers } from '../../domain/admin/usuario-admin.rules.mjs';
import {
  requireRemovedWithoutChildren,
  requireUniqueCategorySlugs,
  requireValidCategoryTree,
} from '../../domain/catalogo/categoria.rules.mjs';
import {
  applyProductContentEdits,
  requireNoRemovedProducts,
  requireRemovedNotInUse,
  requireUniqueSlugs,
} from '../../domain/catalogo/producto.rules.mjs';
import { DomainError } from '../../domain/comun/domain-error.mjs';
import { nowIso } from '../../domain/comun/reloj.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { requirePassword } from '../../domain/cuentas/cuenta.rules.mjs';
import { changeOrderStatus } from '../../domain/pedidos/pedido.rules.mjs';
import { can } from '../../domain/sesion/rol.rules.mjs';
import { buildAdminSnapshot } from './admin.views.mjs';

function applyProducts(state, value, role) {
  if (value === null || typeof value !== 'object')
    throw new DomainError('validation', 'INVALID_PRODUCTS', 'La colección de productos es obligatoria.');
  const products = resolveCollectionChanges('products', state.products, value);
  let next;
  if (can(role, 'products.manage')) {
    next = requireValidProducts(products);
    // PBI-0013: el vendedor crea y modifica productos, pero no los elimina.
    if (!can(role, 'products.delete')) requireNoRemovedProducts(state.products, next);
  } else if (can(role, 'products.edit'))
    next = applyProductContentEdits(state.products, requireValidProductContent(products));
  else throw new DomainError('forbidden', 'INSUFFICIENT_ROLE', 'Tu rol no permite realizar esta acción.');
  requireUniqueSlugs(next, state.products);
  state.products = next;
}

function applyUsers(state, value, actor, security) {
  const users = resolveCollectionChanges('users', state.users, value);
  requireValidUserShapes(users);
  // PBI-0013: el administrador solo gestiona a los vendedores y no elimina usuarios.
  requireUsersInScope(state.users, users, actor.role);
  requireValidAdminUsers(users, actor);
  const previousIds = new Set(state.users.map((item) => item.id));
  state.users = users.map(({ temporaryPassword, ...item }) => item);
  state.adminCredentials = state.adminCredentials.filter((credential) =>
    state.users.some((item) => item.id === credential.userId),
  );
  for (const item of users) {
    if (!previousIds.has(item.id)) {
      const password = requirePassword(item.temporaryPassword);
      state.adminCredentials.push({ userId: item.id, ...security.hashPassword(password) });
    }
  }
  // Un usuario eliminado o desactivado pierde sus sesiones abiertas.
  const activeIds = new Set(state.users.filter((item) => item.active).map((item) => item.id));
  state.adminSessions = state.adminSessions.filter((session) => activeIds.has(session.userId));
}

function applyOrderStatuses(state, orders) {
  for (const summary of requireValidOrderStatuses(orderStatusChanges(orders))) {
    const order = state.orders.find((candidate) => candidate.id === summary.id);
    if (order) state.products = changeOrderStatus(order, summary.status, state.products);
  }
}

/**
 * Colecciones que se reemplazan enteras, o que se cambian con `{ upsert, remove }` (lote 06), cada una con la regla
 * que valida su forma y contenido (PBI-0095). Cada regla recibe la lista resultante y la vigente.
 */
const REPLACEABLE = {
  categories: (categories, previous) => {
    requireValidCategories(categories);
    requireRemovedWithoutChildren(categories, previous);
    requireValidCategoryTree(categories);
    requireUniqueCategorySlugs(categories, previous);
    return categories;
  },
  brands: requireValidBrands,
  customers: requireValidCustomers,
  banners: requireValidBanners,
  rates: requireValidRates,
};

/** Aplica los cambios sobre `state`, que es una copia: si algo falla, el estado vigente no se toca (PBI-0089). */
function applyAdminChanges(state, next, user, security) {
  requireWritableCollections(next, user.role);
  const previous = { brands: state.brands, categories: state.categories };
  if (next.products !== undefined) applyProducts(state, next.products, user.role);
  for (const [key, validate] of Object.entries(REPLACEABLE))
    if (next[key] !== undefined)
      state[key] = validate(resolveCollectionChanges(key, state[key], next[key]), state[key]);
  // PBI-0131: después de aplicar los productos del mismo guardado (pudieron cambiar de marca o de categoría).
  requireRemovedNotInUse(state.products, {
    previousBrands: previous.brands,
    nextBrands: state.brands,
    previousCategories: previous.categories,
    nextCategories: state.categories,
  });
  if (next.complaints !== undefined)
    state.complaints = applyComplaintUpdates(
      state.complaints,
      resolveCollectionChanges('complaints', state.complaints, next.complaints),
      nowIso(),
    );
  // Contenido ya no guarda colores (D3): si un Admin anterior los envía, se descartan sin error (AC-22).
  if (next.config !== undefined)
    state.config = requireValidConfig(
      sinColoresDeContenido(next.config),
      sinColoresDeContenido(state.config),
    );
  if (next.users !== undefined) applyUsers(state, next.users, user, security);
  if (next.orders !== undefined) applyOrderStatuses(state, next.orders);
}

/** Snapshot del Admin: lectura filtrada por rol, guardado parcial con control de revisión y reinicio. */
export function createSnapshotUseCases({ store, security, resetEnabled = false }) {
  function save(user, next) {
    // El Admin envía solo las colecciones que cambió, junto con la revisión sobre la que trabajó.
    if (next.revision !== store.state.revision)
      throw new DomainError(
        'conflict',
        'STALE_SNAPSHOT',
        'Los datos cambiaron desde que los cargaste (por ejemplo, una venta). Recarga e inténtalo nuevamente.',
      );
    // Todo se aplica sobre una copia y se confirma solo si todo fue válido (PBI-0089).
    const draft = structuredClone(store.state);
    applyAdminChanges(draft, next, user, security);
    bumpRevision(draft);
    store.state = draft;
    store.save();
    return buildAdminSnapshot(store.state, user.role);
  }

  /**
   * Vuelve a los datos de demostración (con B activo y sin temas propios). Las dos revisiones siguen avanzando
   * para invalidar los snapshots y las listas de temas abiertos. Solo con `resetEnabled` (modo demo o
   * `WEBSTORE_ALLOW_STORE_RESET=true`): en la tienda de un cliente borraría pedidos, cuentas y reclamos (PBI-0090).
   */
  function reset(user) {
    if (!resetEnabled)
      throw new DomainError(
        'forbidden',
        'STORE_RESET_DISABLED',
        'El reinicio de la tienda solo está disponible en el modo demo.',
      );
    const previousRevision = store.state.revision;
    const previousThemesRevision = store.state.appearance.revision;
    store.state = store.initialState();
    store.state.revision = previousRevision + 1;
    store.state.appearance.revision = previousThemesRevision + 1;
    store.save();
    return buildAdminSnapshot(store.state, user.role);
  }

  return {
    get: (user) => buildAdminSnapshot(store.state, user.role),
    save,
    reset,
  };
}
