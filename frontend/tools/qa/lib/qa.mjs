// Ayudas de los guiones de QA visual con Playwright (PBI-0057). Los usan `capturas.mjs`, `comparar.mjs` y
// `preparar-datos.mjs`, y los archivos de escenarios (`tools/qa/escenarios/*.mjs`). Sin rutas ni datos de una máquina:
// las direcciones y las cuentas se leen del entorno y, si faltan, son las de desarrollo y las del BFF de prueba.
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const BFF = process.env.QA_BFF ?? 'http://localhost:3000';
export const ADMIN = process.env.QA_ADMIN ?? 'http://localhost:4300';
export const TIENDA = process.env.QA_TIENDA ?? 'http://localhost:4200';

/** Cuentas del Admin sembradas por el BFF de prueba (README): solo para uso local. */
export const CUENTAS = {
  superadmin: { email: 'owner@webstore.demo', password: 'WebStore#2026' },
  admin: { email: 'admin@webstore.demo', password: 'Admin#2026' },
  vendedor: { email: 'catalogo@webstore.demo', password: 'Catalogo#2026' },
};

/** Anchos de las capturas por omisión: escritorio y móvil. */
export const ANCHOS = [
  { width: 1440, height: 900 },
  { width: 375, height: 812 },
];

/** Clave de la sesión del Admin en `sessionStorage` y cookie de la vista previa de la tuerca del modo demo. */
const CLAVE_DE_SESION_ADMIN = 'webstore-admin-session-v1';
const COOKIE_DE_VISTA_PREVIA = 'ws_tema_vista_previa';

const json = (cuerpo, cabeceras = {}, metodo = 'POST') => ({
  method: metodo,
  headers: { 'content-type': 'application/json', ...cabeceras },
  body: JSON.stringify(cuerpo),
});

/** Carga un archivo de escenarios: exporta `escenarios` y, opcionalmente, `anchos`. */
export async function cargarEscenarios(ruta) {
  const modulo = await import(pathToFileURL(resolve(ruta)).href);
  if (!modulo.escenarios) throw new Error(`«${ruta}» no exporta \`escenarios\``);
  return { escenarios: modulo.escenarios, anchos: modulo.anchos ?? ANCHOS };
}

/** Carpeta de salida de una etapa (`antes` o `despues`), creada si falta. */
export async function carpetaDeSalida(raiz, etapa) {
  const carpeta = resolve(raiz, etapa);
  await mkdir(carpeta, { recursive: true });
  return carpeta;
}

/** Token del Admin de cada rol que usan los escenarios, obtenido por la API. */
export async function tokensDeAdmin() {
  const tokens = {};
  for (const [rol, cuenta] of Object.entries(CUENTAS)) {
    const respuesta = await fetch(`${BFF}/bff/admin/sessions`, json(cuenta));
    if (!respuesta.ok) throw new Error(`No se pudo iniciar sesión como ${rol}: ${respuesta.status}`);
    tokens[rol] = (await respuesta.json()).token;
  }
  return tokens;
}

/** Hace que la página arranque con la sesión del Admin de `token`. */
export const conSesion = (page, token) =>
  page.addInitScript(
    ([clave, valor]) => sessionStorage.setItem(clave, valor),
    [CLAVE_DE_SESION_ADMIN, token],
  );

/** Corta los guardados del Admin (todo lo que no sea una lectura): ningún escenario cambia datos. */
export const sinGuardar = (page) =>
  page.route('**/bff/admin/**', (ruta) =>
    ruta.request().method() === 'GET' ? ruta.fallback() : ruta.abort(),
  );

/** Acción de un escenario: pulsa el primer botón con ese nombre (texto o expresión regular). */
export const pulsar = (nombre) => (page) =>
  page.getByRole('button', { name: nombre }).first().click({ timeout: 3000 });

/** Cookie de la vista previa del modo demo: elige el tema (`a`, `b` o `c`) sin tocar el activo del BFF. */
export const cookieDeTema = (tema, url = TIENDA) => ({
  name: COOKIE_DE_VISTA_PREVIA,
  value: tema,
  domain: new URL(url).hostname,
  path: '/',
});

