/**
 * Imágenes sintéticas para las pruebas de la imagen de la categoría (lote 11, PBI-0176), sin dependencias: un PNG
 * real (con `node:zlib`) y las cabeceras mínimas de JPEG y WebP, que bastan para leer el formato y las medidas.
 */
import { deflateSync } from 'node:zlib';

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = TABLA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloquePng(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

/** PNG RGB de `ancho` × `alto` de un solo color. */
export function png(ancho, alto) {
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(ancho, 0);
  cabecera.writeUInt32BE(alto, 4);
  cabecera[8] = 8; // bits por canal
  cabecera[9] = 2; // RGB
  const filas = Buffer.alloc((ancho * 3 + 1) * alto, 0x80);
  for (let y = 0; y < alto; y++) filas[y * (ancho * 3 + 1)] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloquePng('IHDR', cabecera),
    bloquePng('IDAT', deflateSync(filas)),
    bloquePng('IEND', Buffer.alloc(0)),
  ]);
}

/** Inicio de un JPEG con un segmento APP0 y el SOF0 que dice sus medidas. */
export function jpeg(ancho, alto) {
  const app0 = [
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
    0x00,
  ];
  const sof0 = [0xff, 0xc0, 0x00, 0x11, 0x08, alto >> 8, alto & 0xff, ancho >> 8, ancho & 0xff, 0x03];
  return Buffer.from([0xff, 0xd8, ...app0, ...sof0, ...Array(9).fill(0), 0xff, 0xd9]);
}

const riff = (bloque) => {
  const tamano = Buffer.alloc(4);
  tamano.writeUInt32LE(4 + bloque.length);
  return Buffer.concat([Buffer.from('RIFF'), tamano, Buffer.from('WEBP'), bloque]);
};

/** Inicio de un WebP con pérdida (`VP8 `), sin pérdida (`VP8L`) o extendido (`VP8X`). */
export function webp(ancho, alto, variante = 'VP8 ') {
  const datos = Buffer.alloc(16);
  if (variante === 'VP8 ') {
    datos.set([0x9d, 0x01, 0x2a], 3);
    datos.writeUInt16LE(ancho & 0x3fff, 6);
    datos.writeUInt16LE(alto & 0x3fff, 8);
  } else if (variante === 'VP8L') {
    datos[0] = 0x2f;
    datos.writeUInt32LE(((ancho - 1) & 0x3fff) | (((alto - 1) & 0x3fff) << 14), 1);
  } else {
    datos.writeUIntLE(ancho - 1, 4, 3);
    datos.writeUIntLE(alto - 1, 7, 3);
  }
  const cabecera = Buffer.alloc(8);
  cabecera.write(variante, 0, 'ascii');
  cabecera.writeUInt32LE(datos.length, 4);
  return riff(Buffer.concat([cabecera, datos]));
}

/** Data URL en base64 de `bytes` con el tipo `image/<tipo>`. */
export const dataUrl = (tipo, bytes) => `data:image/${tipo};base64,${Buffer.from(bytes).toString('base64')}`;
