// Escenarios del lote 30 (ADR-0027, PBI-0244): cada aviso de la barra superior lleva un «Desde» y un «Hasta»
// opcionales, en hora de Lima. La tienda solo muestra los vigentes y Contenido del backoffice marca cada aviso como
// programado, vigente o vencido.
//
// Datos: la copia de las capturas, creada desde la semilla (`backend/data-capturas.json`). La semilla trae un aviso sin
// fechas, que se muestra siempre: la barra superior de la tienda debe verse igual antes y después del lote. «Varios»
// cambia la respuesta de `/content/settings` solo en la toma, con dos avisos sin fechas, para ver los controles de la
// barra. En Contenido, lo esperado es la diferencia de los campos «Desde» y «Hasta» y del estado de cada aviso.
import { sinGuardar } from '../lib/qa.mjs';

/** El carrusel de banners cambia cada 8 s y los avisos cada 6 s: se anulan, y las secciones aparecen sin animar. */
const quieto = async (page) => {
  await page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 || plazo === 6000 ? 0 : original(manejador, plazo, ...resto);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
};

/** La tienda con dos avisos sin fechas, cambiando solo la respuesta de la toma. */
const conVarios = async (page) => {
  await quieto(page);
  await page.route('**/content/settings', async (route) => {
    const respuesta = await route.fetch();
    const ajustes = await respuesta.json();
    await route.fulfill({
      response: respuesta,
      json: {
        ...ajustes,
        announcements: [
          { text: 'Despachos en Lima. Consulta cobertura y tarifas.', url: '/info/envios' },
          { text: 'Mantenimiento programado el domingo de 2 a 4 a. m.', url: '' },
        ],
      },
    });
  });
};

export const escenarios = {
  'tienda-inicio-b': { tienda: true, ruta: '/', tema: 'b', antes: quieto },
  'tienda-varios-b': { tienda: true, ruta: '/info/contacto', tema: 'b', antes: conVarios },
  'contenido-superadmin-b': { ruta: '/contenido', rol: 'superadmin', tema: 'b', antes: sinGuardar },
};
