import { DomainError } from '../comun/domain-error.mjs';

/**
 * Versiones de los términos y condiciones (lote 17, ADR-0021, PBI-0177; provisional, por confirmar con Daniel). Daniel
 * pidió que cada versión se registre y que, al aceptar, se guarden la fecha y la hora con minutos y segundos y el
 * número de la versión aceptada. El estado guarda `termsVersions`, `[{ version, publishedAt, content }]`: el número
 * sube cada vez que cambia el texto de los términos de Contenido (`config.termsContent`), y lo calcula el BFF al
 * guardar, no el Admin. Los términos de antes del lote son la versión 1, con `publishedAt: null` (sin fecha registrada).
 */

const esVersion = (valor) =>
  valor !== null &&
  typeof valor === 'object' &&
  Number.isInteger(valor.version) &&
  valor.version > 0 &&
  typeof valor.content === 'string' &&
  (valor.publishedAt === null || typeof valor.publishedAt === 'string');

/** La versión vigente: la de número mayor. */
export const versionVigente = (versiones) => versiones[versiones.length - 1];

/**
 * Lo que la tienda y el Admin ven de la versión vigente, junto a la configuración: `termsVersion` (su número; 1 si no
 * hay registro) y `termsPublishedAt` (cuándo se publicó, o `null` si es anterior al registro de versiones).
 */
export function terminosVigentes(versiones) {
  const vigente = versionVigente(versiones ?? []);
  return { termsVersion: vigente?.version ?? 1, termsPublishedAt: vigente?.publishedAt ?? null };
}

/**
 * Publica `texto` como la versión siguiente, con su fecha (`ahora`), si no es el texto de la vigente. Si lo es, devuelve
 * la misma lista. No modifica la recibida.
 */
export function conTextoDeTerminos(versiones, texto, ahora) {
  const vigente = versionVigente(versiones);
  if (vigente && vigente.content === texto) return versiones;
  return [...versiones, { version: (vigente?.version ?? 0) + 1, publishedAt: ahora, content: texto }];
}

/**
 * Versiones al cargar el estado: las bien formadas, por número y sin repetir. Sin ninguna, el texto vigente es la
 * versión 1, sin fecha (los términos de antes del lote). Si el texto vigente no es el de la última versión (un BFF
 * anterior lo cambió sin registrarlo), se registra como una versión nueva con la fecha de la carga.
 */
export function normalizarVersionesDeTerminos(guardadas, textoVigente, ahora) {
  const vistas = new Set();
  const versiones = (Array.isArray(guardadas) ? guardadas : [])
    .filter(esVersion)
    .filter((version) => !vistas.has(version.version) && vistas.add(version.version))
    .map(({ version, publishedAt, content }) => ({ version, publishedAt, content }))
    .sort((a, b) => a.version - b.version);
  if (versiones.length === 0) return [{ version: 1, publishedAt: null, content: textoVigente }];
  return conTextoDeTerminos(versiones, textoVigente, ahora);
}

/**
 * La versión de los términos que el checkout mostró y el comprador aceptó: un entero positivo
 * (`400 INVALID_TERMS_VERSION`) igual a la vigente (`409 TERMS_VERSION_CHANGED`, con la vigente en `details`).
 */
export function requireTermsVersion(valor, vigente) {
  if (!Number.isInteger(valor) || valor < 1)
    throw new DomainError(
      'validation',
      'INVALID_TERMS_VERSION',
      'No sabemos qué versión de los términos y condiciones aceptaste. Recarga la página y vuelve a aceptarlos.',
    );
  if (valor !== vigente)
    throw new DomainError(
      'conflict',
      'TERMS_VERSION_CHANGED',
      'Los términos y condiciones cambiaron. Revísalos y vuelve a aceptarlos para finalizar la compra.',
      { termsVersion: vigente },
    );
  return valor;
}
