// Escenarios del lote 19 (ADR-0021, comparador y direcciones): PBI-0001, «Comparar» en la tarjeta del catálogo y en
// la ficha, y la página `/comparar`; PBI-0006, una dirección por pedido o una por producto (la opción en «Entregas y
// feriados», el checkout en cada modo y la dirección de cada línea en el detalle del pedido del Admin y de la tienda).
// `/comparar` y lo que solo existe con «una por producto» no existen antes del lote: esos escenarios se toman solo
// después (`node tools/qa/capturas.mjs <este archivo> despues tienda-comparar-b`).
//
// Datos: la copia de las capturas, creada desde la semilla (`backend/data-capturas.json`) y preparada una vez con
// `preparar-datos.mjs`, que imprime el pedido de invitado: su `id` y su `accessToken` llegan por `QA_PEDIDO_ID` y
// `QA_PEDIDO_TOKEN`. Ningún escenario guarda: el Admin corta los guardados con `sinGuardar`, el checkout no se envía y
// el modo «una por producto» y las direcciones de las líneas se simulan solo en la respuesta de la toma.
import { sinGuardar } from '../lib/qa.mjs';

const PEDIDO_ID = process.env.QA_PEDIDO_ID ?? '';
const PEDIDO_TOKEN = process.env.QA_PEDIDO_TOKEN ?? '';

/** El carrusel de banners cambia cada 8 s y los avisos cada 6 s: se anulan, y las secciones aparecen sin animar. */
const quieto = async (page) => {
  await page.addInitScript(() => {
    const original = window.setInterval.bind(window);
    window.setInterval = (manejador, plazo, ...resto) =>
      plazo === 8000 || plazo === 6000 ? 0 : original(manejador, plazo, ...resto);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
};

/** Un televisor y una barra de sonido en el carrito, guardados como los guarda la tienda. */
const conCarrito = async (page) => {
  await quieto(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'webstore-cart-v1',
      JSON.stringify([
        { productId: 'p-001', quantity: 1 },
        { productId: 'p-004', quantity: 2 },
      ]),
    );
  });
};

/** La tienda en «una dirección por producto», solo en la respuesta de `/content/settings` de la toma. */
const porProducto = async (page) => {
  await page.route('**/content/settings', async (route) => {
    const respuesta = await route.fetch();
    const ajustes = await respuesta.json();
    await route.fulfill({ response: respuesta, json: { ...ajustes, deliveryAddressMode: 'per-product' } });
  });
};

/** El checkout lleno: datos, entrega con su envío cotizado, pago y la casilla de términos. */
const llenarCheckout = async (page) => {
  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).fill('Cliente de captura');
  await page.getByRole('textbox', { name: 'Correo' }).fill('captura@example.com');
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('999888777');
  await page.getByRole('textbox', { name: 'DNI / documento' }).fill('12345678');
  await page.getByRole('combobox', { name: 'Distrito destino' }).click();
  await page.getByRole('option', { name: 'San Isidro' }).click();
  await page.getByRole('textbox', { name: 'Dirección' }).first().fill('Av. Captura 123');
  await page.getByRole('textbox', { name: 'Provincia' }).first().fill('Lima');
  await page.getByRole('textbox', { name: 'Departamento' }).first().fill('Lima');
  await page.getByText('Envío cotizado').waitFor();
  await page.getByRole('checkbox', { name: 'Acepto los términos y condiciones' }).check();
  // La fecha propuesta depende del día: se deja fija para que las dos tomas coincidan.
  await page.getByLabel('Fecha de entrega preferida').fill('2030-01-15');
  await page.getByRole('heading', { level: 1 }).click();
};

/** Con «una por producto», la barra de sonido va a otra dirección, en Miraflores. */
const llenarConOtraDireccion = async (page) => {
  await llenarCheckout(page);
  const linea = page.getByRole('group', { name: 'Soundbar Cinema 500' });
  await linea.getByRole('radio', { name: 'Otra dirección' }).check();
  await linea.getByRole('combobox', { name: 'Distrito' }).click();
  await page.getByRole('option', { name: 'Miraflores' }).click();
  await linea.getByRole('textbox', { name: 'Dirección' }).fill('Calle Regalo 456');
  await page.getByRole('heading', { level: 1 }).click();
};

/** La barra de sonido del pedido de la copia, con otra dirección, solo en la respuesta de la toma. */
const otraDireccion = {
  addressLine: 'Calle Regalo 456',
  district: 'Miraflores',
  province: 'Lima',
  department: 'Lima',
  reference: 'Portón verde',
};

