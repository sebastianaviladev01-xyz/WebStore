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

/** Lee la configuración del BFF desde las variables de entorno. */
export function readConfig(env) {
  return {
    dataFile: env.WEBSTORE_DATA_FILE ? resolve(env.WEBSTORE_DATA_FILE) : DEFAULT_DATA_FILE,
    port: Number(env.PORT ?? 3000),
    // Los códigos temporales viajan en la respuesta fuera de producción, salvo que se desactive explícitamente.
    exposeTestCodes:
      env.WEBSTORE_EXPOSE_TEST_CODES === 'true' ||
      (env.NODE_ENV !== 'production' && env.WEBSTORE_EXPOSE_TEST_CODES !== 'false'),
    nonWorkingDates: csvSet(env.WEBSTORE_NON_WORKING_DATES ?? ''),
    allowedOrigins: csvSet(env.WEBSTORE_ALLOWED_ORIGINS ?? 'http://localhost:4200,http://localhost:4300'),
    // Contraseñas de las cuentas demo por rol, usadas al crear o migrar sus credenciales.
    demoPasswords: {
      superadmin: env.WEBSTORE_OWNER_PASSWORD ?? 'WebStore#2026',
      admin: env.WEBSTORE_ADMIN_PASSWORD ?? 'Admin#2026',
      vendedor: env.WEBSTORE_CATALOG_PASSWORD ?? 'Catalogo#2026',
    },
  };
}
