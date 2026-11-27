// Escenarios del lote 49 (ADR-0035): PBI-0241, el botón flotante de WhatsApp de la tienda y la sección «WhatsApp» de
// Contenido en el backoffice.
// La tienda se toma con un número configurado: la respuesta de `/content/settings` lleva `whatsappNumber` y
// `whatsappMessage` solo en la toma, con `page.route`, así la copia de datos no cambia y las dos tomas reciben lo mismo
// (antes del lote, la tienda ignora esos campos y no hay botón). Los elementos fijos se miran en las tomas de la ventana
// (`desplazamientos`), arriba y al final de la página.
// - inicio con A, B y C; ficha de un producto con stock (con la barra fija de «Agregar al carrito» a 375 px), con B;
// - el checkout con B, donde el botón no aparece: antes y después deben ser iguales;
// - Contenido del backoffice, con la sección nueva.
import { BFF, sinGuardar } from '../lib/qa.mjs';

const NUMERO = '51987654321';
const MENSAJE = 'Hola, tengo una consulta sobre un producto';

/** El carrusel cambia de banner cada 8 s: se anula, y se inyecta el número de WhatsApp en los ajustes públicos. */
const conWhatsapp = async (page) => {
  await page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 ? 0 : original(manejador, plazo, ...resto);
  });
  await page.route('**/content/settings', async (route) => {
    const respuesta = await route.fetch();
    const ajustes = await respuesta.json();
    await route.fulfill({
      response: respuesta,
      json: { ...ajustes, whatsappNumber: NUMERO, whatsappMessage: MENSAJE },
    });
  });
};

/** El checkout necesita algo en el carrito: un producto con stock, guardado como lo guarda la tienda. */
const conCarrito = (producto) => async (page) => {
  await conWhatsapp(page);
  await page.addInitScript((id) => {
    try {
      window.localStorage.setItem('webstore-cart-v1', JSON.stringify([{ productId: id, quantity: 1 }]));
    } catch {
      // Sin almacenamiento, el checkout sale vacío: la toma sigue sirviendo para ver que no hay botón.
    }
  }, producto.id);
};

const productos = await (await fetch(`${BFF}/bff/catalog/products`)).json();
const conStock = productos.find((producto) => producto.stock > 0);
const ficha = `/catalogo/${conStock.slug}`;
const desplazamientos = [0, 'final'];

const tienda = {};
for (const tema of ['a', 'b', 'c'])
  tienda[`tienda-inicio-${tema}`] = { tienda: true, ruta: '/', tema, antes: conWhatsapp, desplazamientos };

export const escenarios = {
  ...tienda,
  'tienda-ficha-b': { tienda: true, ruta: ficha, tema: 'b', antes: conWhatsapp, desplazamientos },
  'tienda-checkout-b': {
    tienda: true,
    ruta: '/checkout',
    tema: 'b',
    antes: conCarrito(conStock),
    desplazamientos,
  },
  // La página Contenido del backoffice, con la sección «WhatsApp». El guardado se corta.
  'contenido-superadmin-b': { ruta: '/contenido', rol: 'superadmin', tema: 'b', antes: sinGuardar },
};
