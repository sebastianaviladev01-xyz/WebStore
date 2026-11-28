import { expect, test, type Locator, type Page } from '@playwright/test';

import { enviarCambios, leerSnapshot } from './apoyo/catalogo';
import {
  TEMAS,
  activarTema,
  colorDelToken,
  enRgb,
  fondoDe,
  MINIMO,
  relacionDeContraste,
  restablecerTemas,
} from './apoyo/contraste';
import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Lote 50 (ADR-0037; decisiones de Sebastián Avila del 2026-11-27, fila «Lotes 50 a 56» de las decisiones pendientes):
 * - PBI-0277: los buscadores no indexan el backoffice (`<meta name="robots" content="noindex, nofollow">`); la tienda
 *   sigue indexable. La cabecera `X-Robots-Tag` de la demo publicada la prueban `tools/demo/cabeceras-demo.test.mjs`.
 * - PBI-0288: cada barra de «Distribución de ventas por categoría» lleva un color distinto de la serie fija del tema y
 *   de estado, en el mismo orden en cada carga; «Otras», el gris. Cada color da 3:1 o más contra la tarjeta con A, B y C.
 * - PBI-0289: el logo cargado con «Cargar logo» se guarda como las demás imágenes y la tienda lo recibe por dirección;
 *   el campo «URL/Data URL del logo» se queda y acepta una dirección escrita.
 * El pie de Usuarios sin las fichas por rol (PBI-0276) lo prueba `admin-listados-panel.spec.ts`.
 */

test.describe('PBI-0277: el backoffice no se indexa', () => {
  test('el backoffice lleva la etiqueta robots; la tienda no', async ({ page, request }) => {
    await page.goto('/login');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

    await page.goto(urls.storefront);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    const tienda = await request.get(urls.storefront);
    expect(tienda.headers()['x-robots-tag']).toBeUndefined();
  });
});

/*
 * PBI-0288. El snapshot que recibe la página se sustituye por uno propio, con siete categorías y un pedido de hoy en
 * cada una (seis con nombre y «Otras»), y no se guarda nada, como en `admin-dashboard-periodo.spec.ts`.
 */
const CATEGORIAS = Array.from({ length: 7 }, (_, i) => ({
  id: `cat-e2e-50-${i + 1}`,
  name: `Categoría 50-${i + 1}`,
  order: 90 + i,
}));
/** De mayor a menor: S/ 700, 600… 100, así cada categoría tiene su posición. */
const MONTOS = [700, 600, 500, 400, 300, 200, 100];
/** La serie fija, en el orden de las barras (`SERIE_DE_TONOS` de `distribucion-ventas.rules.ts`). */
const SERIE = [
  '--ws-primary',
  '--ws-success',
  '--ws-accent-line',
  '--ws-primary-strong',
  '--ws-danger',
  '--ws-warning',
] as const;

async function conSieteCategorias(page: Page): Promise<void> {
  await page.route('**/bff/admin/snapshot', async (ruta) => {
    if (ruta.request().method() !== 'GET') return ruta.fallback();
    const respuesta = await ruta.fetch();
    const snapshot = (await respuesta.json()) as {
      orders: Record<string, unknown>[];
      products: Record<string, unknown>[];
      categories: Record<string, unknown>[];
      activity: unknown[];
    };
    snapshot.categories = [...snapshot.categories, ...CATEGORIAS];
    snapshot.products = [
      ...snapshot.products,
      ...CATEGORIAS.map((categoria, i) => ({
        id: `p-e2e-50-${i + 1}`,
        sku: `E2E-50-${i + 1}`,
        name: `Producto 50-${i + 1}`,
        description: '',
        imageUrl: '',
        thumbnailUrl: '',
        brandId: '',
        categoryId: categoria.id,
        price: 100,
        stock: 50,
        active: true,
        highlights: [],
        gallery: [],
      })),
    ];
    snapshot.activity = [];
    const ahora = new Date().toISOString();
    snapshot.orders = MONTOS.map((monto, i) => ({
      id: `WS-E2E-50-${i + 1}`,
      customer: `Cliente ${i + 1}`,
      customerEmail: `lote50-${i + 1}@example.com`,
      district: 'Miraflores',
      status: 'delivered',
      subtotal: monto,
      shippingCost: 15,
      total: monto + 15,
      createdAt: ahora,
      items: [
        { productId: `p-e2e-50-${i + 1}`, name: `Producto 50-${i + 1}`, quantity: 1, unitPrice: monto },
      ],
    }));
    await ruta.fulfill({ response: respuesta, json: snapshot });
  });
}

const distribucion = (page: Page) =>
  page.getByRole('main').getByRole('list', { name: 'Ventas por categoría' });
/** La barra de una fila: el relleno dentro de la pista decorativa (oculta a los lectores de pantalla). */
const colorDeLaBarra = (fila: Locator) =>
  fila.locator('[aria-hidden="true"] > div').evaluate((barra) => getComputedStyle(barra).backgroundColor);

