/**
 * Cabeceras de los archivos que sirve la demo publicada (`servidor-demo.mjs`, ADR-0020). Sin dependencias.
 *
 * Lote 50 (ADR-0037, PBI-0277; decisión de Sebastián Avila del 2026-11-27): los buscadores no indexan el backoffice.
 * Cada respuesta bajo `/admin/` lleva `X-Robots-Tag: noindex, nofollow`, además de la etiqueta `robots` de su
 * `index.html`, que también vale en local. La tienda, en `/`, sigue indexable.
 */
import { extname } from 'node:path';

export const NO_INDEXAR = 'noindex, nofollow';

const PREFIJO_DEL_BACKOFFICE = '/admin/';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** `X-Robots-Tag` para lo que sirve la aplicación de `prefijo`: solo el backoffice. */
const deIndexacion = (prefijo) => (prefijo === PREFIJO_DEL_BACKOFFICE ? { 'x-robots-tag': NO_INDEXAR } : {});

/** Cabeceras de un archivo del build de la aplicación servida en `prefijo` (`/` o `/admin/`). */
export function cabecerasDelEstatico(prefijo, archivo) {
  // Los archivos con hash del build no cambian; index.html se revalida para tomar cada versión nueva.
  const indice = archivo.endsWith('index.html');
  return {
    'content-type': TIPOS[extname(archivo).toLowerCase()] ?? 'application/octet-stream',
    'cache-control': indice ? 'no-cache' : 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    ...deIndexacion(prefijo),
  };
}

/** Cabeceras de la redirección a la aplicación de `prefijo` (`/admin` → `/admin/`). */
export function cabecerasDeLaRedireccion(prefijo) {
  return { location: prefijo, ...deIndexacion(prefijo) };
}
