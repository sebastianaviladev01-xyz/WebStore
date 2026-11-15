import { createHash } from 'node:crypto';

/** Límite del cuerpo JSON (los logos y fotos del Admin viajan como data URL). */
const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** Error propio del transporte HTTP (cuerpo inválido, ruta inexistente). */
export class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Tipo de error de negocio → código HTTP. */
export const STATUS_BY_KIND = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  'not-found': 404,
  conflict: 409,
};

/** Resultados que devuelven los handlers de rutas; el router los escribe en la respuesta. */
export const ok = (body) => ({ status: 200, body });
export const created = (body) => ({ status: 201, body });
export const accepted = (body) => ({ status: 202, body });
export const noContent = () => ({ status: 204 });

/** `If-None-Match` coincide con `etag`: lista separada por comas, etiquetas débiles (`W/`) o `*`. */
function coincideEtag(ifNoneMatch, etag) {
  if (!ifNoneMatch) return false;
  return ifNoneMatch
    .split(',')
    .map((valor) => valor.trim().replace(/^W\//, ''))
    .some((valor) => valor === '*' || valor === etag);
}

/**
 * Hoja de estilos con caché revalidable (ADR-0010): `ETag` con el SHA-256 recortado del cuerpo, `no-cache` para
 * revalidar en cada carga y, solo en modo demo (`varyByCookie`), `Vary: Cookie`, porque entonces la cookie de la
 * vista previa cambia el cuerpo; fuera de él, una cookie cualquiera no parte la caché compartida (PBI-0073).
 * Si `If-None-Match` coincide, responde `304` sin cuerpo. No lleva cabeceras CORS: se carga con `<link>`.
 */
export function css(texto, req, { varyByCookie = false } = {}) {
  const etag = `"${createHash('sha256').update(texto).digest('base64url').slice(0, 22)}"`;
  const headers = {
    'content-type': 'text/css; charset=utf-8',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
    etag,
    ...(varyByCookie ? { vary: 'Cookie' } : {}),
  };
  return coincideEtag(req.headers['if-none-match'], etag)
    ? { status: 304, headers, text: '' }
    : { status: 200, headers, text: texto };
}

/** Valor de la cookie `nombre` de la petición, o `undefined` si no viene. */
export function cookie(req, nombre) {
  for (const parte of String(req.headers.cookie ?? '').split(';')) {
    const separador = parte.indexOf('=');
    if (separador < 0 || parte.slice(0, separador).trim() !== nombre) continue;
    const valor = parte.slice(separador + 1).trim();
    try {
      return decodeURIComponent(valor);
    } catch {
      return valor;
    }
  }
  return undefined;
}

function corsHeaders(req, allowedOrigins) {
  const origin = req.headers.origin;
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-order-token,idempotency-key',
    // Las respuestas llevan tokens y datos personales: ningún navegador ni intermediario las guarda (PBI-0100).
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    vary: 'Origin',
  };
  if (origin && allowedOrigins.has(origin)) headers['access-control-allow-origin'] = origin;
  return headers;
}

/** Escritura de respuestas JSON, 204 y Problem con las cabeceras CORS de los orígenes permitidos. */
export function createResponder(allowedOrigins) {
  function json(req, res, status, payload) {
    res.writeHead(status, corsHeaders(req, allowedOrigins));
    res.end(JSON.stringify(payload));
  }
  function empty(req, res) {
    res.writeHead(204, corsHeaders(req, allowedOrigins));
    res.end();
  }
  function problem(req, res, status, code, message, details = undefined) {
    return json(req, res, status, { message, error: { code, message, ...(details ? { details } : {}) } });
  }
  /** Respuesta de texto con sus propias cabeceras (`css()`). */
  function text(res, { status, headers, text: cuerpo }) {
    res.writeHead(status, headers);
    res.end(cuerpo);
  }
  return { json, empty, problem, text };
}

/**
 * Cuerpo JSON de la petición. Los fragmentos se juntan como bytes y se decodifican una sola vez, para no partir
 * un carácter de varios bytes (PBI-0099). Sin cuerpo, `{}`; un cuerpo que no es un objeto JSON, `400`.
 */
export async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES)
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'El contenido supera el límite permitido.');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'El cuerpo de la solicitud no contiene JSON válido.');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body))
    throw new HttpError(400, 'INVALID_BODY', 'El cuerpo de la solicitud debe ser un objeto JSON.');
  return body;
}

/** Segmento de la ruta decodificado; una secuencia `%` mal formada responde `400 INVALID_PATH` (PBI-0099). */
export function pathSegment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new HttpError(400, 'INVALID_PATH', 'La dirección de la solicitud no es válida.');
  }
}

export function bearerToken(req) {
  const value = req.headers.authorization ?? '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

/** Token de acceso del pedido para compras como invitado. */
export const orderToken = (req) => String(req.headers['x-order-token'] ?? '');

/** Clave de idempotencia del intento de compra (`Idempotency-Key`, PBI-0086); sin cabecera, `''`. */
export const idempotencyKey = (req) => String(req.headers['idempotency-key'] ?? '');