/**
 * Espera a que la página se asiente antes de capturar, en lugar de pausas fijas: la red en reposo, las fuentes, todas
 * las fotos cargadas y dos cuadros de pintura. Con las fotos sin terminar, el rasterizado cambia entre tomas y mete
 * ruido en la comparación (hasta 13 niveles en una foto del catálogo).
 */
export async function asentar(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(async () => {
    // Las fotos perezosas fuera de la ventana no cargarían nunca: se piden ya. Y nada espera más de 8 s.
    for (const foto of document.images) foto.loading = 'eager';
    const esperar = Promise.all([
      document.fonts.ready,
      ...[...document.images].map((foto) =>
        foto.complete ? null : new Promise((listo) => (foto.onload = foto.onerror = listo)),
      ),
      // Las animaciones sin fin (indicadores, carruseles) no terminan: solo se esperan las que acaban.
      ...document
        .getAnimations()
        .filter((animacion) => animacion.effect?.getComputedTiming().iterations !== Infinity)
        .map((animacion) => animacion.finished.catch(() => {})),
    ]);
    await Promise.race([esperar, new Promise((listo) => setTimeout(listo, 8000))]);
    await new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo)));
  });
}

/** Deja la página arriba y sin foco, como la dejaría una toma limpia. */
export const dejarLimpia = (page) =>
  page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });

/** Activa el tema `id` en el BFF por la API del Admin (hace falta el superadmin). Devuelve el tema activo anterior. */
export async function activarTema(token, id) {
  const cabeceras = { authorization: `Bearer ${token}` };
  const actual = await (await fetch(`${BFF}/bff/admin/themes`, { headers: cabeceras })).json();
  const respuesta = await fetch(
    `${BFF}/bff/admin/active-theme`,
    json({ revision: actual.revision, themeId: id }, cabeceras, 'PUT'),
  );
  if (!respuesta.ok) throw new Error(`No se pudo activar el tema «${id}»: ${respuesta.status}`);
  return actual.activeThemeId;
}

/**
 * Crea un pedido de invitado por la API pública y devuelve su `id` y su `accessToken` (cabecera `x-order-token`),
 * para capturar el detalle de un pedido sin cuenta. Cambia datos: úsalo solo sobre una copia (`WEBSTORE_DATA_FILE`).
 */
export async function crearPedidoDeInvitado() {
  // Lote 17 (PBI-0178 y PBI-0177): la primera fecha de entrega y la versión vigente de los términos, del BFF.
  const { minimum } = await (await fetch(`${BFF}/bff/checkout/delivery-dates`)).json();
  const { termsVersion } = await (await fetch(`${BFF}/bff/content/settings`)).json();
  const productos = await (await fetch(`${BFF}/bff/catalog/products`)).json();
  const respuesta = await fetch(
    `${BFF}/bff/checkout/orders`,
    json({
      customer: {
        fullName: 'Cliente de captura',
        email: 'captura@example.com',
        phone: '999888777',
        document: '12345678',
      },
      shipping: {
        addressLine: 'Av. Captura 123',
        district: 'Miraflores',
        province: 'Lima',
        department: 'Lima',
      },
      deliveryDate: minimum,
      paymentMethod: 'card',
      items: [{ productId: productos.find((producto) => producto.stock > 0).id, quantity: 1 }],
      termsAccepted: true,
      termsVersion,
    }),
  );
  if (!respuesta.ok) throw new Error(`No se pudo crear el pedido de invitado: ${respuesta.status}`);
  const pedido = await respuesta.json();
  return { id: pedido.id, accessToken: pedido.accessToken };
}

/**
 * Colores calculados (`getComputedStyle`) de un elemento, para medir contraste o confirmar un token sin mirar la
 * imagen. Devuelve `color` y `backgroundColor` del primer elemento que coincide con `selector`.
 */
export const medirColores = (page, selector) =>
  page
    .locator(selector)
    .first()
    .evaluate((elemento) => {
      const estilo = getComputedStyle(elemento);
      return {
        color: estilo.color,
        backgroundColor: estilo.backgroundColor,
        borderColor: estilo.borderTopColor,
      };
    });
