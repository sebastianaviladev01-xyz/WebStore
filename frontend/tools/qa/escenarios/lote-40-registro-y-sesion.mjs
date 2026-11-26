// Escenarios del lote 40 (ADR-0032): PBI-0256, los registros del producto, la categoría, el usuario y el banner avisan
// si no pudieron traer los datos, y PBI-0257, el acceso avisa si no pudo comprobar la sesión guardada. Con B y C
// (cookie de la vista previa), a 1440 y 375 px:
//   - `registro-<registro>-*` y `acceso-*`: el estado normal, sin fallos. Antes y después deben dar 0 diferencias.
//   - `registro-<registro>-sin-datos-*` y `acceso-sin-comprobar-*`: los estados nuevos, solo en «después»; se revisan
//     a ojo. Simulan el fallo con un `503` en la consulta del snapshot o de la sesión.
//
// Datos: una copia creada desde la semilla, en modo demo (`WEBSTORE_DEMO_MODE=true`), sin cambios entre las dos tomas.
// Ningún escenario guarda.
import { sinGuardar } from '../lib/qa.mjs';

/** Responde `503` a las lecturas de `ruta` del BFF, como un fallo pasajero del servidor. */
const caido = (ruta) => (page) =>
  page.route(ruta, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"UNAVAILABLE"}' })
      : route.fallback(),
  );

/** Registros con interfaz de edición, con un registro de la semilla. */
const registros = {
  producto: '/productos/p-002',
  categoria: '/categorias/cat-home',
  usuario: '/usuarios/u-2',
  banner: '/banners/bn-1',
};

export const escenarios = {};
for (const tema of ['b', 'c']) {
  for (const [registro, ruta] of Object.entries(registros)) {
    escenarios[`registro-${registro}-${tema}`] = { ruta, rol: 'superadmin', tema, antes: sinGuardar };
    escenarios[`registro-${registro}-sin-datos-${tema}`] = {
      ruta,
      rol: 'superadmin',
      tema,
      antes: async (page) => {
        await sinGuardar(page);
        await caido('**/bff/admin/snapshot')(page);
      },
    };
  }
  escenarios[`acceso-${tema}`] = { ruta: '/login', tema };
  escenarios[`acceso-sin-comprobar-${tema}`] = {
    ruta: '/productos',
    rol: 'superadmin',
    tema,
    antes: async (page) => {
      await sinGuardar(page);
      await caido('**/bff/admin/sessions/current')(page);
    },
  };
}
