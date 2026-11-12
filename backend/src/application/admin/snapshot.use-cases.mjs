import { sinColoresDeContenido } from '../../domain/admin/configuracion.rules.mjs';
import { requireWritableCollections, REPLACEABLE_COLLECTIONS } from '../../domain/admin/snapshot.rules.mjs';
import { requireValidAdminUsers } from '../../domain/admin/usuario-admin.rules.mjs';
import { requireValidCategoryTree } from '../../domain/catalogo/categoria.rules.mjs';
import { applyProductContentEdits } from '../../domain/catalogo/producto.rules.mjs';
import { DomainError } from '../../domain/comun/domain-error.mjs';
import { bumpRevision } from '../../domain/comun/revision.rules.mjs';
import { requirePassword } from '../../domain/cuentas/cuenta.rules.mjs';
import { changeOrderStatus } from '../../domain/pedidos/pedido.rules.mjs';
import { can } from '../../domain/sesion/rol.rules.mjs';
import { buildAdminSnapshot } from './admin.views.mjs';

function applyProducts(state, products, role) {
  if (!Array.isArray(products))
    throw new DomainError('validation', 'INVALID_PRODUCTS', 'La colección de productos es obligatoria.');
  if (can(role, 'products.manage')) state.products = products;
  else if (can(role, 'products.edit')) state.products = applyProductContentEdits(state.products, products);
  else throw new DomainError('forbidden', 'INSUFFICIENT_ROLE', 'Tu rol no permite realizar esta acción.');
}

function applyUsers(state, users, actor, security) {
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
  for (const summary of orders) {
    const order = state.orders.find((candidate) => candidate.id === summary.id);
    if (order) state.products = changeOrderStatus(order, summary.status, state.products);
  }
}

function applyAdminChanges(state, next, user, security) {
  requireWritableCollections(next, user.role);
  if (next.products !== undefined) applyProducts(state, next.products, user.role);
  if (next.categories !== undefined) requireValidCategoryTree(next.categories);
  for (const key of REPLACEABLE_COLLECTIONS) if (next[key] !== undefined) state[key] = next[key];
  // Contenido ya no guarda colores (D3): si un Admin anterior los envía, se descartan sin error (AC-22).
  if (next.config !== undefined) state.config = sinColoresDeContenido(next.config);
  if (next.users !== undefined) applyUsers(state, next.users, user, security);
  if (Array.isArray(next.orders)) applyOrderStatuses(state, next.orders);
}

/** Snapshot del Admin: lectura filtrada por rol, guardado parcial con control de revisión y reinicio. */
export function createSnapshotUseCases({ store, security }) {
  function save(user, next) {
    // El Admin envía solo las colecciones que cambió, junto con la revisión sobre la que trabajó.
    if (next.revision !== store.state.revision)
      throw new DomainError(
        'conflict',
        'STALE_SNAPSHOT',
        'Los datos cambiaron desde que los cargaste (por ejemplo, una venta). Recarga e inténtalo nuevamente.',
      );
    applyAdminChanges(store.state, next, user, security);
    bumpRevision(store.state);
    store.save();
    return buildAdminSnapshot(store.state, user.role);
  }

  /**
   * Vuelve a los datos de demostración (con B activo y sin temas propios). Las dos revisiones siguen avanzando
   * para invalidar los snapshots y las listas de temas abiertos.
   */
  function reset(user) {
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
