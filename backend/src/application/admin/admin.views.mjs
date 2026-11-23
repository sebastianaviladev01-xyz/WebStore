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
  subtotal: order.subtotal ?? order.total,
  shippingCost: order.shippingCost ?? 0,
  total: order.total,
  items: (order.items ?? []).map((item) => ({
    productId: item.productId ?? item.product?.id ?? '',
    name: item.product?.name ?? '',
    quantity: item.quantity,
    unitPrice: item.product?.price ?? 0,
  })),
});

/**
 * Cada colección solo viaja al rol que puede gestionarla; catálogo y configuración son lectura común. Los pedidos
 * viajan a quien los ve (`orders.view`, también el vendedor desde el lote 11, PBI-0170); cambiarlos pide
 * `orders.manage`. La actividad reciente (PBI-0028) y las personas en línea (PBI-0027) son del Resumen completo
 * (`orders.manage`): para el vendedor llegan vacías (`[]` y `null`), porque nombran clientes y reclamos que no ve.
 */
export function buildAdminSnapshot(state, role, personasEnLinea = () => 0) {
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
    config: state.config,
    activity: visible('orders.manage', state.activity ?? []),
    onlineVisitors: can(role, 'orders.manage') ? personasEnLinea() : null,
  };
}
