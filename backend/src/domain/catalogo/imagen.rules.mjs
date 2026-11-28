/**
 * Formato y medidas de una imagen leídos de sus primeros bytes (lote 11, ADR-0021, PBI-0176; confirmado por Sebastián
 * Avila). Daniel pidió que el backend guarde la imagen de la categoría en una sola versión de 100 × 100 px. El BFF de
 * prueba no tiene dependencias y no decodifica ni redimensiona imágenes: el Admin genera esa versión y el BFF comprueba
 * aquí que es de verdad un PNG, un JPEG o un WebP de esas medidas (el contrato lo declara como límite del BFF de
 * prueba).
 */

/** Lado de la única versión que se guarda de la imagen de la categoría. */
export const LADO_IMAGEN_DE_CATEGORIA = 100;

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Marcadores SOF de JPEG (sin DHT `C4`, JPG `C8` ni DAC `CC`): llevan el alto y el ancho. */
const MARCADORES_SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

const ascii = (bytes, desde, largo) => String.fromCharCode(...bytes.subarray(desde, desde + largo));
const u16be = (bytes, i) => (bytes[i] << 8) | bytes[i + 1];
const u16le = (bytes, i) => bytes[i] | (bytes[i + 1] << 8);
const u24le = (bytes, i) => bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16);
const u32be = (bytes, i) =>
  ((bytes[i] << 24) >>> 0) + ((bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]);

function medidasPng(bytes) {
  if (bytes.length < 24 || !FIRMA_PNG.every((byte, i) => bytes[i] === byte)) return null;
  if (ascii(bytes, 12, 4) !== 'IHDR') return null;
  return { tipo: 'png', ancho: u32be(bytes, 16), alto: u32be(bytes, 20) };
}

function medidasJpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marcador = bytes[i + 1];
    if (marcador === 0xff) {
      i += 1; // relleno entre marcadores
      continue;
    }
    if (marcador === 0xd9 || marcador === 0xda) return null; // fin o datos de la imagen sin SOF antes
    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      i += 2; // marcadores sin longitud
      continue;
    }
    const largo = u16be(bytes, i + 2);
    if (MARCADORES_SOF.has(marcador)) {
      if (i + 8 >= bytes.length) return null;
      return { tipo: 'jpeg', ancho: u16be(bytes, i + 7), alto: u16be(bytes, i + 5) };
    }
    i += 2 + largo;
  }
  return null;
}

function medidasWebp(bytes) {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return null;
  const bloque = ascii(bytes, 12, 4);
  const d = 20; // inicio de los datos del primer bloque
  if (bloque === 'VP8 ') {
    if (bytes[d + 3] !== 0x9d || bytes[d + 4] !== 0x01 || bytes[d + 5] !== 0x2a) return null;
    return { tipo: 'webp', ancho: u16le(bytes, d + 6) & 0x3fff, alto: u16le(bytes, d + 8) & 0x3fff };
  }
  if (bloque === 'VP8L') {
    if (bytes[d] !== 0x2f) return null;
    const bits = (bytes[d + 1] | (bytes[d + 2] << 8) | (bytes[d + 3] << 16) | (bytes[d + 4] << 24)) >>> 0;
    return { tipo: 'webp', ancho: (bits & 0x3fff) + 1, alto: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (bloque === 'VP8X')
    return { tipo: 'webp', ancho: u24le(bytes, d + 4) + 1, alto: u24le(bytes, d + 7) + 1 };
  return null;
}

/** `{ tipo, ancho, alto }` de un PNG, un JPEG o un WebP; `null` si los bytes no son ninguno de los tres o están cortados. */
export function medidasDeImagen(bytes) {
  return medidasPng(bytes) ?? medidasJpeg(bytes) ?? medidasWebp(bytes);
}

const DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/;

/** Formato y medidas de una Data URL PNG, JPEG o WebP en base64, si el tipo que declara es el de sus bytes; si no, `null`. */
export function leerImagen(valor) {
  const partes = typeof valor === 'string' ? DATA_URL.exec(valor) : null;
  if (!partes) return null;
  const medidas = medidasDeImagen(Buffer.from(partes[2], 'base64'));
  return medidas?.tipo === partes[1] ? medidas : null;
}

/**
 * Imágenes del producto y del banner cargadas como archivo (lote 24, ADR-0025 y ADR-0026, PBI-0214; confirmado por
 * Sebastián Avila). El backoffice genera cada versión y el BFF de prueba, sin dependencias, solo comprueba en los bytes
 * el formato, el lado mayor y el peso (en caracteres de la Data URL; el archivo pesa unas tres cuartas partes). La
 * imagen principal del producto es la de la ficha y la miniatura, su reducción, la de los listados.
 */
export const LADO_IMAGEN_DE_PRODUCTO = 1600;
export const MAX_IMAGEN_DE_PRODUCTO = 250 * 1024;
export const LADO_MINIATURA_DE_PRODUCTO = 480;
export const MAX_MINIATURA_DE_PRODUCTO = 60 * 1024;
/** Imagen de escritorio del banner: el lado de las fotos de ejemplo (2560 × 1024). */
export const LADO_IMAGEN_DE_BANNER = 2560;
export const MAX_IMAGEN_DE_BANNER = 550 * 1024;
/** Imagen del celular del banner, opcional: las de ejemplo miden 1100 px de ancho. */
export const LADO_IMAGEN_MOVIL_DE_BANNER = 1200;
export const MAX_IMAGEN_MOVIL_DE_BANNER = 200 * 1024;
/**
 * Logo de la tienda (lote 50, ADR-0037, PBI-0289; decisión de Sebastián Avila del 2026-11-27): se carga como las demás
 * imágenes y el backoffice lo reduce como la imagen principal del producto, así que tiene sus mismos límites.
 */
export const LADO_LOGO = LADO_IMAGEN_DE_PRODUCTO;
export const MAX_LOGO = MAX_IMAGEN_DE_PRODUCTO;

/**
 * Formato y medidas de una imagen cargada si es una Data URL PNG, JPEG o WebP cuyo lado mayor no pasa de `lado` y que
 * cabe en `maximo` caracteres; si no, `null`.
 */
export function imagenCargada(valor, { lado, maximo }) {
  if (typeof valor !== 'string' || valor.length > maximo) return null;
  const imagen = leerImagen(valor);
  return imagen && Math.max(imagen.ancho, imagen.alto) <= lado ? imagen : null;
}

/**
 * ¿`miniatura` es la reducción de `principal` a un lado mayor de `lado` px (sin agrandar)? Se admite un píxel de
 * diferencia por el redondeo.
 */
export function esReduccionDe(miniatura, principal, lado) {
  const escala = Math.min(1, lado / Math.max(principal.ancho, principal.alto));
  const ancho = Math.round(principal.ancho * escala);
  const alto = Math.round(principal.alto * escala);
  return Math.abs(miniatura.ancho - ancho) <= 1 && Math.abs(miniatura.alto - alto) <= 1;
}

/** Tipo y bytes de una Data URL PNG, JPEG o WebP válida, para servirla como archivo; si no lo es, `null`. */
export function bytesDeImagen(valor) {
  const partes = typeof valor === 'string' ? DATA_URL.exec(valor) : null;
  if (!partes || !leerImagen(valor)) return null;
  return { tipo: partes[1], bytes: Buffer.from(partes[2], 'base64') };
}
