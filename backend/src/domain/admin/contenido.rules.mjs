/**
 * Listas de Contenido (lote 15, ADR-0021; provisional, por confirmar con Daniel):
 *
 * - `contactEmails` y `contactPhones` (PBI-0169): `{ value, label }`; el primero es el principal donde la tienda solo
 *   muestra uno. `socialLinks`: `{ label, url }`, con `https://`.
 * - `announcements` (PBI-0175): los avisos de la barra superior, `{ text, url }`, con el enlace opcional (una ruta de
 *   la tienda o `https://`).
 * - `quickLinks` (PBI-0185): los accesos del pie, `{ group, label, url }`; cada grupo es una columna del pie.
 *
 * `validarListaDeContenido` recibe lo que llegó del Admin y devuelve la lista normalizada (texto recortado y solo los
 * campos conocidos) o el motivo del rechazo, que el Admin muestra tal cual. `listasDesdeContenidoAnterior` migra los
 * campos de texto de antes del lote.
 */

export const LISTAS_DE_CONTENIDO = Object.freeze([
  'contactEmails',
  'contactPhones',
  'socialLinks',
  'announcements',
  'quickLinks',
]);

/** Campos de Contenido de antes del lote 15, que se migran a las listas y se quitan. */
export const CAMPOS_ANTERIORES_DE_CONTENIDO = Object.freeze([
  'contactEmail',
  'contactPhone',
  'headerMessage',
  'topNavigation',
]);

export const MAXIMO_ETIQUETA = 30;
export const MAXIMO_TEXTO_DE_AVISO = 140;
export const MAXIMO_GRUPOS_DEL_PIE = 3;

/**
 * El pie de la tienda antes del lote 15, escrito en el código (sin «Productos», que sale de las categorías). Es la
 * semilla de los accesos y lo que recibe un estado anterior: así el pie se sigue viendo igual.
 */
export const ACCESOS_DEL_PIE = Object.freeze(
  [
    ['Mi cuenta', 'Ingresar', '/cuenta/login'],
    ['Mi cuenta', 'Mi perfil', '/cuenta/perfil'],
    ['Mi cuenta', 'Mis pedidos', '/pedidos'],
    ['Mi cuenta', 'Recuperar acceso', '/cuenta/recuperar'],
    ['Información', 'Envíos', '/info/envios'],
    ['Información', 'Privacidad', '/info/privacidad'],
    ['Información', 'Términos', '/info/terminos'],
    ['Ayuda', 'Contacto', '/info/contacto'],
    ['Ayuda', 'Libro de reclamaciones', '/libro-reclamaciones'],
    ['Ayuda', 'Carrito', '/carrito'],
  ].map(([group, label, url]) => Object.freeze({ group, label, url })),
);

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO = /^\+?[\d\s().-]+$/;

const recortar = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

/** Ruta de la tienda: empieza con una sola `/` y no tiene espacios ni barras invertidas. */
export const esRutaDeLaTienda = (url) => /^\/(?!\/)[^\s\\]*$/.test(url);

