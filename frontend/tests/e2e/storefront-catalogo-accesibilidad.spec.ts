import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

import { actualizarProducto, leerProductos } from './apoyo/catalogo';
import { urls } from './apoyo/entorno';
import { esperarFotos, fotosVisiblesSinPrioridad } from './apoyo/fotos';

/**
 * Lote 05 (ADR-0017), tienda: catálogo, navegación y accesibilidad. Página 404 (PBI-0020), avisos de
 * `NgOptimizedImage` (PBI-0026 y PBI-0054), sugeridos del diálogo «Producto agregado» (PBI-0039), favicon (PBI-0046),
 * foco de los filtros (PBI-0105), filtros en la URL (PBI-0108), «Saltar al contenido» (PBI-0109), contenido ante un
 * fallo del BFF (PBI-0111), precio y tildes (PBI-0115) y Escape en el menú de categorías (PBI-0116).
 */
const productos = (page: Page) => page.getByRole('main').getByRole('article');
const filtros = (page: Page) => page.getByRole('complementary', { name: 'Filtros de catálogo' });

test.describe('PBI-0020: página no encontrada', () => {
  test('tiene título, una frase y enlaces al inicio y al catálogo', async ({ page }) => {
    await page.goto('/no-existe');
    await expect(page).toHaveTitle('WebStore | Página no encontrada');
    await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible();
    await expect(page.getByText('La dirección puede haber cambiado o ya no existe.')).toBeVisible();
    await page.getByRole('link', { name: 'Ver productos' }).click();
    await expect(page).toHaveURL('/catalogo');
    await expect(page.getByRole('heading', { level: 1, name: 'Todos los productos' })).toBeVisible();
  });
});

