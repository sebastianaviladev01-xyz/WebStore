// Escenarios del lote 28 (ADR-0027): PBI-0240, que el color secundario de los temas se note en la tienda y que el tema C
// lleve el negro de principal y el amarillo de secundario. Se toman los tres temas predefinidos (A, B y C, por la cookie
// de la vista previa del modo demo) en las páginas donde aparece el secundario: inicio, catálogo, ficha de producto y
// carrito, más el inicio con el puntero sobre una acción de la cabecera y el Admin en una pantalla con botones.
//
// Datos: la copia de las capturas, creada desde la semilla (`backend/data-capturas.json`), con el BFF en modo demo.
// Ningún escenario guarda. Las respuestas se cambian solo en la toma, como en el lote 14: una insignia «Oferta» en el
// primer producto con stock, un botón secundario en las promociones y dos unidades en el carrito, para que el
// secundario aparezca en la página.
import { BFF } from '../lib/qa.mjs';

const productos = await (await fetch(`${BFF}/bff/catalog/products`)).json();
const conStock = productos.find((producto) => producto.stock > 0);

/** El carrusel cambia de banner cada 8 s y los avisos cada 6 s: se anulan, y las secciones aparecen sin animar. */
const quieto = async (page) => {
  await page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 || plazo === 6000 ? 0 : original(manejador, plazo, ...resto);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
};

/** La tienda con el secundario a la vista: oferta en el primer producto, botones secundarios y el carrito con dos. */
const conSecundario = async (page) => {
  await quieto(page);
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

/** El puntero encima del enlace «Carrito» de la cabecera: su fondo con el puntero encima. */
const punteroEnCarrito = (page) =>
  page.getByRole('link', { name: 'Carrito' }).filter({ visible: true }).first().hover({ timeout: 3000 });

const escenariosPorTema = {};
for (const tema of ['a', 'b', 'c']) {
  Object.assign(escenariosPorTema, {
    [`tienda-inicio-${tema}`]: { tienda: true, ruta: '/', tema, antes: conSecundario },
    [`tienda-catalogo-${tema}`]: { tienda: true, ruta: '/catalogo', tema, antes: conSecundario },
    [`tienda-ficha-${tema}`]: {
      tienda: true,
      ruta: `/catalogo/${conStock.slug}`,
      tema,
      antes: conSecundario,
    },
    [`tienda-carrito-${tema}`]: { tienda: true, ruta: '/carrito', tema, antes: conSecundario },
    [`tienda-puntero-${tema}`]: {
      tienda: true,
      ruta: '/',
      tema,
      antes: conSecundario,
      accion: punteroEnCarrito,
    },
    [`admin-productos-${tema}`]: { ruta: '/productos', rol: 'superadmin', tema },
  });
}

export const escenarios = escenariosPorTema;
