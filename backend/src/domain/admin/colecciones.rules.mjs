import {
  esFechaDeCalendario,
  MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE,
} from '../calendario/dias-no-laborables.rules.mjs';
import {
  esReduccionDe,
  imagenCargada,
  LADO_IMAGEN_DE_BANNER,
  LADO_IMAGEN_DE_CATEGORIA,
  LADO_IMAGEN_DE_PRODUCTO,
  LADO_IMAGEN_MOVIL_DE_BANNER,
  LADO_MINIATURA_DE_PRODUCTO,
  leerImagen,
  MAX_IMAGEN_DE_BANNER,
  MAX_IMAGEN_DE_PRODUCTO,
  MAX_IMAGEN_MOVIL_DE_BANNER,
  MAX_MINIATURA_DE_PRODUCTO,
} from '../catalogo/imagen.rules.mjs';
import { DomainError } from '../comun/domain-error.mjs';
import { esInstanteConZona } from '../comun/reloj.mjs';
import { LISTAS_DE_CONTENIDO, esModoDeSugeridos, validarListaDeContenido } from './contenido.rules.mjs';
import { CAMPOS_DE_WHATSAPP } from './whatsapp.rules.mjs';
import { esModoDeDireccion } from '../pedidos/direcciones-por-producto.rules.mjs';
import { ORDER_STATUSES } from '../pedidos/pedido.rules.mjs';
import { esHoraDeCorte, esReglaDePrimeraEntrega } from '../pedidos/primera-fecha-de-entrega.rules.mjs';
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
  nonWorkingDates: 'los días no laborables',
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

const IMAGEN_DE_PRODUCTO = { lado: LADO_IMAGEN_DE_PRODUCTO, maximo: MAX_IMAGEN_DE_PRODUCTO };
const MINIATURA_DE_PRODUCTO = { lado: LADO_MINIATURA_DE_PRODUCTO, maximo: MAX_MINIATURA_DE_PRODUCTO };

/**
 * Lote 24 (ADR-0025 y ADR-0026, PBI-0214; confirmado por Sebastián Avila): la imagen principal y la miniatura se cargan
 * como archivo. Una imagen principal nueva o cambiada es un PNG, un JPEG o un WebP de hasta `LADO_IMAGEN_DE_PRODUCTO`
 * px por lado, y llega con su miniatura, la reducción a `LADO_MINIATURA_DE_PRODUCTO` px. Las que el producto ya tenía
 * guardadas (rutas de `assets/`, de antes del lote) siguen valiendo mientras no cambien.
 */
function requireValidProductImages(product, anterior) {
  const imagenCambio = product.imageUrl !== anterior?.imageUrl;
  const miniaturaCambio = product.thumbnailUrl !== anterior?.thumbnailUrl;
  const principal = imagenCambio ? imagenCargada(product.imageUrl, IMAGEN_DE_PRODUCTO) : null;
  if (imagenCambio && !principal)
    throw invalid(
      'products',
      'imageUrl',
      `la imagen principal debe ser PNG, JPG o WebP de hasta ${LADO_IMAGEN_DE_PRODUCTO} px por lado; vuelve a cargarla`,
      product.id,
    );
  // Sin cambios en la imagen, una miniatura que no cambia, o que se quita, no se mide: la tienda usa la principal.
  if (!imagenCambio && (!miniaturaCambio || product.thumbnailUrl === undefined)) return;
  const miniatura = imagenCargada(product.thumbnailUrl, MINIATURA_DE_PRODUCTO);
  const base = principal ?? leerImagen(product.imageUrl);
  if (!miniatura || (base && !esReduccionDe(miniatura, base, LADO_MINIATURA_DE_PRODUCTO)))
    throw invalid(
      'products',
      'thumbnailUrl',
      `la miniatura debe ser la reducción de la imagen principal, de hasta ${LADO_MINIATURA_DE_PRODUCTO} px por lado; vuelve a cargar la imagen`,
      product.id,
    );
}

