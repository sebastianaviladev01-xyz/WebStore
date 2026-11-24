import type { ConfiguracionTienda } from './contenido.model';

/** El día de Lima, `DD/MM/AAAA`: la tienda opera en Lima (como la fecha de entrega, `fecha-entrega.rules.ts`). */
const FECHA_DE_LIMA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Lo que dice la página de Términos de la versión vigente (lote 20, ADR-0021; hallazgo del lote 17, PBI-0177): el
 * comprador acepta en el checkout ese número, así que lo ve. «Versión N · publicada el DD/MM/AAAA» con la fecha de
 * Lima; sin fecha (la versión anterior al registro de versiones) o con una que no se entiende, «Versión N». Sin una
 * versión válida (el contenido de respaldo, mientras no llega el del BFF), `null`: la página no dice nada.
 */
export function versionDeLosTerminos(
  configuracion: Partial<Pick<ConfiguracionTienda, 'termsVersion' | 'termsPublishedAt'>>,
): string | null {
  const { termsVersion, termsPublishedAt } = configuracion;
  if (typeof termsVersion !== 'number' || !Number.isInteger(termsVersion) || termsVersion < 1) return null;
  const publicada = termsPublishedAt ? new Date(termsPublishedAt) : null;
  if (!publicada || Number.isNaN(publicada.getTime())) return `Versión ${termsVersion}`;
  return `Versión ${termsVersion} · publicada el ${FECHA_DE_LIMA.format(publicada)}`;
}
