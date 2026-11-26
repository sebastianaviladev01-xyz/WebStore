// Escenarios del lote 40 (ADR-0032): PBI-0256, el registro del producto avisa si no pudo traer los datos, y PBI-0257,
// el acceso avisa si no pudo comprobar la sesión guardada. Con B y C (cookie de la vista previa), a 1440 y 375 px:
//   - `registro-producto-*` y `acceso-*`: el estado normal, sin fallos. Antes y después deben dar 0 diferencias.
//   - `registro-producto-sin-datos-*` y `acceso-sin-comprobar-*`: los estados nuevos, solo en «después»; se revisan a
//     ojo. Simulan el fallo con un `503` en la consulta del snapshot o de la sesión.
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

export const escenarios = {};
for (const tema of ['b', 'c']) {
  escenarios[`registro-producto-${tema}`] = {
    ruta: '/productos/p-002',
    rol: 'superadmin',
    tema,
    antes: sinGuardar,
  };
  escenarios[`acceso-${tema}`] = { ruta: '/login', tema };
  escenarios[`registro-producto-sin-datos-${tema}`] = {
    ruta: '/productos/p-002',
    rol: 'superadmin',
    tema,
    antes: async (page) => {
      await sinGuardar(page);
      await caido('**/bff/admin/snapshot')(page);
    },
  };
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
