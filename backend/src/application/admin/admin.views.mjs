import { terminosVigentes } from '../../domain/admin/terminos.rules.mjs';
import { ADMIN_ROLES, can, managedUserRoles } from '../../domain/sesion/rol.rules.mjs';

export const adminUserToPublic = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
});

/** Vista de pedido para el Admin: datos de despacho y líneas, sin el token de acceso del cliente. */
const orderToAdmin = (order) => ({
  id: order.id,
  createdAt: order.createdAt,
  status: order.status,
  customer: order.customer.fullName,
  customerEmail: order.customer.email,
  customerPhone: order.customer.phone,
  district: order.shipping?.district ?? '',
  address: order.shipping?.addressLine ?? '',
  deliveryDate: order.deliveryDate ?? '',
  shippingOrigin: order.shippingOrigin ?? '',
  paymentMethod: order.paymentMethod ?? '',
  // PBI-0145: cuándo aceptó el comprador los términos (lote 04); null en pedidos anteriores a esa casilla.
  termsAcceptedAt: order.termsAcceptedAt ?? null,
  // PBI-0177 (lote 17): la versión de los términos aceptada; null en pedidos anteriores al registro de versiones.
  termsVersion: order.termsVersion ?? null,
  subtotal: order.subtotal ?? order.total,
  shippingCost: order.shippingCost ?? 0,
  total: order.total,
  items: (order.items ?? []).map((item) => ({
    productId: item.productId ?? item.product?.id ?? '',
    name: item.product?.name ?? '',
    quantity: item.quantity,
    unitPrice: item.product?.price ?? 0,
    // Lote 19 (PBI-0006): la dirección propia de la línea, o null si va a la del pedido (los pedidos antiguos).
    shipping: item.shipping ?? null,
  })),
});

/**
 * Cada colección solo viaja al rol que puede gestionarla; catálogo y configuración son lectura común. Los pedidos
 * viajan a quien los ve (`orders.view`, también el vendedor desde el lote 11, PBI-0170); cambiarlos pide
 * `orders.manage`. La actividad reciente (PBI-0028) es del Dashboard completo (`orders.manage`): para el vendedor llega
 * vacía, porque nombra clientes y reclamos que no ve. Desde el lote 13 (ADR-0021, PBI-0172), sin personas en línea.
 */
export function buildAdminSnapshot(state, role) {
  const visible = (permission, value) => (can(role, permission) ? value : []);
  // PBI-0013: cada rol ve solo los usuarios que gestiona (el administrador, los vendedores).
  const gestionables = new Set(managedUserRoles(role));
  return {
    revision: state.revision,
    roles: ADMIN_ROLES,
    products: state.products,
    categories: state.categories,
    brands: state.brands,
    customers: visible('customers.manage', state.customers),
    users: state.users.filter((user) => gestionables.has(user.role)).map(adminUserToPublic),
    banners: visible('banners.manage', state.banners),
    rates: visible('shipping.manage', state.rates),
    complaints: visible('complaints.manage', state.complaints),
    orders: visible('orders.view', state.orders.map(orderToAdmin)),
    // Lote 17 (PBI-0177): con la versión vigente de los términos, que calcula el BFF (no es una clave que se guarde).
    config: { ...state.config, ...terminosVigentes(state.termsVersions) },
    activity: visible('orders.manage', state.activity ?? []),
    // Lote 17 (PBI-0183): el calendario de días no laborables, configuración de la tienda.
    nonWorkingDates: visible('content.manage', state.nonWorkingDates ?? []),
  };
}