/**
 * Lote 25 (ADR-0025 y ADR-0026; confirmado por Sebastián Avila): las fotos de la galería también se cargan como
 * archivo, nunca como URL (Daniel: «no adjuntas como URL»). Una foto nueva es un PNG, un JPEG o un WebP con el lado y
 * el peso de la imagen principal; las que el producto ya tenía en su galería (URL, rutas de `assets/` o Data URL de
 * antes) siguen valiendo mientras sigan en ella, aunque cambie el orden o se quiten otras.
 */
function requireValidGallery(product, anterior) {
  if (product.gallery === undefined) return;
  const guardadas = new Set(Array.isArray(anterior?.gallery) ? anterior.gallery : []);
  for (const foto of product.gallery) {
    if (guardadas.has(foto) || !foto.trim()) continue;
    if (!imagenCargada(foto, IMAGEN_DE_PRODUCTO))
      throw invalid(
        'products',
        'gallery',
        `las fotos de la galería deben ser PNG, JPG o WebP de hasta ${LADO_IMAGEN_DE_PRODUCTO} px por lado; vuelve a cargarlas`,
        product.id,
      );
  }
}

/**
 * Productos completos (rol con `products.manage`): SKU único, precio y stock válidos. `previous`, los productos
 * vigentes: sus imágenes ya guardadas no se vuelven a medir (PBI-0214).
 */
export function requireValidProducts(products, previous = []) {
  requireItems(products, 'products');
  const anteriores = new Map(previous.map((product) => [product.id, product]));
  const skus = new Map();
  for (const product of products) {
    check('products', product, [
      ['name', hasText, 'cada producto necesita un nombre'],
      ['sku', hasText, 'cada producto necesita un SKU'],
      ['price', nonNegative, 'el precio debe ser un número mayor o igual a 0'],
      ['stock', nonNegativeInteger, 'el stock debe ser un número entero mayor o igual a 0'],
      ['active', isBoolean, 'el estado del producto no es válido'],
      // Lote 22 (PBI-0215): la casilla «Es destacado»; sin ella, el producto no es destacado.
      ['featured', isBoolean, 'la marca de destacado no es válida', { optional: true }],
      ['categoryId', hasText, 'cada producto necesita una categoría'],
      ['brandId', hasText, 'cada producto necesita una marca'],
      ['description', isText, 'la descripción no es válida', { optional: true }],
      ['imageUrl', isText, 'la imagen no es válida', { optional: true }],
      ['thumbnailUrl', optionalText, 'la miniatura no es válida'],
      ['highlights', textList, 'las características no son válidas', { optional: true }],
      ['gallery', textList, 'la galería no es válida', { optional: true }],
    ]);
    requireValidProductImages(product, anteriores.get(product.id));
    requireValidGallery(product, anteriores.get(product.id));
    // PBI-0129: el mensaje dice qué producto ya usa el SKU.
    const sku = product.sku.trim().toLowerCase();
    if (skus.has(sku))
      throw invalid('products', 'sku', `el SKU ${product.sku} ya lo usa «${skus.get(sku).name}»`, product.id);
    skus.set(sku, product);
  }
  return products;
}

/** Imagen pequeña de la categoría (lote 07b, PBI-0052): opcional, como Data URL de una imagen, de hasta 100 000 caracteres. */
export const MAX_IMAGEN_DE_CATEGORIA = 100_000;
/** Forma de las imágenes guardadas antes del lote 11 (160 px, también SVG): siguen valiendo mientras no cambien. */
const IMAGEN_ANTERIOR = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;

/**
 * Lote 11 (ADR-0021, PBI-0176; confirmado por Sebastián Avila): una imagen nueva o cambiada es la única versión que se
 * guarda, un PNG, un JPEG o un WebP de 100 × 100 px (`leerImagen` comprueba el tipo y las medidas en sus bytes). La que
 * la categoría ya tenía guardada se acepta tal cual, para que una imagen del lote 07b no bloquee otros guardados.
 */
