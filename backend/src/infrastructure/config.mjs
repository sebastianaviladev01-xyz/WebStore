import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** data.json vive en la raíz de backend/ y no se versiona. */
const DEFAULT_DATA_FILE = fileURLToPath(new URL('../../data.json', import.meta.url));

const csvSet = (value) =>
  new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

/** Solo `true`, sin distinguir mayúsculas ni espacios en los extremos, enciende una opción. */
const isTrue = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase() === 'true';
const isFalse = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase() === 'false';

/** Lee la configuración del BFF desde las variables de entorno. */
export function readConfig(env) {
  // Modo demo (D4, ADR-0012): solo `true`. Cualquier otro valor, o ninguno, lo deja apagado, también fuera de
  // producción.
  const demoMode = isTrue(env.WEBSTORE_DEMO_MODE);
  return {
    dataFile: env.WEBSTORE_DATA_FILE ? resolve(env.WEBSTORE_DATA_FILE) : DEFAULT_DATA_FILE,
    port: Number(env.PORT ?? 3000),
    // Los códigos temporales solo viajan en la respuesta si se piden con `WEBSTORE_EXPOSE_TEST_CODES=true` o en
    // modo demo (salvo `WEBSTORE_EXPOSE_TEST_CODES=false`). Por defecto, no (PBI-0091).
    exposeTestCodes:
      isTrue(env.WEBSTORE_EXPOSE_TEST_CODES) || (demoMode && !isFalse(env.WEBSTORE_EXPOSE_TEST_CODES)),
    // `POST /admin/reset` solo en modo demo o con `WEBSTORE_ALLOW_STORE_RESET=true` para pruebas (PBI-0090).
    allowStoreReset: demoMode || isTrue(env.WEBSTORE_ALLOW_STORE_RESET),
    nonWorkingDates: csvSet(env.WEBSTORE_NON_WORKING_DATES ?? ''),
    allowedOrigins: csvSet(env.WEBSTORE_ALLOWED_ORIGINS ?? 'http://localhost:4200,http://localhost:4300'),
    demoMode,
    // Contraseñas de las cuentas demo por rol, usadas al crear o migrar sus credenciales.
    demoPasswords: {
      superadmin: env.WEBSTORE_OWNER_PASSWORD ?? 'WebStore#2026',
      admin: env.WEBSTORE_ADMIN_PASSWORD ?? 'Admin#2026',
      vendedor: env.WEBSTORE_CATALOG_PASSWORD ?? 'Catalogo#2026',
    },
  };
}

/**
 * Aviso del calendario de días no laborables (PBI-0010; provisional, por confirmar con Daniel): la lista de
 * `WEBSTORE_NON_WORKING_DATES` es la única fuente de feriados y hay que renovarla cada año. Devuelve el texto del
 * aviso si no trae ninguna fecha `AAAA-MM-DD` de `year`, o `null` si la trae.
 */
export function avisoDeFeriados(nonWorkingDates, year) {
  const delAnio = (fecha) => fecha.startsWith(`${year}-`) && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fecha);
  if ([...nonWorkingDates].some(delAnio)) return null;
  return `Aviso: WEBSTORE_NON_WORKING_DATES no tiene ninguna fecha de ${year}. El plazo de los reclamos solo excluye sábados y domingos; agrega los feriados nacionales de Perú de ${year} (AAAA-MM-DD, separados por coma).`;
}
