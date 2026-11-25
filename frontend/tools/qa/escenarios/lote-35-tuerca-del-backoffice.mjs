// Escenarios del lote 35 (ADR-0029): PBI-0249, el contenido del Admin reserva al final el espacio de la tuerca del modo
// demo. Las páginas con listas largas del Admin, con B y C (cookie de la vista previa), a 1440 y 375 px, en dos modos:
//   - `demo`: el BFF en modo demo, con la tuerca. Se espera, como única diferencia, el espacio reservado al final.
//   - `sin-demo`: la misma página con `demoMode: false` en `/bff/appearance` (igual que `sinModoDemo` de las e2e): sin
//     tuerca, y se esperan 0 diferencias. La respuesta real sigue trayendo la vista previa, así B y C se ven igual.
//
// Datos: una copia creada desde la semilla, en modo demo (`WEBSTORE_DEMO_MODE=true`), sin cambios entre las dos tomas.
// Ningún escenario guarda.
import { sinGuardar } from '../lib/qa.mjs';

/** Sirve la respuesta real de `/bff/appearance` con `demoMode: false`. */
const sinModoDemo = (page) =>
  page.route(
    (url) => url.pathname === '/bff/appearance',
    async (ruta) => {
      const respuesta = await ruta.fetch();
      await ruta.fulfill({ response: respuesta, json: { ...(await respuesta.json()), demoMode: false } });
    },
  );

const paginas = {
  dashboard: '/',
  productos: '/productos',
  inventario: '/inventario',
  categorias: '/categorias',
  marcas: '/marcas',
  pedidos: '/pedidos',
  clientes: '/clientes',
  banners: '/banners',
  contenido: '/contenido',
  usuarios: '/usuarios',
  temas: '/temas',
  envios: '/envios',
};

export const escenarios = {};
for (const tema of ['b', 'c']) {
  for (const [nombre, ruta] of Object.entries(paginas)) {
    escenarios[`demo-${nombre}-${tema}`] = { ruta, rol: 'superadmin', tema, antes: sinGuardar };
    escenarios[`sin-demo-${nombre}-${tema}`] = {
      ruta,
      rol: 'superadmin',
      tema,
      antes: async (page) => {
        await sinGuardar(page);
        await sinModoDemo(page);
      },
    };
  }
}