test.describe('PBI-0288: un color por barra en la distribución de ventas', () => {
  test.afterAll(async () => {
    await restablecerTemas();
  });

  test('cada barra con un color de la serie, «Otras» en gris, 3:1 contra la tarjeta con A, B y C', async ({
    page,
  }) => {
    await conSieteCategorias(page);
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const filas = distribucion(page).getByRole('listitem');
    for (const tema of TEMAS) {
      await activarTema(tema);
      await page.reload();
      await expect(filas).toHaveCount(7);
      // La cifra y el nombre siguen en texto: el color no es la única señal.
      await expect(filas).toContainText([
        ...CATEGORIAS.slice(0, 6).map((categoria) => categoria.name),
        'Otras',
      ]);
      await expect(filas.first()).toContainText('25 %');

      // El fondo de la tarjeta, que se ve detrás de la lista.
      const fondo = await fondoDe(distribucion(page));
      const colores: string[] = [];
      for (let i = 0; i < 7; i++) colores.push(enRgb(await colorDeLaBarra(filas.nth(i))));
      const esperados = await Promise.all(
        [...SERIE, '--ws-muted'].map((token) => colorDelToken(page, token)),
      );
      expect(colores, `${tema} · la serie, en orden, y «Otras» en gris`).toEqual(esperados);
      expect(new Set(colores).size, `${tema} · siete colores distintos`).toBe(7);
      for (const [i, color] of colores.entries())
        expect(
          relacionDeContraste(color, fondo),
          `${tema} · barra ${i + 1} (${color}) sobre ${fondo}`,
        ).toBeGreaterThanOrEqual(MINIMO.marca);

      // Estable entre cargas: el mismo orden da los mismos colores.
      await page.reload();
      await expect(filas).toHaveCount(7);
      for (let i = 0; i < 7; i++)
        expect(enRgb(await colorDeLaBarra(filas.nth(i))), `${tema} · barra ${i + 1} al recargar`).toBe(
          colores[i],
        );
    }
  });
});

/*
 * PBI-0289. Un PNG real de 4 × 3 px, que el navegador decodifica y el Admin reduce y comprime como la imagen
 * principal del producto. La prueba deja la tienda sin logo, como la semilla.
 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAADklEQVR4nGNoQAIMODkAXzYSAY5zHKsAAAAASUVORK5CYII=',
  'base64',
);
const logoDeLaTienda = (page: Page) =>
  page.getByRole('banner').getByRole('link', { name: 'Ir al inicio' }).getByRole('img');

async function guardarConfiguracion(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(page.getByRole('status')).toHaveText('Configuración publicada en la tienda.');
}

test.describe('PBI-0289: el logo se guarda como las demás imágenes', () => {
  test.afterEach(async () => {
    await enviarCambios({ config: { logoUrl: '' } });
  });

  test('«Cargar logo» lo guarda y la tienda lo recibe por dirección; el campo acepta una dirección escrita', async ({
    page,
    context,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/contenido');
    const cargar = page.getByLabel('Cargar logo');
    await expect(cargar).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');

    // Un SVG ya no se carga: la tienda no puede recibirlo por dirección.
    await cargar.setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    });
    await expect(page.getByRole('alert')).toHaveText(
      'Usa un logo PNG, JPG o WebP, o escribe su dirección en «URL/Data URL del logo».',
    );

    await cargar.setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByRole('img', { name: 'Vista previa del logo' })).toBeVisible();
    const campo = page.getByRole('textbox', { name: 'URL/Data URL del logo' });
    await expect(campo).toHaveValue(/^data:image\/(webp|jpeg);base64,/);
    await guardarConfiguracion(page);

    // El backoffice conserva lo cargado; la tienda recibe la dirección del BFF, no la Data URL.
    expect((await leerSnapshot()).config['logoUrl']).toMatch(/^data:image\/(webp|jpeg);base64,/);
    const tienda = await context.newPage();
    const ajustes = await (await tienda.request.get(`${urls.storefront}/bff/content/settings`)).json();
    expect(ajustes.logoUrl).toMatch(/^\/bff\/images\/logo\?v=[A-Za-z0-9_-]{12}$/);
    await tienda.goto(urls.storefront);
    const logo = logoDeLaTienda(tienda);
    await expect(logo).toHaveAttribute('src', ajustes.logoUrl);
    await expect
      .poll(() => logo.evaluate((imagen: HTMLImageElement) => imagen.complete && imagen.naturalWidth))
      .toBeGreaterThan(0);

    // El campo de la URL se queda (Sebastián Avila, 2026-11-27): una dirección escrita llega tal cual.
    await campo.fill('assets/brand/favicon.svg');
    await guardarConfiguracion(page);
    await tienda.reload();
    await expect(logoDeLaTienda(tienda)).toHaveAttribute('src', 'assets/brand/favicon.svg');
  });
});
