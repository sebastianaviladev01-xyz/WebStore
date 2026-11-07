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

function corsHeaders(req, allowedOrigins) {
  const origin = req.headers.origin;
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-order-token',
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
  return { json, empty, problem };
}

export async function readJsonBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES)
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'El contenido supera el límite permitido.');
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'El cuerpo de la solicitud no contiene JSON válido.');
  }
}

export function bearerToken(req) {
  const value = req.headers.authorization ?? '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

/** Token de acceso del pedido para compras como invitado. */
export const orderToken = (req) => String(req.headers['x-order-token'] ?? '');