function imagenDeCategoria(value, anterior) {
  if (value === null) return true;
  if (!isText(value) || value.length > MAX_IMAGEN_DE_CATEGORIA) return false;
  if (value === anterior) return IMAGEN_ANTERIOR.test(value);
  const imagen = leerImagen(value);
  return (
    imagen !== null && imagen.ancho === LADO_IMAGEN_DE_CATEGORIA && imagen.alto === LADO_IMAGEN_DE_CATEGORIA
  );
}

/** `previous`, las categorías vigentes: sus imágenes ya guardadas no se vuelven a medir (PBI-0176). */
export function requireValidCategories(categories, previous = []) {
  requireItems(categories, 'categories');
  const anteriores = new Map(previous.map((category) => [category.id, category.imageUrl]));
  for (const category of categories)
    check('categories', category, [
      ['name', hasText, 'cada categoría necesita un nombre'],
      ['parentId', optionalText, 'la categoría padre no es válida'],
      ['order', (v) => v === undefined || v === null || Number.isFinite(v), 'el orden no es válido'],
      [
        'imageUrl',
        (value) => imagenDeCategoria(value, anteriores.get(category.id)),
        `la imagen de la categoría debe ser PNG, JPG o WebP de ${LADO_IMAGEN_DE_CATEGORIA} × ${LADO_IMAGEN_DE_CATEGORIA} px; vuelve a cargarla`,
        { optional: true },
      ],
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

/** Largo máximo del texto de cada botón del banner (lote 12, PBI-0184). */
export const MAXIMO_TEXTO_DE_BOTON = 40;

/**
 * Lote 46 (ADR-0033, PBI-0266): los estilos que puede elegir cada botón del banner, todos del tema: `primary`
 * («Principal»), `accent` («Secundario»), `contrast` («Contraste») y `outline` («Con borde»). No hay color libre: no
 * cambiaría al cambiar de tema ni garantizaría que su texto se lea (ADR-0022).
 */
export const ESTILOS_DE_BOTON_DE_BANNER = Object.freeze(['primary', 'accent', 'contrast', 'outline']);

/**
 * Los dos botones opcionales del banner (lote 12, PBI-0184), con su texto, su enlace y, desde el lote 46 (PBI-0266), su
 * estilo. Se nombran por su orden, «primer botón» y «segundo botón»: el estilo ya no depende de cuál es.
 */
const BOTONES_DE_BANNER = [
  { texto: 'cta', enlace: 'ctaUrl', estilo: 'ctaStyle', nombre: 'primer botón' },
  { texto: 'secondaryCta', enlace: 'secondaryCtaUrl', estilo: 'secondaryCtaStyle', nombre: 'segundo botón' },
];

/** Por omisión (PBI-0266), el primero es el principal y el segundo el secundario, como desde el lote 12. */
const ESTILO_POR_OMISION = Object.freeze({ ctaStyle: 'primary', secondaryCtaStyle: 'accent' });

/**
 * El estilo de cada botón del banner (lote 46, PBI-0266): el guardado si es uno de los cuatro; si falta o no existe
 * (un banner de antes del lote, o un `data.json` editado a mano), el de por omisión. Así los banners guardados se ven
 * igual que antes.
 */
export function estilosDeLosBotones(banner) {
  return Object.fromEntries(
    Object.entries(ESTILO_POR_OMISION).map(([campo, porOmision]) => [
      campo,
      ESTILOS_DE_BOTON_DE_BANNER.includes(banner?.[campo]) ? banner[campo] : porOmision,
    ]),
  );
}

const recortado = (value) => (isText(value) ? value.trim() : '');

/**
 * PBI-0184: un botón con texto necesita su enlace y uno con enlace, su texto; el texto tiene un largo máximo. Un botón
 * que el banner ya tenía guardado así se acepta sin volver a validarlo mientras no cambie, para no bloquear otros
 * guardados con datos de antes.
 */
function requireValidBannerButtons(banner, previous) {
  const anterior = previous.find((item) => item?.id === banner.id);
  for (const { texto, enlace, nombre } of BOTONES_DE_BANNER) {
    if (anterior && anterior[texto] === banner[texto] && anterior[enlace] === banner[enlace]) continue;
    const etiqueta = recortado(banner[texto]);
    const destino = recortado(banner[enlace]);
    if (etiqueta.length > MAXIMO_TEXTO_DE_BOTON)
      throw invalid(
        'banners',
        texto,
        `el texto del ${nombre} admite hasta ${MAXIMO_TEXTO_DE_BOTON} caracteres`,
        banner.id,
      );
    if (etiqueta && !destino) throw invalid('banners', enlace, `el ${nombre} necesita un enlace`, banner.id);
    if (destino && !etiqueta) throw invalid('banners', texto, `el ${nombre} necesita un texto`, banner.id);
  }
}

export function requireValidBanners(banners, previous = []) {
  requireItems(banners, 'banners');
  const textos = [
    'eyebrow',
    'description',
    'cta',
    'ctaUrl',
    'secondaryCta',
    'secondaryCtaUrl',
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
      // PBI-0266 (lote 46): sin el campo, la tienda usa el estilo de siempre de ese botón.
      ...BOTONES_DE_BANNER.map(({ estilo, nombre }) => [
        estilo,
        oneOf(ESTILOS_DE_BOTON_DE_BANNER),
        `el estilo del ${nombre} no es válido`,
        { optional: true },
      ]),
    ]);
  for (const banner of banners) requireValidBannerButtons(banner, previous);
  for (const banner of banners) requireValidBannerImages(banner, previous);
  // PBI-0128 y PBI-0221 (lote 24): la vigencia lleva fecha y hora, y termina después de empezar.
  for (const banner of banners) {
    requireValidBannerSchedule(banner, previous);
    const inicio = Date.parse(banner.startAt);
    const fin = Date.parse(banner.endAt);
    if (Number.isFinite(inicio) && Number.isFinite(fin) && fin <= inicio)
      throw invalid(
        'banners',
        'endAt',
        'la fecha y la hora de fin deben ser posteriores a las de inicio',
        banner.id,
      );
  }
  return banners;
}

/** Las dos imágenes del banner (lote 24, PBI-0214): la de escritorio y la del celular, opcional. */
const IMAGENES_DE_BANNER = [
  {
    campo: 'imageUrl',
    medidas: { lado: LADO_IMAGEN_DE_BANNER, maximo: MAX_IMAGEN_DE_BANNER },
    detalle: `la imagen de escritorio debe ser PNG, JPG o WebP de hasta ${LADO_IMAGEN_DE_BANNER} px por lado; vuelve a cargarla`,
    opcional: false,
  },
  {
    campo: 'mobileImageUrl',
    medidas: { lado: LADO_IMAGEN_MOVIL_DE_BANNER, maximo: MAX_IMAGEN_MOVIL_DE_BANNER },
    detalle: `la imagen del celular debe ser PNG, JPG o WebP de hasta ${LADO_IMAGEN_MOVIL_DE_BANNER} px por lado; vuelve a cargarla`,
    opcional: true,
  },
];

/**
 * Lote 24 (ADR-0025 y ADR-0026, PBI-0214; confirmado por Sebastián Avila): una imagen del banner nueva o cambiada se
 * cargó como archivo (PNG, JPEG o WebP dentro de su lado máximo y su peso); la del celular se puede quitar (`''`). Las
 * que el banner ya tenía guardadas (rutas de `assets/`) siguen valiendo mientras no cambien.
 */
function requireValidBannerImages(banner, previous) {
  const anterior = previous.find((item) => item?.id === banner.id);
  for (const { campo, medidas, detalle, opcional } of IMAGENES_DE_BANNER) {
    const valor = banner[campo];
    if (valor === anterior?.[campo]) continue;
    if (valor === undefined || (opcional && valor === '')) continue;
    if (!imagenCargada(valor, medidas)) throw invalid('banners', campo, detalle, banner.id);
  }
}

/**
 * Lote 24 (ADR-0025, PBI-0221; confirmado por Sebastián Avila): un inicio o un fin nuevos o cambiados son instantes con
 * hora y zona (`Z` o `±hh:mm`), como los envía el backoffice en hora de Lima. Lote 33 (ADR-0029, PBI-0246): además su
 * fecha existe en el calendario, con la misma comprobación que los avisos (`esInstanteConZona`). Una vigencia guardada
 * antes que no cambia sigue valiendo, para no bloquear otros guardados.
 */
function requireValidBannerSchedule(banner, previous) {
  const anterior = previous.find((item) => item?.id === banner.id);
  for (const [campo, nombre] of [
    ['startAt', 'el inicio'],
    ['endAt', 'el fin'],
  ]) {
    const valor = banner[campo];
    if (valor === undefined || valor === anterior?.[campo]) continue;
    if (!esInstanteConZona(valor))
      throw invalid(
        'banners',
        campo,
        `${nombre} de la vigencia necesita una fecha y una hora válidas`,
        banner.id,
      );
  }
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
    // Lote 15 (ADR-0021): correos, teléfonos, redes, avisos y accesos inferiores son listas con sus reglas.
    if (LISTAS_DE_CONTENIDO.includes(key)) {
      const lista = validarListaDeContenido(key, value);
      if (lista.error) throw invalid('config', key, lista.error);
      result[key] = lista.valor;
      continue;
    }
    // Lote 49 (ADR-0035, PBI-0241): el número de WhatsApp se guarda con sus dígitos y el mensaje, recortado.
    if (key in CAMPOS_DE_WHATSAPP) {
      const campo = CAMPOS_DE_WHATSAPP[key](value);
      if (campo.error) throw invalid('config', key, campo.error);
      result[key] = campo.valor;
      continue;
    }
    // Lote 16 (ADR-0021, PBI-0179): los sugeridos van en el diálogo o en un panel lateral.
    if (key === 'addToCartDisplay' && !esModoDeSugeridos(value))
      throw invalid('config', key, 'los sugeridos van en el diálogo o en un panel lateral');
    // Lote 17 (ADR-0021, PBI-0178): la primera fecha de entrega y la hora de corte opcional.
    if (key === 'firstDeliveryDay' && !esReglaDePrimeraEntrega(value))
      throw invalid(
        'config',
        key,
        'la primera fecha de entrega es el mismo día, el día calendario siguiente o el siguiente día hábil',
      );
    // Lote 19 (ADR-0021, PBI-0006): una dirección por pedido o una por producto.
    if (key === 'deliveryAddressMode' && !esModoDeDireccion(value))
      throw invalid('config', key, 'el pedido lleva una dirección por pedido o una por producto');
    if (key === 'deliveryCutoffTime' && !esHoraDeCorte(value))
      throw invalid('config', key, 'la hora de corte va en formato de 24 horas (14:00) o vacía');
    const expected = typeof current[key];
    if (typeof value !== expected) throw invalid('config', key, 'hay un campo con un valor que no es válido');
    result[key] = value;
  }
  if (!hasText(result.storeName)) throw invalid('config', 'storeName', 'la tienda necesita un nombre');
  return result;
}

/** Máximo de días no laborables guardados: los feriados de varios años, con margen. */
export const MAXIMO_DIAS_NO_LABORABLES = 400;

const fechaVisible = (fecha) => fecha.split('-').reverse().join('/');

/**
 * Días no laborables (lote 17, ADR-0021, PBI-0183; confirmado por Sebastián Avila): `date` es una fecha `AAAA-MM-DD`
 * que existe, sin repetir; `name`, opcional, texto de hasta 60 caracteres. Devuelve la lista con el nombre recortado,
 * solo los campos conocidos y ordenada por fecha.
 */
export function requireValidNonWorkingDates(dias) {
  requireItems(dias, 'nonWorkingDates');
  if (dias.length > MAXIMO_DIAS_NO_LABORABLES)
    throw invalid('nonWorkingDates', null, `se admiten hasta ${MAXIMO_DIAS_NO_LABORABLES} fechas`);
  const fechas = new Set();
  const resultado = [];
  for (const dia of dias) {
    check('nonWorkingDates', dia, [
      ['date', esFechaDeCalendario, 'cada día necesita una fecha válida'],
      ['name', optionalText, 'el nombre del día no es válido'],
    ]);
    const name = typeof dia.name === 'string' ? dia.name.trim() : '';
    if (name.length > MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE)
      throw invalid(
        'nonWorkingDates',
        'name',
        `el nombre admite hasta ${MAXIMO_NOMBRE_DE_DIA_NO_LABORABLE} caracteres`,
        dia.id,
      );
    if (fechas.has(dia.date))
      throw invalid(
        'nonWorkingDates',
        'date',
        `la fecha ${fechaVisible(dia.date)} ya está en la lista`,
        dia.id,
      );
    fechas.add(dia.date);
    resultado.push({ id: dia.id, date: dia.date, name });
  }
  return resultado.sort((a, b) => a.date.localeCompare(b.date));
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

/**
 * Cambios de una colección (lote 06, PBI-0119 y PBI-0120): en lugar de la lista completa, el Admin puede enviar
 * `{ upsert, remove }`. `upsert` trae registros con `id`: si el registro existe, sus campos se aplican sobre el del
 * servidor (un campo con `null` se quita) y lo demás se conserva; si no existe, se agrega al final. `remove` trae
 * los `id` que se eliminan. Una lista se acepta como antes y reemplaza la colección. Devuelve la lista resultante,
 * que después se valida entera como si hubiera llegado completa.
 */
export function resolveCollectionChanges(collection, current, value) {
  if (Array.isArray(value)) return value;
  const forma = 'los cambios no tienen la forma { upsert, remove }';
  if (!isObject(value) || Object.keys(value).some((key) => key !== 'upsert' && key !== 'remove'))
    throw invalid(collection, null, forma);
  const upsert = value.upsert ?? [];
  const remove = value.remove ?? [];
  if (!Array.isArray(upsert) || !Array.isArray(remove) || !remove.every(hasText))
    throw invalid(collection, null, forma);
  requireItems(upsert, collection);
  const removed = new Set(remove);
  const patches = new Map(upsert.map((patch) => [patch.id, patch]));
  const both = remove.find((id) => patches.has(id));
  if (both !== undefined)
    throw invalid(collection, 'id', `el identificador ${both} se cambia y se elimina a la vez`, both);
  const merge = (base, patch) => {
    const result = { ...base };
    for (const [key, field] of Object.entries(patch)) {
      if (field === null) delete result[key];
      else result[key] = field;
    }
    return result;
  };
  const currentIds = new Set(current.map((item) => item.id));
  return [
    ...current
      .filter((item) => !removed.has(item.id))
      .map((item) => (patches.has(item.id) ? merge(item, patches.get(item.id)) : item)),
    ...upsert.filter((patch) => !currentIds.has(patch.id)).map((patch) => merge({}, patch)),
  ];
}

/** Cambios de estado de pedidos como lista o como `{ upsert }`: los pedidos no se crean ni se eliminan. */
export function orderStatusChanges(value) {
  if (Array.isArray(value)) return value;
  if (!isObject(value) || Object.keys(value).some((key) => key !== 'upsert') || !Array.isArray(value.upsert))
    throw invalid('orders', null, 'los cambios no tienen la forma { upsert }');
  return value.upsert;
}
