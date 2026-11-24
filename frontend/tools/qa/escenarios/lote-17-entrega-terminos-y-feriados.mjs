// Escenarios del lote 17 (ADR-0021, entrega, términos y feriados): PBI-0177, la versión de los términos aceptada (el
// checkout la envía, el detalle del pedido del Admin la muestra y Contenido dice la vigente); PBI-0178, la primera fecha
// de entrega que configura la tienda (mínimo del campo del checkout y su mensaje); PBI-0183, la pantalla de los días no
// laborables del superadministrador. «Entregas y feriados» no existe antes del lote: esos escenarios se toman solo
// después (`node tools/qa/capturas.mjs <este archivo> despues entregas-superadmin-b`).
//
// Datos: la copia de las capturas, creada desde la semilla (`backend/data-capturas.json`) y preparada una vez con
// `preparar-datos.mjs` (un pedido de invitado, anterior al lote: sin versión de los términos). Ningún escenario guarda:
// el Admin corta los guardados con `sinGuardar` y el checkout no se envía al BFF (su respuesta se simula en la toma).
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

/** El checkout responde que los términos cambiaron mientras el comprador llenaba el formulario. */
const conTerminosCambiados = async (page) => {
  await conCarrito(page);
  await page.route('**/checkout/orders', (route) =>
    route.fulfill({
      status: 409,
      json: {
        message:
          'Los términos y condiciones cambiaron. Revísalos y vuelve a aceptarlos para finalizar la compra.',
        error: {
          code: 'TERMS_VERSION_CHANGED',
          message:
            'Los términos y condiciones cambiaron. Revísalos y vuelve a aceptarlos para finalizar la compra.',
          details: { termsVersion: 2 },
        },
      },
    }),
  );
};

/** El checkout lleno: datos, entrega con su envío cotizado, pago y la casilla de términos. */
const llenarCheckout = async (page, fecha = '2030-01-15') => {
  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).fill('Cliente de captura');
  await page.getByRole('textbox', { name: 'Correo' }).fill('captura@example.com');
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('999888777');
  await page.getByRole('textbox', { name: 'DNI / documento' }).fill('12345678');
  await page.getByRole('combobox', { name: 'Distrito destino' }).click();
  await page.getByRole('option', { name: 'San Isidro' }).click();
  await page.getByRole('textbox', { name: 'Dirección' }).fill('Av. Captura 123');
  await page.getByRole('textbox', { name: 'Provincia' }).fill('Lima');
  await page.getByRole('textbox', { name: 'Departamento' }).fill('Lima');
  await page.getByText('Envío cotizado').waitFor();
  await page.getByRole('checkbox', { name: 'Acepto los términos y condiciones' }).check();
  // La fecha propuesta depende del día: se deja fija para que las dos tomas coincidan.
  await page.getByLabel('Fecha de entrega preferida').fill(fecha);
  await page.getByRole('heading', { level: 1 }).click();
};

/** Una fecha pasada: el campo muestra desde qué fecha se puede elegir. */
const fechaPasada = (page) => llenarCheckout(page, '2020-01-15');

/** Envía el checkout lleno; la respuesta la simula `conTerminosCambiados`. */
const enviarConTerminosCambiados = async (page) => {
  await llenarCheckout(page);
  await page.getByRole('button', { name: 'Finalizar compra' }).click();
  await page.getByRole('alert').filter({ hasText: 'términos' }).waitFor();
};

/** El snapshot con el pedido de la copia aceptado en la versión 2 de los términos, solo en la respuesta de la toma. */
const conVersionAceptada = async (page) => {
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
          termsAcceptedAt: '2026-11-23T15:04:09.000Z',
          termsVersion: 2,
        })),
      },
    });
  });
};

export const escenarios = {
  'tienda-checkout-b': {
    tienda: true,
    ruta: '/checkout',
    tema: 'b',
    antes: async (page) => {
      await conCarrito(page);
      await sinGuardar(page);
    },
    accion: llenarCheckout,
  },
  'tienda-checkout-c': {
    tienda: true,
    ruta: '/checkout',
    tema: 'c',
    antes: async (page) => {
      await conCarrito(page);
      await sinGuardar(page);
    },
    accion: llenarCheckout,
  },
  'tienda-checkout-fecha-pasada-b': {
    tienda: true,
    ruta: '/checkout',
    tema: 'b',
    antes: conCarrito,
    accion: fechaPasada,
  },
  'tienda-checkout-terminos-cambiados-b': {
    tienda: true,
    ruta: '/checkout',
    tema: 'b',
    antes: conTerminosCambiados,
    accion: enviarConTerminosCambiados,
  },
  'pedidos-superadmin-b': { ruta: '/pedidos', rol: 'superadmin', tema: 'b', antes: sinGuardar },
  'pedidos-superadmin-c': { ruta: '/pedidos', rol: 'superadmin', tema: 'c', antes: sinGuardar },
  'pedidos-version-superadmin-b': {
    ruta: '/pedidos',
    rol: 'superadmin',
    tema: 'b',
    antes: conVersionAceptada,
  },
  'contenido-superadmin-b': { ruta: '/contenido', rol: 'superadmin', tema: 'b', antes: sinGuardar },
  'contenido-superadmin-c': { ruta: '/contenido', rol: 'superadmin', tema: 'c', antes: sinGuardar },
  // Solo después: la página nueva.
  'entregas-superadmin-b': { ruta: '/entregas', rol: 'superadmin', tema: 'b', antes: sinGuardar },
  'entregas-superadmin-c': { ruta: '/entregas', rol: 'superadmin', tema: 'c', antes: sinGuardar },
};
