// Escenarios del lote 14 (ADR-0021): PBI-0188, la tuerca sale de la tienda y la del Admin en modo demo ofrece solo
// A, B y C; PBI-0189, el color secundario se ve como tal donde se aplica (insignia de oferta, contador del carrito,
// botón secundario de los banners, vista previa del editor y gráfico del Dashboard).
//
// Datos: la copia de las capturas, preparada una vez con `preparar-datos.mjs` y con un tema propio «Ámbar de prueba»
// (la base de B con el secundario #FFB300) creado y activado por la API antes de la primera toma. A, B y C se ven por la
// cookie de la vista previa del modo demo; el ámbar, por ser el activo (antes del lote, también por la cookie).
// Las respuestas se cambian solo en la toma: una insignia «Oferta» en el primer producto, un botón secundario en las
// promociones y un producto en el carrito, para que el secundario aparezca en la página.
import { BFF, pulsar } from '../lib/qa.mjs';

const AMBAR = process.env.QA_TEMA_AMBAR ?? 'ambar';

/** El carrusel cambia de banner cada 8 s y las secciones aparecen al desplazarse: se anulan las dos cosas. */
const quieto = async (page) => {
  await page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 ? 0 : original(manejador, plazo, ...resto);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
};

/** La tienda con el secundario a la vista: oferta en el primer producto, botones secundarios y el carrito con uno. */
const conSecundario = async (page) => {
  await quieto(page);
  const productos = await (await fetch(`${BFF}/bff/catalog/products`)).json();
  const conStock = productos.find((producto) => producto.stock > 0);
  await page.addInitScript(
    (id) => localStorage.setItem('webstore-cart-v1', JSON.stringify([{ productId: id, quantity: 2 }])),
    conStock.id,
  );
  await page.route('**/catalog/products', async (route) => {
    const respuesta = await route.fetch();
    const lista = await respuesta.json();
    await route.fulfill({
      response: respuesta,
      json: lista.map((producto) =>
        producto.id === conStock.id ? { ...producto, badge: 'Oferta' } : producto,
      ),
    });
  });
  await page.route('**/content/banners', async (route) => {
    const respuesta = await route.fetch();
    const banners = await respuesta.json();
    await route.fulfill({
      response: respuesta,
      json: banners.map((banner) =>
        banner.placement === 'hero'
          ? banner
          : { ...banner, secondaryCtaLabel: 'Ver ofertas', secondaryCtaUrl: '/catalogo' },
      ),
    });
  });
};

const tienda = {};
for (const tema of ['a', 'b', 'c', AMBAR]) {
  const nombre = tema === AMBAR ? 'ambar' : tema;
  tienda[`tienda-inicio-${nombre}`] = { tienda: true, ruta: '/', tema, antes: conSecundario };
  tienda[`tienda-catalogo-${nombre}`] = { tienda: true, ruta: '/catalogo', tema, antes: conSecundario };
}

export const escenarios = {
  ...tienda,
  'temas-superadmin': { ruta: '/temas', rol: 'superadmin', tema: 'b' },
  'temas-editar-ambar': {
    ruta: '/temas',
    rol: 'superadmin',
    tema: 'b',
    accion: pulsar('Editar Ámbar de prueba'),
  },
  'tuerca-admin': { ruta: '/', rol: 'superadmin', tema: 'b', accion: pulsar('Cambiar tema') },
  'dashboard-ambar': { ruta: '/', rol: 'superadmin', tema: AMBAR },
};
