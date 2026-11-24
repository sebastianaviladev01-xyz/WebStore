// Escenarios del lote 24 (ADR-0025): PBI-0214, la imagen principal del producto y las imágenes del banner se cargan como
// archivo, con una vista previa de la actual y la opción de reemplazarla (antes eran campos de texto con la URL);
// PBI-0221, el registro del banner con nombres y ayudas claras, el fondo de los controles del carrusel calculado al
// cargar la foto y la vigencia con fecha y hora de Lima. El inicio de la tienda, con A, B y C, no debe cambiar con los
// banners de ejemplo, ni la lista de Banners.
//
// Datos: la copia de las capturas (`backend/data-capturas.json`), creada desde la semilla y preparada con
// `preparar-datos.mjs`. Ningún escenario guarda.
import { sinGuardar } from '../lib/qa.mjs';

/** El carrusel cambia de banner cada 8 s: se anula para que las dos tomas muestren el mismo. */
const quieto = async (page) => {
  await page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 ? 0 : original(manejador, plazo, ...resto);
  });
};

const pagina = (ruta) => ({ ruta, rol: 'superadmin', tema: 'b', antes: sinGuardar });

const tienda = {};
for (const tema of ['a', 'b', 'c'])
  tienda[`tienda-inicio-${tema}`] = { tienda: true, ruta: '/', tema, antes: quieto };

export const escenarios = {
  'nuevo-producto': pagina('/productos/nuevo'),
  'editar-producto': pagina('/productos/p-001'),
  banners: pagina('/banners'),
  'nuevo-banner': pagina('/banners/nuevo'),
  'editar-banner': pagina('/banners/bn-1'),
  ...tienda,
};
