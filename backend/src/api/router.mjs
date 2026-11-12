import { DomainError } from '../domain/comun/domain-error.mjs';
import { createResponder, HttpError, STATUS_BY_KIND } from './http.mjs';

/** Una ruta coincide por ruta exacta (string) o por expresión regular. */
const matchesPath = (pattern, path) => (typeof pattern === 'string' ? pattern === path : pattern.test(path));

/** Traduce errores conocidos a Problem; cualquier otro es un 500 genérico que no expone detalles. */
function problemFor(error) {
  if (error instanceof HttpError) return error;
  if (error instanceof DomainError && STATUS_BY_KIND[error.kind])
    return {
      status: STATUS_BY_KIND[error.kind],
      code: error.code,
      message: error.message,
      details: error.details,
    };
  return null;
}

/**
 * Handler de node:http. Las rutas se evalúan en orden; la primera que coincide en método y ruta responde.
 * Cada ruta es `{ method, path, handle({ req, url, path }) }` y `handle` devuelve `{ status, body }`, o
 * `{ status, headers, text }` para una respuesta que no es JSON (`css()`).
 */
export function createRequestHandler({ routes, allowedOrigins }) {
  const respond = createResponder(allowedOrigins);

  return async (req, res) => {
    if (req.method === 'OPTIONS') return respond.empty(req, res);
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const path = url.pathname;
    try {
      const route = routes.find(
        (candidate) => candidate.method === req.method && matchesPath(candidate.path, path),
      );
      if (!route) throw new HttpError(404, 'ROUTE_NOT_FOUND', 'Ruta no encontrada.');
      const result = await route.handle({ req, url, path });
      if ('text' in result) return respond.text(res, result);
      return result.status === 204
        ? respond.empty(req, res)
        : respond.json(req, res, result.status, result.body);
    } catch (error) {
      const problem = problemFor(error);
      if (problem)
        return respond.problem(req, res, problem.status, problem.code, problem.message, problem.details);
      console.error(error);
      return respond.problem(
        req,
        res,
        500,
        'INTERNAL_ERROR',
        'No pudimos completar la solicitud. Inténtalo nuevamente.',
      );
    }
  };
}
