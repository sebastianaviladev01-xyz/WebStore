import { expect, request as nuevoRequest, test, type Page, type Route } from '@playwright/test';

import { cuentasAdmin, urls } from './apoyo/entorno';

/**
 * Temas en la tienda (feature 002). TEST-20 (AC-02, AC-08, AC-17): con C activo, ningún elemento visible usa un
 * color de B, el logo y las imágenes conservan su `src` y, al recargar, sigue C. TEST-22 (AC-18): la hoja
 * `/bff/appearance/theme.css` bloquea el primer pintado, así que la tienda sale ya con el tema activo y sin
 * parpadeo; si la hoja no llega, se ve con B, el de `tokens.css`. El tema se activa por la API del Admin y cada
 * bloque deja B activo al terminar.
 */
const HOJA_DEL_TEMA = '/bff/appearance/theme.css';
const FONDO = { b: 'rgb(243, 245, 248)', c: 'rgb(242, 243, 245)' } as const;

async function activarTema(themeId: string): Promise<void> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const sesion = await api.post('/bff/admin/sessions', {
      data: { email: cuentasAdmin.superadmin.email, password: cuentasAdmin.superadmin.password },
    });
    expect(sesion.ok()).toBe(true);
    const headers = { authorization: `Bearer ${(await sesion.json()).token}` };
    const temas = await api.get('/bff/admin/themes', { headers });
    const { revision } = await temas.json();
    const activado = await api.put('/bff/admin/active-theme', { headers, data: { revision, themeId } });
    expect(activado.ok()).toBe(true);
  } finally {
    await api.dispose();
  }
}

/** Sin `/bff/appearance` (el JSON), Angular no aplica ningún tema: el color solo puede venir de la hoja. */
async function sinAparienciaJson(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === '/bff/appearance',
    (route) => route.abort(),
  );
}

async function colores(page: Page) {
  return page.evaluate((hoja) => {
    const raiz = getComputedStyle(document.documentElement);
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
    const recurso = performance
      .getEntriesByType('resource')
      .find((entrada) => entrada.name.endsWith(hoja)) as PerformanceResourceTiming | undefined;
    return {
      fondo: getComputedStyle(document.body).backgroundColor,
      primario: raiz.getPropertyValue('--ws-primary').trim().toUpperCase(),
      fcp,
      finDeLaHoja: recurso?.responseEnd ?? null,
    };
  }, HOJA_DEL_TEMA);
}

/**
 * TEST-20 (AC-02, AC-08, AC-17): los colores calculados de B que no existen en C. Con C activo, ningún elemento
 * visible de la tienda puede usarlos.
 */
const COLORES_DE_B = [
  '#1D4ED8',
  '#183996',
  '#E8EDFB',
  '#C2410C',
  '#F3F5F8',
  '#0F172A',
  '#1E293B',
  '#526075',
  '#DDE3EC',
  '#0F1B33',
  '#C5CEDD',
] as const;
const PROPIEDADES_DE_COLOR = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'fill',
  'stroke',
] as const;
/** La semilla no trae logo gráfico: la prueba sirve uno para comprobar que el tema no lo toca (AC-17). */
const LOGO = '/assets/brand/living-room-v2.jpg';

interface Producto {
  readonly id: string;
  readonly slug: string;
}

const RUTAS: readonly { readonly nombre: string; readonly ruta: (producto: Producto) => string }[] = [
  { nombre: 'inicio', ruta: () => '/' },
  { nombre: 'catálogo', ruta: () => '/catalogo' },
  { nombre: 'ficha', ruta: (producto) => `/catalogo/${producto.slug}` },
  { nombre: 'carrito', ruta: () => '/carrito' },
  { nombre: 'checkout', ruta: () => '/checkout' },
];

/** Carrito con un producto (con `addInitScript`, por la carrera con `CarritoFacade`) y logo gráfico servido. */
async function prepararPagina(page: Page, producto: Producto): Promise<void> {
  await page.addInitScript(
    (id) => localStorage.setItem('webstore-cart-v1', JSON.stringify([{ productId: id, quantity: 1 }])),
    producto.id,
  );
  await page.route(
    (url) => url.pathname === '/bff/content/settings',
    async (route) => {
      const respuesta = await route.fetch();
      await route.fulfill({ response: respuesta, json: { ...(await respuesta.json()), logoUrl: LOGO } });
    },
  );
}

