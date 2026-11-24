// Escenarios del lote 15 (ADR-0021, Contenido): PBI-0169, varios correos, teléfonos y redes; PBI-0175, la barra
// superior muestra los avisos de Contenido; PBI-0182, aviso de mantenimiento si el contenido nunca llegó; PBI-0185, el
// pie sale de los accesos inferiores de Contenido.
//
// Datos: la copia de las capturas, creada desde la semilla (`backend/data-capturas.json`). Con la semilla, la cabecera,
// el pie y Contacto deben verse como antes del lote. «Varios» cambia la respuesta de `/content/settings` solo en la
// toma, con dos avisos, dos correos, dos teléfonos y dos redes: antes del lote, la tienda ignora esos campos.
import { pulsar } from '../lib/qa.mjs';

/** El carrusel de banners cambia cada 8 s y los avisos cada 6 s: se anulan, y las secciones aparecen sin animar. */
const quieto = async (page) => {
  await page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 || plazo === 6000 ? 0 : original(manejador, plazo, ...resto);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
};

/** La tienda con varios avisos, correos, teléfonos y redes, cambiando solo la respuesta de la toma. */
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
        contactEmails: [
          { value: 'contacto@webstore.demo', label: '' },
          { value: 'ventas@webstore.demo', label: 'Ventas' },
        ],
        contactPhones: [
          { value: '+51 999 000 000', label: '' },
          { value: '+51 1 555 0000', label: 'Soporte' },
        ],
        socialLinks: [
          { label: 'Instagram', url: 'https://www.instagram.com/webstore' },
          { label: 'Facebook', url: 'https://www.facebook.com/webstore' },
        ],
      },
    });
  });
};

/** El BFF no entrega el contenido: la tienda nunca lo recibe. */
const sinContenido = async (page) => {
  await quieto(page);
  await page.route('**/content/settings', (route) => route.fulfill({ status: 503, body: '{}' }));
};

export const escenarios = {
  'tienda-inicio-b': { tienda: true, ruta: '/', tema: 'b', antes: quieto },
  'tienda-inicio-c': { tienda: true, ruta: '/', tema: 'c', antes: quieto },
  'tienda-contacto-b': { tienda: true, ruta: '/info/contacto', tema: 'b', antes: quieto },
  'tienda-contacto-c': { tienda: true, ruta: '/info/contacto', tema: 'c', antes: quieto },
  'tienda-varios-b': { tienda: true, ruta: '/info/contacto', tema: 'b', antes: conVarios },
  'tienda-varios-c': { tienda: true, ruta: '/info/contacto', tema: 'c', antes: conVarios },
  'tienda-bff-caido-b': { tienda: true, ruta: '/', tema: 'b', antes: sinContenido },
  'tienda-bff-caido-c': { tienda: true, ruta: '/', tema: 'c', antes: sinContenido },
  'tienda-menu-b': {
    tienda: true,
    ruta: '/',
    tema: 'b',
    antes: quieto,
    accion: pulsar('Abrir menú de navegación'),
    soloMovil: true,
  },
  'contenido-superadmin-b': { ruta: '/contenido', rol: 'superadmin', tema: 'b' },
  'contenido-superadmin-c': { ruta: '/contenido', rol: 'superadmin', tema: 'c' },
};