/** El pedido de invitado de la copia en el dispositivo, como lo guarda la tienda (id → token). */
const conPedido = async (page) => {
  await quieto(page);
  await page.addInitScript(
    ([id, token]) => localStorage.setItem('webstore-order-access-v1', JSON.stringify({ [id]: token })),
    [PEDIDO_ID, PEDIDO_TOKEN],
  );
};

/** El pedido de la copia con su línea en otra dirección, solo en la respuesta de `GET /orders/:id`. */
const conPedidoPorProducto = async (page) => {
  await conPedido(page);
  await page.route(`**/bff/orders/${PEDIDO_ID}`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const respuesta = await route.fetch();
    const pedido = await respuesta.json();
    await route.fulfill({
      response: respuesta,
      json: {
        ...pedido,
        items: pedido.items.map((linea) => ({ ...linea, shipping: otraDireccion })),
        shippingCost: 24,
        total: pedido.subtotal + 24,
      },
    });
  });
};

/** Abre el pedido de la copia en el detalle del Admin. */
const abrirPedido = (page) => page.getByRole('button', { name: PEDIDO_ID }).first().click({ timeout: 3000 });

/** El snapshot con la línea del pedido de la copia en otra dirección, solo en la respuesta de la toma. */
const conPedidoPorProductoEnElAdmin = async (page) => {
  await sinGuardar(page);
  await page.route('**/bff/admin/snapshot', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const respuesta = await route.fetch();
    const snapshot = await respuesta.json();
    await route.fulfill({
      response: respuesta,
      json: {
        ...snapshot,
        orders: snapshot.orders.map((pedido) => ({
          ...pedido,
          items: pedido.items.map((linea) => ({
            ...linea,
            shipping: otraDireccion,
          })),
        })),
      },
    });
  });
};

/** Tres productos en el comparador, por la dirección que se puede compartir. */
const COMPARAR = '/comparar?ids=p-001,p-004,p-005';

export const escenarios = {
  // PBI-0001: la tarjeta y la ficha con «Comparar», y la página nueva (solo después).
  'tienda-catalogo-b': { tienda: true, ruta: '/catalogo', tema: 'b', antes: quieto },
  'tienda-catalogo-c': { tienda: true, ruta: '/catalogo', tema: 'c', antes: quieto },
  'tienda-ficha-b': { tienda: true, ruta: '/catalogo/oled-vision-55-4k', tema: 'b', antes: quieto },
  'tienda-comparar-b': { tienda: true, ruta: COMPARAR, tema: 'b', antes: quieto },
  'tienda-comparar-c': { tienda: true, ruta: COMPARAR, tema: 'c', antes: quieto },
  // PBI-0006: el checkout con «una por pedido» queda igual; con «una por producto» (solo después), otra dirección.
  'tienda-checkout-b': {
    tienda: true,
    ruta: '/checkout',
    tema: 'b',
    antes: conCarrito,
    accion: llenarCheckout,
  },
  'tienda-checkout-c': {
    tienda: true,
    ruta: '/checkout',
    tema: 'c',
    antes: conCarrito,
    accion: llenarCheckout,
  },
  'tienda-checkout-por-producto-b': {
    tienda: true,
    ruta: '/checkout',
    tema: 'b',
    antes: async (page) => {
      await conCarrito(page);
      await porProducto(page);
    },
    accion: llenarConOtraDireccion,
  },
  'tienda-checkout-por-producto-c': {
    tienda: true,
    ruta: '/checkout',
    tema: 'c',
    antes: async (page) => {
      await conCarrito(page);
      await porProducto(page);
    },
    accion: llenarConOtraDireccion,
  },
  'tienda-pedido-b': { tienda: true, ruta: `/pedidos/${PEDIDO_ID}`, tema: 'b', antes: conPedido },
  'tienda-pedido-por-producto-b': {
    tienda: true,
    ruta: `/pedidos/${PEDIDO_ID}`,
    tema: 'b',
    antes: conPedidoPorProducto,
  },
  'pedidos-superadmin-b': {
    ruta: '/pedidos',
    rol: 'superadmin',
    tema: 'b',
    antes: sinGuardar,
    accion: abrirPedido,
  },
  'pedidos-superadmin-c': {
    ruta: '/pedidos',
    rol: 'superadmin',
    tema: 'c',
    antes: sinGuardar,
    accion: abrirPedido,
  },
  'pedidos-por-producto-superadmin-b': {
    ruta: '/pedidos',
    rol: 'superadmin',
    tema: 'b',
    antes: conPedidoPorProductoEnElAdmin,
    accion: abrirPedido,
  },
  'entregas-superadmin-b': { ruta: '/entregas', rol: 'superadmin', tema: 'b', antes: sinGuardar },
  'entregas-superadmin-c': { ruta: '/entregas', rol: 'superadmin', tema: 'c', antes: sinGuardar },
};
