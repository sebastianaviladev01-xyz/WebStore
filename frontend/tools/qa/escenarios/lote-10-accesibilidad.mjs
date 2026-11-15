// Escenarios del lote 10 (PBI-0166): el velo `--ws-scrim` sube del 45 % al 55 %. Cubre las páginas con texto sobre
// fotos (inicio con banners y /inicio-anterior) y las dos pantallas que usan el velo (`bg-scrim`: el cajón de
// navegación de la tienda y el del Admin, solo en celular), con A, B y C.
import { pulsar } from '../lib/qa.mjs';

/** El carrusel del inicio cambia de banner cada 8 s: se anula ese temporizador para que las dos tomas vean el primero. */
const sinRotar = (page) =>
  page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 ? 0 : original(manejador, plazo, ...resto);
  });

const TEMAS = ['a', 'b', 'c'];
export const escenarios = {};

for (const tema of TEMAS) {
  escenarios[`tienda-inicio-${tema}`] = { tienda: true, ruta: '/', tema, antes: sinRotar };
  escenarios[`tienda-inicio-anterior-${tema}`] = {
    tienda: true,
    ruta: '/inicio-anterior',
    tema,
    antes: sinRotar,
  };
  escenarios[`tienda-menu-${tema}`] = {
    tienda: true,
    ruta: '/',
    tema,
    accion: pulsar('Abrir menú de navegación'),
    soloMovil: true,
  };
  escenarios[`admin-menu-${tema}`] = {
    ruta: '/',
    rol: 'superadmin',
    tema,
    accion: pulsar('Abrir el menú'),
    soloMovil: true,
  };
}