/** Colores de cada elemento visible, normalizados a `#RRGGBB` con un lienzo (también `color()` y `oklab()`). */
async function inspeccionar(page: Page) {
  return page.evaluate(
    ([coloresDeB, propiedades]) => {
      const lienzo = document.createElement('canvas');
      lienzo.width = lienzo.height = 1;
      const ctx = lienzo.getContext('2d', { willReadFrequently: true })!;
      const hex = (valor: string): string | null => {
        if (!valor || valor === 'none' || !CSS.supports('color', valor)) return null;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = valor;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        if (a === 0) return null;
        return (
          '#' +
          [r, g, b]
            .map((n) => n.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()
        );
      };
      const restosDeB: string[] = [];
      let revisados = 0;
      for (const el of document.querySelectorAll('body *')) {
        const caja = el.getBoundingClientRect();
        if (!caja.width || !caja.height) continue;
        if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        revisados++;
        const estilo = getComputedStyle(el);
        for (const propiedad of propiedades) {
          const color = hex(estilo.getPropertyValue(propiedad));
          if (color && (coloresDeB as readonly string[]).includes(color)) {
            restosDeB.push(
              `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') ?? ''}"> ${propiedad} ${color}`,
            );
          }
        }
      }
      return {
        revisados,
        restosDeB,
        imagenes: [...document.querySelectorAll('img')].map((img) => img.getAttribute('src')),
        primario: getComputedStyle(document.documentElement)
          .getPropertyValue('--ws-primary')
          .trim()
          .toUpperCase(),
        fondo: getComputedStyle(document.body).backgroundColor,
      };
    },
    [COLORES_DE_B, PROPIEDADES_DE_COLOR] as const,
  );
}

async function abrir(page: Page, ruta: string): Promise<void> {
  await page.goto(ruta, { waitUntil: 'networkidle' });
  await expect(page.locator('main')).toBeVisible();
}

test.describe('TEST-20: con C activo, la tienda no conserva colores de B', () => {
  let producto: Producto;
  const imagenesConB = new Map<string, (string | null)[]>();

  test.beforeAll(async ({ browser }) => {
    const api = await nuevoRequest.newContext({ baseURL: urls.bff });
    try {
      const productos = (await (await api.get('/bff/catalog/products')).json()) as Producto[];
      producto = productos[0]!;
    } finally {
      await api.dispose();
    }
    // Las imágenes de cada ruta con B, para comparar sus `src` con las de C (AC-17).
    await activarTema('b');
    const page = await browser.newPage();
    await prepararPagina(page, producto);
    for (const { nombre, ruta } of RUTAS) {
      await abrir(page, ruta(producto));
      imagenesConB.set(nombre, (await inspeccionar(page)).imagenes);
    }
    await page.close();
    await activarTema('c');
  });
  test.afterAll(() => activarTema('b'));

  for (const { nombre, ruta } of RUTAS) {
    test(`${nombre}: solo colores de C, las mismas imágenes y C tras recargar`, async ({ page }) => {
      await prepararPagina(page, producto);
      await abrir(page, ruta(producto));

      const conC = await inspeccionar(page);
      expect(conC.primario).toBe('#F2B705');
      expect(conC.revisados).toBeGreaterThan(20);
      expect(conC.restosDeB).toEqual([]);
      expect(conC.imagenes).toContain(LOGO);
      expect(conC.imagenes).toEqual(imagenesConB.get(nombre));

      await page.reload({ waitUntil: 'networkidle' });
      const recargada = await inspeccionar(page);
      expect(recargada.primario).toBe('#F2B705');
      expect(recargada.fondo).toBe(FONDO.c);
      expect(recargada.restosDeB).toEqual([]);
    });
  }
});

test.describe('tema activo en la primera carga', () => {
  test.beforeAll(() => activarTema('c'));
  test.afterAll(() => activarTema('b'));

  test('con theme.css retrasada, el primer pintado espera a la hoja y sale con C', async ({ page }) => {
    await sinAparienciaJson(page);
    await page.route(
      (url) => url.pathname === HOJA_DEL_TEMA,
      async (route: Route) => {
        await new Promise((resolver) => setTimeout(resolver, 800));
        await route.continue();
      },
    );

    await page.goto('/');
    await expect(page.locator('ws-root')).not.toBeEmpty();
    await expect.poll(async () => (await colores(page)).fcp).not.toBeNull();

    const medida = await colores(page);
    expect(medida.finDeLaHoja).not.toBeNull();
    expect(medida.fcp!).toBeGreaterThan(medida.finDeLaHoja!);
    expect(medida.fondo).toBe(FONDO.c);
    expect(medida.primario).toBe('#F2B705');
  });

  test('si theme.css no llega, la tienda se ve con B', async ({ page }) => {
    await sinAparienciaJson(page);
    await page.route(
      (url) => url.pathname === HOJA_DEL_TEMA,
      (route) => route.abort(),
    );

    await page.goto('/');
    await expect(page.locator('ws-root')).not.toBeEmpty();
    await expect.poll(async () => (await colores(page)).fcp).not.toBeNull();

    const medida = await colores(page);
    expect(medida.fondo).toBe(FONDO.b);
    expect(medida.primario).toBe('#1D4ED8');
  });
});
