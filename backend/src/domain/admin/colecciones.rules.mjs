import { DomainError } from '../comun/domain-error.mjs';
import { ORDER_STATUSES } from '../pedidos/pedido.rules.mjs';
import { COMPLAINT_STATUSES } from '../reclamos/reclamo.rules.mjs';

/**
 * Forma y contenido de las colecciones que guarda el Admin (PBI-0095). Cada regla recibe lo que llegó en el
 * `PUT /admin/snapshot` y lanza `400 INVALID_COLLECTION` con `details: { collection, field, id }` ante el primer
 * dato que no sirve, antes de aplicar nada. El mensaje dice qué revisar: el Admin lo muestra tal cual.
 */

const ETIQUETAS = {
  products: 'los productos',
  categories: 'las categorías',
  brands: 'las marcas',
  customers: 'los clientes',
  banners: 'los banners',
  rates: 'las tarifas de envío',
  config: 'el contenido de la tienda',
  users: 'los usuarios',
  orders: 'los pedidos',
  complaints: 'las reclamaciones',
};

function invalid(collection, field, detalle, id = undefined) {
  return new DomainError('validation', 'INVALID_COLLECTION', `Revisa ${ETIQUETAS[collection]}: ${detalle}.`, {
    collection,
    field,
    ...(id !== undefined ? { id } : {}),
  });
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string';
const hasText = (value) => isText(value) && value.trim().length > 0;

/** Lista de objetos con `id` de texto, no vacío y sin repetir. */
function requireItems(items, collection) {
  if (!Array.isArray(items)) throw invalid(collection, null, 'la lista no es válida');
  const ids = new Set();
  for (const item of items) {
    if (!isObject(item)) throw invalid(collection, null, 'hay un elemento que no es válido');
    if (!hasText(item.id)) throw invalid(collection, 'id', 'hay un elemento sin identificador');
    if (ids.has(item.id))
      throw invalid(collection, 'id', `el identificador ${item.id} está repetido`, item.id);
    ids.add(item.id);
  }
  return items;
}

/** Comprobaciones de un campo: `[campo, regla, detalle]`. Un campo opcional ausente (`undefined`) se acepta. */
function check(collection, item, rules) {
  for (const [field, valid, detalle, { optional = false } = {}] of rules) {
    const value = item[field];
    if (optional && value === undefined) continue;
    if (!valid(value)) throw invalid(collection, field, detalle, item.id);
  }
}

const nonNegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const nonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const isBoolean = (value) => typeof value === 'boolean';
const textList = (value) => Array.isArray(value) && value.every(isText);
const oneOf = (values) => (value) => values.includes(value);
const optionalText = (value) => value === undefined || value === null || isText(value);

/** Productos completos (rol con `products.manage`): SKU único, precio y stock válidos. */
export function requireValidProducts(products) {
  requireItems(products, 'products');
  const skus = new Set();
  for (const product of products) {
    check('products', product, [
      ['name', hasText, 'cada producto necesita un nombre'],
      ['sku', hasText, 'cada producto necesita un SKU'],
      ['price', nonNegative, 'el precio debe ser un número mayor o igual a 0'],
      ['stock', nonNegativeInteger, 'el stock debe ser un número entero mayor o igual a 0'],
      ['active', isBoolean, 'el estado del producto no es válido'],
      ['categoryId', hasText, 'cada producto necesita una categoría'],
      ['brandId', hasText, 'cada producto necesita una marca'],
      ['description', isText, 'la descripción no es válida', { optional: true }],
      ['imageUrl', isText, 'la imagen no es válida', { optional: true }],
      ['thumbnailUrl', optionalText, 'la miniatura no es válida'],
      ['highlights', textList, 'las características no son válidas', { optional: true }],
      ['gallery', textList, 'la galería no es válida', { optional: true }],
    ]);
    const sku = product.sku.trim().toLowerCase();
    if (skus.has(sku)) throw invalid('products', 'sku', `el SKU ${product.sku} está repetido`, product.id);
    skus.add(sku);
  }
  return products;
}

/** Ficha que puede mantener el Vendedor: nombre, textos, imágenes y stock. */
export function requireValidProductContent(products) {
  requireItems(products, 'products');
  for (const product of products)
    check('products', product, [
      ['name', hasText, 'cada producto necesita un nombre'],
      ['stock', nonNegativeInteger, 'el stock debe ser un número entero mayor o igual a 0'],
      ['description', isText, 'la descripción no es válida', { optional: true }],
      ['imageUrl', isText, 'la imagen no es válida', { optional: true }],
      ['thumbnailUrl', optionalText, 'la miniatura no es válida'],
      ['highlights', textList, 'las características no son válidas', { optional: true }],
      ['gallery', textList, 'la galería no es válida', { optional: true }],
    ]);
  return products;
}

export function requireValidCategories(categories) {
  requireItems(categories, 'categories');
  for (const category of categories)
    check('categories', category, [
      ['name', hasText, 'cada categoría necesita un nombre'],
      ['parentId', optionalText, 'la categoría padre no es válida'],
      ['order', (v) => v === undefined || v === null || Number.isFinite(v), 'el orden no es válido'],
    ]);
  return categories;
}

export function requireValidBrands(brands) {
  requireItems(brands, 'brands');
  for (const brand of brands)
    check('brands', brand, [
      ['name', hasText, 'cada marca necesita un nombre'],
      ['active', isBoolean, 'el estado de la marca no es válido'],
    ]);
  return brands;
}

export function requireValidCustomers(customers) {
  requireItems(customers, 'customers');
  for (const customer of customers)
    check('customers', customer, [
      ['name', hasText, 'cada cliente necesita un nombre'],
      ['email', hasText, 'cada cliente necesita un correo'],
      ['document', isText, 'el documento no es válido', { optional: true }],
      ['orders', nonNegativeInteger, 'la cantidad de pedidos no es válida', { optional: true }],
    ]);
  return customers;
}

export const BANNER_PLACEMENTS = ['hero', 'promotion', 'secondary'];

export function requireValidBanners(banners) {
  requireItems(banners, 'banners');
  const textos = [
    'eyebrow',
    'description',
    'cta',
    'ctaUrl',
    'imageUrl',
    'mobileImageUrl',
    'startAt',
    'endAt',
  ];
  for (const banner of banners)
    check('banners', banner, [
      ['title', isText, 'el título no es válido'],
      ['placement', oneOf(BANNER_PLACEMENTS), 'la ubicación del banner no es válida'],
      ['active', isBoolean, 'el estado del banner no es válido'],
      ['imageFit', oneOf(['cover', 'contain']), 'el ajuste de la imagen no es válido', { optional: true }],
      ['imageTone', oneOf(['light', 'dark']), 'el tono de la imagen no es válido', { optional: true }],
      [
        'imageFocusY',
        (v) => v === null || Number.isFinite(v),
        'el foco de la imagen no es válido',
        { optional: true },
      ],
      ...textos.map((field) => [
        field,
        isText,
        'hay un texto del banner que no es válido',
        { optional: true },
      ]),
    ]);
  return banners;
}

export function requireValidRates(rates) {
  requireItems(rates, 'rates');
  for (const rate of rates)
    check('rates', rate, [
      ['origin', hasText, 'cada tarifa necesita un origen'],
      ['destination', hasText, 'cada tarifa necesita un destino'],
      ['price', nonNegative, 'el precio debe ser un número mayor o igual a 0'],
    ]);
  return rates;
}

/**
 * Contenido de la tienda: un objeto con las claves conocidas (las de `current`), cada una de su tipo, y un nombre
 * de tienda. Las claves desconocidas se descartan; las que no llegan conservan el valor vigente.
 */
export function requireValidConfig(config, current) {
  if (!isObject(config)) throw invalid('config', null, 'la configuración no es válida');
  const result = { ...current };
  for (const [key, value] of Object.entries(config)) {
    if (!(key in current)) continue;
    const expected = typeof current[key];
    if (typeof value !== expected) throw invalid('config', key, 'hay un campo con un valor que no es válido');
    result[key] = value;
  }
  if (!hasText(result.storeName)) throw invalid('config', 'storeName', 'la tienda necesita un nombre');
  return result;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Forma de cada usuario del Admin; los roles y el último superadministrador los valida `usuario-admin.rules`. */
export function requireValidUserShapes(users) {
  requireItems(users, 'users');
  const emails = new Set();
  for (const user of users) {
    check('users', user, [
      ['name', hasText, 'cada usuario necesita un nombre'],
      ['email', (v) => isText(v) && EMAIL.test(v.trim()), 'cada usuario necesita un correo válido'],
      ['active', isBoolean, 'el estado del usuario no es válido'],
      ['temporaryPassword', isText, 'la contraseña temporal no es válida', { optional: true }],
    ]);
    const email = user.email.trim().toLowerCase();
    if (emails.has(email)) throw invalid('users', 'email', `el correo ${user.email} está repetido`, user.id);
    emails.add(email);
  }
  return users;
}

/** Cambios de estado de pedidos: solo los cinco estados conocidos. */
export function requireValidOrderStatuses(orders) {
  requireItems(orders, 'orders');
  for (const order of orders)
    check('orders', order, [['status', oneOf(ORDER_STATUSES), 'el estado del pedido no es válido']]);
  return orders;
}

/**
 * Reclamos: el Admin solo responde y cambia el estado. La lista debe tener los mismos reclamos que el BFF (no se
 * crean ni se borran desde el panel: `409 COMPLAINTS_READ_ONLY`); de cada uno se toman solo `status` y
 * `providerResponse`, y el resto (monto, detalle, datos de quien reclama) se conserva del servidor. Devuelve la
 * lista resultante; `now` es el instante de la actualización.
 */
export function applyComplaintUpdates(current, incoming, now) {
  requireItems(incoming, 'complaints');
  const incomingIds = new Set(incoming.map((item) => item.id));
  if (incomingIds.size !== current.length || current.some((item) => !incomingIds.has(item.id)))
    throw new DomainError(
      'conflict',
      'COMPLAINTS_READ_ONLY',
      'Las reclamaciones no se crean ni se eliminan desde el panel: solo se responden.',
    );
  for (const item of incoming)
    check('complaints', item, [
      ['status', oneOf(COMPLAINT_STATUSES), 'el estado de la reclamación no es válido'],
      ['providerResponse', isText, 'la respuesta no es válida'],
    ]);
  return current.map((complaint) => {
    const update = incoming.find((item) => item.id === complaint.id);
    const changed =
      update.status !== complaint.status || update.providerResponse !== complaint.providerResponse;
    return changed
      ? { ...complaint, status: update.status, providerResponse: update.providerResponse, updatedAt: now }
      : complaint;
  });
}
