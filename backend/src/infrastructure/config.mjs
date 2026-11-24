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
    // Desde el lote 17 (PBI-0183), solo el calendario inicial de un estado sin lista: se edita en el Admin.
    nonWorkingDates: csvSet(env.WEBSTORE_NON_WORKING_DATES ?? ''),
    allowedOrigins: csvSet(env.WEBSTORE_ALLOWED_ORIGINS ?? 'http://localhost:4200,http://localhost:4300'),
    demoMode,
    // Recuadro de credenciales de prueba en el acceso del Admin (PBI-0071): en modo demo o con
    // `WEBSTORE_SHOW_TEST_CREDENTIALS=true`, que lo muestra sin encender la tuerca de temas (ADR-0020).
    showTestCredentials: demoMode || isTrue(env.WEBSTORE_SHOW_TEST_CREDENTIALS),
    // Contraseñas de las cuentas demo por rol, usadas al crear o migrar sus credenciales.
    demoPasswords: {
      superadmin: env.WEBSTORE_OWNER_PASSWORD ?? 'WebStore#2026',
      admin: env.WEBSTORE_ADMIN_PASSWORD ?? 'Admin#2026',
      vendedor: env.WEBSTORE_CATALOG_PASSWORD ?? 'Catalogo#2026',
    },
  };
}

/**
 * Aviso del calendario de días no laborables (PBI-0010; provisional, por confirmar con Daniel): hay que renovarlo cada
 * año. Desde el lote 17 (ADR-0021, PBI-0183) se mantiene en el Admin («Entregas y feriados») y vive en el estado del
 * BFF. Devuelve el texto del aviso si `fechas` no trae ninguna fecha `AAAA-MM-DD` de `year`, o `null` si la trae.
 */
export function avisoDeFeriados(fechas, year) {
  const delAnio = (fecha) => fecha.startsWith(`${year}-`) && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fecha);
  if ([...fechas].some(delAnio)) return null;
  return `Aviso: el calendario de días no laborables no tiene ninguna fecha de ${year}. El plazo de los reclamos y la primera fecha de entrega solo excluyen sábados y domingos; agrega los feriados de ${year} en el Admin, en Tienda › Entregas y feriados.`;
}

const UNA_HORA_MS = 60 * 60 * 1000;

/**
 * Vigía del calendario de feriados (PBI-0163): repite `avisoDeFeriados` cuando cambia el año de Lima con el BFF en
 * marcha, no solo al arrancar. `comprobar()` avisa una sola vez por año (la primera llamada cuenta como cambio);
 * `iniciar()` la repite cada `cada` milisegundos con un temporizador que no mantiene vivo el proceso, y `detener()`
 * lo cancela. `fechasNoLaborables` devuelve las fechas del calendario vigente (el del estado, que cambia desde el
 * Admin). `hoy`, `avisar`, `programar` y `cancelar` se inyectan para probarla sin reloj real.
 */
export function crearVigiaDeFeriados({
  fechasNoLaborables,
  hoy,
  avisar,
  cada = UNA_HORA_MS,
  programar = setInterval,
  cancelar = clearInterval,
}) {
  let ultimoAnio = null;
  let temporizador = null;
  const comprobar = () => {
    const anio = hoy().slice(0, 4);
    if (anio === ultimoAnio) return;
    ultimoAnio = anio;
    const aviso = avisoDeFeriados(fechasNoLaborables(), anio);
    if (aviso) avisar(aviso);
  };
  return {
    comprobar,
    iniciar() {
      if (temporizador) return;
      temporizador = programar(comprobar, cada);
      temporizador.unref?.();
    },
    detener() {
      if (temporizador) cancelar(temporizador);
      temporizador = null;
    },
  };
}