/** Dirección `https://` con un host. */
export function esEnlaceHttps(url) {
  if (!/^https:\/\//i.test(url) || /\s/.test(url)) return false;
  try {
    return new URL(url).hostname.length > 0;
  } catch {
    return false;
  }
}

const digitos = (telefono) => telefono.replace(/\D/g, '').length;
const esTelefono = (valor) => TELEFONO.test(valor) && digitos(valor) >= 6 && digitos(valor) <= 15;

/** Cada lista: su máximo, cómo se normaliza un elemento y qué lo invalida. */
const LISTAS = {
  contactEmails: {
    maximo: 5,
    elemento: (item) => ({ value: recortar(item.value), label: recortar(item.label) }),
    error: ({ value }) => (CORREO.test(value) ? null : `el correo «${value}» no es válido`),
    clave: ({ value }) => value.toLowerCase(),
    repetido: ({ value }) => `el correo ${value} está repetido`,
    nombre: 'correos',
  },
  contactPhones: {
    maximo: 5,
    elemento: (item) => ({ value: recortar(item.value), label: recortar(item.label) }),
    error: ({ value }) =>
      esTelefono(value)
        ? null
        : `el teléfono «${value}» no es válido: usa de 6 a 15 dígitos, con espacios, +, guiones o paréntesis`,
    clave: ({ value }) => value.replace(/\D/g, ''),
    repetido: ({ value }) => `el teléfono ${value} está repetido`,
    nombre: 'teléfonos',
  },
  socialLinks: {
    maximo: 8,
    elemento: (item) => ({ label: recortar(item.label), url: recortar(item.url) }),
    error: ({ label, url }) => {
      if (!label) return 'cada red necesita su nombre (por ejemplo, Instagram)';
      if (!esEnlaceHttps(url)) return `el enlace de ${label} debe ser una dirección https://`;
      return null;
    },
    nombre: 'redes',
  },
  announcements: {
    maximo: 5,
    elemento: (item) => ({ text: recortar(item.text), url: recortar(item.url) }),
    error: ({ text, url }) => {
      if (!text) return 'cada aviso necesita su texto';
      if (text.length > MAXIMO_TEXTO_DE_AVISO)
        return `el texto de cada aviso admite hasta ${MAXIMO_TEXTO_DE_AVISO} caracteres`;
      if (url && !esRutaDeLaTienda(url) && !esEnlaceHttps(url))
        return `el enlace del aviso «${text}» debe ser una ruta de la tienda (/catalogo) o una dirección https://`;
      return null;
    },
    nombre: 'avisos',
  },
  quickLinks: {
    maximo: 24,
    elemento: (item) => ({
      group: recortar(item.group),
      label: recortar(item.label),
      url: recortar(item.url),
    }),
    error: ({ group, label, url }) => {
      if (!group) return 'cada acceso inferior necesita su grupo (la columna del pie)';
      if (group.length > MAXIMO_ETIQUETA)
        return `el nombre de cada grupo admite hasta ${MAXIMO_ETIQUETA} caracteres`;
      if (!label) return 'cada acceso inferior necesita su texto';
      if (!esRutaDeLaTienda(url) && !esEnlaceHttps(url))
        return `el destino de «${label}» debe ser una ruta de la tienda (/info/envios) o una dirección https://`;
      return null;
    },
    nombre: 'accesos inferiores',
  },
};

/** `{ valor }` con la lista normalizada, o `{ error }` con el motivo. `clave` es una de `LISTAS_DE_CONTENIDO`. */
export function validarListaDeContenido(clave, lista) {
  const regla = LISTAS[clave];
  if (!Array.isArray(lista)) return { error: `la lista de ${regla.nombre} no es válida` };
  if (lista.length > regla.maximo) return { error: `se admiten hasta ${regla.maximo} ${regla.nombre}` };
  const valor = [];
  const vistos = new Set();
  for (const item of lista) {
    if (!esObjeto(item)) return { error: `hay un elemento de ${regla.nombre} que no es válido` };
    const elemento = regla.elemento(item);
    const error = regla.error(elemento);
    if (error) return { error };
    if ('label' in elemento && clave !== 'quickLinks' && elemento.label.length > MAXIMO_ETIQUETA)
      return { error: `cada etiqueta admite hasta ${MAXIMO_ETIQUETA} caracteres` };
    if (clave === 'quickLinks' && elemento.label.length > 40)
      return { error: 'el texto de cada acceso inferior admite hasta 40 caracteres' };
    if (regla.clave) {
      const repetida = regla.clave(elemento);
      if (vistos.has(repetida)) return { error: regla.repetido(elemento) };
      vistos.add(repetida);
    }
    valor.push(elemento);
  }
  if (clave === 'quickLinks' && new Set(valor.map((acceso) => acceso.group)).size > MAXIMO_GRUPOS_DEL_PIE)
    return { error: `el pie admite hasta tres grupos de accesos, además de Productos` };
  return { valor };
}

// --- Migración de los campos de antes del lote 15 ---

const normalizar = (valor) => valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-PE');

/**
 * Destino que la tienda deducía de las palabras de un texto de la «Navegación superior» (PBI-0118 y PBI-0153, hasta
 * el lote 15). `false`: la cabecera ya lo ofrecía (Inicio, Productos y Pedidos; Envíos queda fijo en ella).
 */
function destinoAnterior(texto) {
  const clave = normalizar(texto);
  if (['inicio', 'producto', 'pedido', 'envio'].some((palabra) => clave.includes(palabra))) return false;
  if (clave.includes('contacto') || clave.includes('ayuda')) return '/info/contacto';
  if (clave.includes('privacidad')) return '/info/privacidad';
  if (clave.includes('termino')) return '/info/terminos';
  if (clave.includes('reclamacion')) return '/libro-reclamaciones';
  if (clave.includes('cuenta')) return '/cuenta/login';
  return '';
}

/**
 * Listas a partir de los campos de antes del lote 15: el correo y el teléfono pasan a ser el primero de su lista; el
 * mensaje superior, el primer aviso, seguido de los textos de la navegación superior que la cabecera no ofrece, con el
 * enlace que la tienda les deducía; y los accesos de texto, que la tienda no usaba, el pie que se veía. Los datos se
 * conservan tal cual (recortados): se validan cuando el Admin vuelve a guardar esa lista.
 */
export function listasDesdeContenidoAnterior(anterior) {
  const contacto = (valor) => (recortar(valor) ? [{ value: recortar(valor), label: '' }] : []);
  const avisos = recortar(anterior.headerMessage)
    ? [{ text: recortar(anterior.headerMessage), url: '' }]
    : [];
  for (const texto of recortar(anterior.topNavigation).split(',')) {
    const limpio = texto.trim();
    const url = limpio ? destinoAnterior(limpio) : false;
    if (url !== false) avisos.push({ text: limpio, url });
  }
  return {
    contactEmails: contacto(anterior.contactEmail),
    contactPhones: contacto(anterior.contactPhone),
    socialLinks: [],
    announcements: avisos,
    quickLinks: ACCESOS_DEL_PIE.map((acceso) => ({ ...acceso })),
  };
}
