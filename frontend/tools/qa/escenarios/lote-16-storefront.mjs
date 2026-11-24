// Escenarios del lote 16 (ADR-0021, Storefront): PBI-0180, textos de verificar la cuenta y de recuperar la contraseña;
// PBI-0181, rango de precio del catálogo; PBI-0190, «Finalizar compra» al final del checkout; PBI-0191, el buscador
// conserva su relleno al enfocarlo; PBI-0193, sin `/inicio-anterior`; PBI-0179, los sugeridos en el diálogo o en un
// panel lateral, según la configuración de la tienda.
//
// Datos: la copia de las capturas, creada desde la semilla (`backend/data-capturas.json`). Ningún escenario guarda: el
// reenvío del código y la recuperación se piden para un correo que no tiene cuenta, y la opción del panel lateral se
// cambia solo en la respuesta de `/content/settings` de la toma.
import { pulsar, sinGuardar } from '../lib/qa.mjs';

const CORREO_SIN_CUENTA = 'capturas-lote16@example.com';

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

/** La configuración de la tienda con los sugeridos en un panel lateral, solo en la respuesta de la toma. */
const conPanelLateral = async (page) => {
  await quieto(page);
  await page.route('**/content/settings', async (route) => {
    const respuesta = await route.fetch();
    const ajustes = await respuesta.json();
    await route.fulfill({ response: respuesta, json: { ...ajustes, addToCartDisplay: 'side-panel' } });
  });
};

const visible = (localizador) => localizador.filter({ visible: true }).first();

/** Agrega el primer producto del catálogo (el televisor, con la barra de sonido como sugerida). */
const agregarPrimero = async (page) => {
  await visible(page.getByRole('button', { name: 'Agregar al carrito' })).click();
  await page.getByRole('dialog').waitFor();
};

/** El checkout lleno: datos, entrega con su envío cotizado, pago y la casilla de términos. */
const llenarCheckout = async (page) => {
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
  await page.getByLabel('Fecha de entrega preferida').fill('2030-01-15');
  await page.getByRole('heading', { level: 1 }).click();
};

/** Escribe en el buscador de la cabecera que se ve en ese ancho, y lo deja enfocado. */
const escribirEnElBuscador = async (page) => {
  const buscador = visible(page.getByRole('banner').getByRole('searchbox', { name: 'Buscar productos' }));
  await buscador.fill('oled');
  await buscador.focus();
};

/** Pide un código nuevo para un correo sin cuenta: el BFF responde igual y no guarda nada. */
const reenviarCodigo = async (page) => {
  await page.getByRole('button', { name: 'Enviar un código nuevo' }).click();
  await page.getByRole('status').waitFor();
};

const pedirCodigoDeRecuperacion = async (page) => {
  await page.getByRole('textbox', { name: 'Correo' }).fill(CORREO_SIN_CUENTA);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  await page.getByRole('status').waitFor();
};

export const escenarios = {
  'tienda-verificar-b': {
    tienda: true,
    ruta: `/cuenta/verificar?email=${CORREO_SIN_CUENTA}`,
    tema: 'b',
    antes: quieto,
    accion: reenviarCodigo,
  },
  'tienda-verificar-c': {
    tienda: true,
    ruta: `/cuenta/verificar?email=${CORREO_SIN_CUENTA}`,
    tema: 'c',
    antes: quieto,
    accion: reenviarCodigo,
  },
  'tienda-recuperar-b': {
    tienda: true,
    ruta: '/cuenta/recuperar',
    tema: 'b',
    antes: quieto,
    accion: pedirCodigoDeRecuperacion,
  },
  'tienda-catalogo-b': { tienda: true, ruta: '/catalogo', tema: 'b', antes: quieto },
  'tienda-catalogo-c': { tienda: true, ruta: '/catalogo', tema: 'c', antes: quieto },
  // `precio` es el tope anterior; desde el lote se lee como el precio máximo, así que la URL sirve en las dos tomas.
  'tienda-catalogo-precio-b': { tienda: true, ruta: '/catalogo?precio=2000', tema: 'b', antes: quieto },
  'tienda-catalogo-filtros-movil-b': {
    tienda: true,
    ruta: '/catalogo?precio=2000',
    tema: 'b',
    antes: quieto,
    accion: pulsar('Filtros'),
    soloMovil: true,
  },
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
  'tienda-buscador-enfocado-b': {
    tienda: true,
    ruta: '/',
    tema: 'b',
    antes: quieto,
    accion: escribirEnElBuscador,
  },
  'tienda-buscador-enfocado-c': {
    tienda: true,
    ruta: '/',
    tema: 'c',
    antes: quieto,
    accion: escribirEnElBuscador,
  },
  'tienda-inicio-b': { tienda: true, ruta: '/', tema: 'b', antes: quieto },
  'tienda-inicio-anterior-b': { tienda: true, ruta: '/inicio-anterior', tema: 'b', antes: quieto },
  'tienda-agregado-dialogo-b': {
    tienda: true,
    ruta: '/catalogo',
    tema: 'b',
    antes: quieto,
    accion: agregarPrimero,
  },
  'tienda-agregado-dialogo-c': {
    tienda: true,
    ruta: '/catalogo',
    tema: 'c',
    antes: quieto,
    accion: agregarPrimero,
  },
  'tienda-agregado-panel-b': {
    tienda: true,
    ruta: '/catalogo',
    tema: 'b',
    antes: conPanelLateral,
    accion: agregarPrimero,
  },
  'tienda-agregado-panel-c': {
    tienda: true,
    ruta: '/catalogo',
    tema: 'c',
    antes: conPanelLateral,
    accion: agregarPrimero,
  },
  'contenido-superadmin-b': { ruta: '/contenido', rol: 'superadmin', tema: 'b' },
  'contenido-superadmin-c': { ruta: '/contenido', rol: 'superadmin', tema: 'c' },
};
