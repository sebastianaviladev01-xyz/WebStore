import { nowIso } from '../../domain/comun/reloj.mjs';
import { SESSION_TTL_MS } from '../../domain/sesion/sesion.rules.mjs';

/**
 * Registra una sesión (de cliente o del Admin) guardando solo el hash del token y devuelve el token,
 * que únicamente viaja al cliente.
 */
export function openSession(collection, subjectKey, subjectId, security) {
  const token = security.createToken();
  collection.push({
    id: security.newId(),
    [subjectKey]: subjectId,
    tokenHash: security.digest(token),
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  return token;
}