test.describe('PBI-0026 y PBI-0054: sin avisos de NgOptimizedImage', () => {
  const avisos = (page: Page, patron = /NG0(2953|2952|2955|913)/): string[] => {
    const lista: string[] = [];
    page.on('console', (mensaje: ConsoleMessage) => {
      if (patron.test(mensaje.text())) lista.push(mensaje.text().slice(0, 160));
    });
    return lista;
  };

  // El NG02955 del catálogo se comprueba aparte, por estructura (PBI-0159): depende de qué foto pinta antes el navegador.
  test('al volver a pintar el catálogo no cambia `priority` (NG02953)', async ({ page }) => {
    const lista = avisos(page, /NG02953/);
    await page.goto('/catalogo');
    await expect(productos(page)).toHaveCount(6);
    await filtros(page).getByRole('searchbox', { name: 'Buscar por nombre' }).fill('lavadora');
    await expect(productos(page)).toHaveCount(1);
    await filtros(page).getByRole('searchbox', { name: 'Buscar por nombre' }).fill('');
    await expect(productos(page)).toHaveCount(6);
    await esperarFotos(page);
    expect(lista).toEqual([]);
  });

  // PBI-0159: `NgOptimizedImage` avisa (NG02955) si la foto que el navegador toma como la más grande al pintar no
  // lleva `priority`. Cuál es depende de qué foto carga antes, así que se comprueba lo que lo evita siempre: toda foto
  // de tarjeta que se ve al abrir el catálogo, en cualquier ancho, es prioritaria.
  for (const ancho of [1440, 768, 375]) {
    test(`el catálogo a ${ancho} px da prioridad a todas las fotos que se ven al abrirlo (NG02955)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: ancho, height: ancho === 375 ? 812 : 900 });
      const lista = avisos(page, /NG0(2953|2955)/);
      await page.goto('/catalogo');
      await expect(productos(page)).toHaveCount(6);
      await esperarFotos(page);
      const { visibles, sinPrioridad } = await fotosVisiblesSinPrioridad(page.getByRole('main'));
      expect(visibles).toBeGreaterThan(0);
      expect(sinPrioridad).toBe(0);
      expect(lista).toEqual([]);
    });
  }

  test('la foto del carrito a 375 px es prioritaria y la ficha no avisa de tamaños (NG02955, NG0913)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const lista = avisos(page);
    await page.goto('/catalogo/soundbar-cinema-500');
    await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Seguir comprando' }).click();
    await page.goto('/catalogo/oled-vision-55-4k');
    await expect(page.getByRole('heading', { level: 1, name: /OLED Vision/ })).toBeVisible();
    await esperarFotos(page);
    await page.goto('/carrito');
    await expect(page.getByRole('heading', { level: 1, name: 'Carrito' })).toBeVisible();
    await esperarFotos(page);
    const { visibles, sinPrioridad } = await fotosVisiblesSinPrioridad(page.getByRole('main'));
    expect(visibles).toBeGreaterThan(0);
    expect(sinPrioridad).toBe(0);
    expect(lista).toEqual([]);
  });
});

test.describe('PBI-0039: también te puede interesar', () => {
  test('el diálogo sugiere productos de la misma categoría con stock, que llevan a su ficha', async ({
    page,
  }) => {
    await page.goto('/catalogo/oled-vision-55-4k');
    await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Producto agregado' });
    await expect(dialogo.getByRole('heading', { name: 'También te puede interesar' })).toBeVisible();
    const sugeridos = dialogo.getByRole('list', { name: 'También te puede interesar' }).getByRole('listitem');
    await expect(sugeridos).toHaveCount(1);
    // El foco inicial sigue en «Ver carrito».
    await expect(dialogo.getByRole('button', { name: 'Ver carrito' })).toBeFocused();
    await dialogo.getByRole('link', { name: /Soundbar Cinema 500/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL('/catalogo/soundbar-cinema-500');
    await expect(page.getByRole('heading', { level: 1, name: 'Soundbar Cinema 500' })).toBeVisible();
  });

  test('sin otros productos con stock en la categoría no muestra la sección', async ({ page }) => {
    await page.goto('/catalogo/monitor-ultrawide-34');
    await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Producto agregado' });
    await expect(dialogo.getByRole('button', { name: 'Ver carrito' })).toBeVisible();
    await expect(dialogo.getByRole('heading', { name: 'También te puede interesar' })).toHaveCount(0);
  });
});

test.describe('PBI-0046: favicon', () => {
  for (const [app, url] of [
    ['la tienda', urls.storefront + '/'],
    ['el Admin', urls.admin + '/login'],
  ] as const) {
    test(`${app} declara su ícono y no pide /favicon.ico`, async ({ page, request }) => {
      const pedidos: string[] = [];
      page.on('request', (r) => {
        if (new URL(r.url()).pathname === '/favicon.ico') pedidos.push(r.url());
      });
      await page.goto(url);
      await page.waitForLoadState('load');
      const href = await page.locator('link[rel="icon"]').getAttribute('href');
      expect(href).toBeTruthy();
      const icono = await request.get(new URL(href!, url).toString());
      expect(icono.status()).toBe(200);
      expect(icono.headers()['content-type']).toContain('svg');
      await page.waitForLoadState('networkidle');
      expect(pedidos).toEqual([]);
    });
  }
});

test.describe('PBI-0105: foco de los filtros', () => {
  test('en escritorio, Tab sale de los filtros y llega a los productos', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(productos(page)).toHaveCount(6);
    await filtros(page).getByRole('searchbox', { name: 'Buscar por nombre' }).focus();
    let llego = false;
    for (let i = 0; i < 12 && !llego; i++) {
      await page.keyboard.press('Tab');
      llego = await page.evaluate(() => Boolean(document.activeElement?.closest('article')));
    }
    expect(llego).toBe(true);
  });

  test('en móvil, el panel retiene el foco y al cerrarlo vuelve al botón «Filtros»', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/catalogo');
    const boton = page.getByRole('button', { name: /^Filtros/ });
    await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('#catalog-filters')))).toBe(
      true,
    );
    await page.keyboard.press('Escape');
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await expect(boton).toBeFocused();

    await boton.click();
    await filtros(page).getByRole('button', { name: 'Cerrar filtros' }).click();
    await expect(boton).toBeFocused();
  });
});

test.describe('PBI-0108: el catálogo sigue a la URL', () => {
  test('tras buscar en la página, el pie y la cabecera cambian la lista', async ({ page }) => {
    await page.goto('/catalogo');
    await filtros(page).getByRole('searchbox', { name: 'Buscar por nombre' }).fill('zzzz');
    await expect(page).toHaveURL('/catalogo?buscar=zzzz');
    await expect(page.getByRole('heading', { name: 'No encontramos resultados' })).toBeVisible();

    await page.getByRole('contentinfo').getByRole('link', { name: 'TV y audio' }).click();
    await expect(page).toHaveURL('/catalogo?categoria=cat-tv');
    await expect(productos(page)).toHaveCount(2);
    await expect(filtros(page).getByRole('searchbox', { name: 'Buscar por nombre' })).toHaveValue('');

    const buscador = page.getByRole('banner').getByRole('searchbox', { name: 'Buscar productos' });
    await buscador.filter({ visible: true }).fill('lavadora');
    await buscador.filter({ visible: true }).press('Enter');
    await expect(page).toHaveURL('/catalogo?buscar=lavadora');
    await expect(productos(page)).toHaveCount(1);
  });

  test('los filtros se escriben en la URL, «Limpiar filtros» la limpia y «Atrás» los recupera', async ({
    page,
  }) => {
    await page.goto('/catalogo');
    await filtros(page).getByRole('combobox', { name: 'Categoría' }).click();
    await page.getByRole('option', { name: 'Electrohogar', exact: true }).click();
    await expect(page).toHaveURL('/catalogo?categoria=cat-home');
    await filtros(page).getByRole('combobox', { name: 'Precio máximo' }).click();
    await page.getByRole('option', { name: 'S/ 2,000', exact: true }).click();
    await expect(page).toHaveURL('/catalogo?categoria=cat-home&precio=2000');
    await expect(productos(page)).toHaveCount(1);

    await filtros(page).getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL('/catalogo');
    await expect(productos(page)).toHaveCount(6);

    await page.goBack();
    await expect(page).toHaveURL('/catalogo?categoria=cat-home&precio=2000');
    await expect(productos(page)).toHaveCount(1);
    await expect(filtros(page).getByRole('combobox', { name: 'Categoría' })).toHaveText(/Electrohogar/);
  });
});

test.describe('PBI-0109: saltar al contenido', () => {
  test('lleva al contenido de la página en la que se está, no a la portada', async ({ page }) => {
    await page.goto('/info/envios');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const saltar = page.getByRole('link', { name: 'Saltar al contenido' });
    // Es el primer enlace de la tienda: se llega con Tab (la tienda ya no tiene tuerca desde el lote 14, PBI-0188).
    for (let i = 0; i < 3 && !(await saltar.evaluate((el) => el === document.activeElement)); i++)
      await page.keyboard.press('Tab');
    await expect(saltar).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/info/envios');
    await expect(page.getByRole('main')).toBeFocused();
  });
});

test.describe('PBI-0111: el contenido no vuelve al de la demo ante un fallo', () => {
  const ajustes = async (page: Page) => (await page.request.get(`${urls.bff}/bff/content/settings`)).json();

  test('un fallo al recargar conserva el contenido que ya llegó', async ({ page }) => {
    const propios = { ...(await ajustes(page)), storeName: 'Tienda Lote Cinco', shippingPageEnabled: false };
    let fallar = false;
    await page.route('**/bff/content/settings', (r) =>
      fallar
        ? r.fulfill({ status: 503, body: '{}' })
        : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(propios) }),
    );
    await page.goto('/');
    const pie = page.getByRole('contentinfo');
    await expect(
      pie.getByText('© ' + new Date().getFullYear() + ' Tienda Lote Cinco.', { exact: false }),
    ).toBeVisible();
    await expect(pie.getByRole('link', { name: 'Envíos' })).toHaveCount(0);

    fallar = true;
    const recarga = page.waitForResponse('**/bff/content/settings');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    expect((await recarga).status()).toBe(503);
    await expect(pie.getByText('Tienda Lote Cinco', { exact: false }).first()).toBeVisible();
    await expect(pie.getByRole('link', { name: 'Envíos' })).toHaveCount(0);
  });

  test('si el contenido nunca llega, no muestra los datos de contacto de la demo ni abre las páginas', async ({
    page,
  }) => {
    await page.route('**/bff/content/settings', (r) => r.fulfill({ status: 503, body: '{}' }));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('contacto@webstore.demo')).toHaveCount(0);
    await expect(page.getByText('+51 999 000 000')).toHaveCount(0);
    await page.goto('/info/envios');
    await expect(page).toHaveURL('/');
  });
});

test.describe('PBI-0115: precio y tildes', () => {
  test('un producto de más de S/ 5,000 aparece sin filtros y la búsqueda ignora las tildes', async ({
    page,
  }) => {
    const oled = (await leerProductos()).find((p) => p.sku === 'TV-OLED-55-VSN')!;
    await actualizarProducto(oled.id, { price: 5499 });
    try {
      await page.goto('/catalogo');
      await expect(productos(page)).toHaveCount(6);
      await expect(page.getByRole('heading', { level: 3, name: 'OLED Vision 55” 4K' })).toBeVisible();
      await expect(filtros(page).getByRole('combobox', { name: 'Precio máximo' })).toHaveText(
        /Todos los precios/,
      );
      await expect(filtros(page).getByRole('button', { name: 'Limpiar filtros' })).toHaveCount(0);

      await filtros(page).getByRole('combobox', { name: 'Precio máximo' }).click();
      await page.getByRole('option', { name: 'S/ 5,000', exact: true }).click();
      await expect(productos(page)).toHaveCount(5);
      await expect(filtros(page).getByRole('button', { name: 'Limpiar filtros' })).toBeVisible();

      await page.goto('/catalogo?buscar=VISIÓN');
      await expect(productos(page)).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 3, name: 'OLED Vision 55” 4K' })).toBeVisible();
    } finally {
      await actualizarProducto(oled.id, { price: oled.price });
    }
  });
});

test.describe('PBI-0116: Escape en el menú de categorías', () => {
  test('devuelve el foco al botón de la categoría', async ({ page }) => {
    await page.goto('/');
    const menu = page.getByRole('navigation', { name: 'Categorías principales' });
    const tv = menu.getByRole('button', { name: 'TV y audio' });
    await tv.focus();
    await page.keyboard.press('Enter');
    await expect(tv).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(menu.getByRole('link', { name: 'Ver todos los productos' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(tv).toHaveAttribute('aria-expanded', 'false');
    await expect(tv).toBeFocused();
  });
});
