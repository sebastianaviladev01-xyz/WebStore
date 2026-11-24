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
    await filtros(page).getByRole('textbox', { name: 'Precio máximo (S/)' }).fill('2000');
    await filtros(page).getByRole('textbox', { name: 'Precio máximo (S/)' }).press('Enter');
    await expect(page).toHaveURL('/catalogo?categoria=cat-home&precioMax=2000');
    await expect(productos(page)).toHaveCount(1);

    await filtros(page).getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL('/catalogo');
    await expect(productos(page)).toHaveCount(6);

    await expect(filtros(page).getByRole('textbox', { name: 'Precio máximo (S/)' })).toHaveValue('');

    await page.goBack();
    await expect(page).toHaveURL('/catalogo?categoria=cat-home&precioMax=2000');
    await expect(productos(page)).toHaveCount(1);
    await expect(filtros(page).getByRole('combobox', { name: 'Categoría' })).toHaveText(/Electrohogar/);
    await expect(filtros(page).getByRole('textbox', { name: 'Precio máximo (S/)' })).toHaveValue('2000');
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

test.describe('PBI-0111 y PBI-0182: el contenido ante un fallo del BFF', () => {
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

  // Lote 15 (ADR-0021), PBI-0182: si nunca llega, la tienda muestra un aviso de mantenimiento con «Reintentar», sin
  // cabecera, pie ni datos de contacto de la demo; al reintentar con el BFF de vuelta, aparece la tienda.
  test('PBI-0182: si el contenido nunca llega, muestra el aviso de mantenimiento y «Reintentar» trae la tienda', async ({
    page,
  }) => {
    let fallar = true;
    await page.route('**/bff/content/settings', (r) =>
      fallar ? r.fulfill({ status: 503, body: '{}' }) : r.fallback(),
    );
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Estamos haciendo mantenimiento' }),
    ).toBeVisible();
    await expect(page.getByText('Vuelve a intentarlo en unos minutos.')).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
    await expect(page.getByRole('search')).toHaveCount(0);
    await expect(page.getByText('contacto@webstore.demo')).toHaveCount(0);
    await expect(page.getByText('+51 999 000 000')).toHaveCount(0);

    const reintentar = page.getByRole('button', { name: 'Reintentar' });
    await reintentar.click();
    await expect(page.getByRole('status')).toHaveText('La tienda todavía no responde.');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Estamos haciendo mantenimiento' }),
    ).toBeVisible();

    fallar = false;
    await reintentar.click();
    await expect(page.getByRole('heading', { level: 1, name: 'Estamos haciendo mantenimiento' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('contentinfo').getByText('contacto@webstore.demo')).toBeVisible();
    await expect(page.getByRole('search').first()).toBeVisible();
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
      await expect(filtros(page).getByRole('textbox', { name: 'Precio máximo (S/)' })).toHaveValue('');
      await expect(filtros(page).getByRole('button', { name: 'Limpiar filtros' })).toHaveCount(0);

      await filtros(page).getByRole('textbox', { name: 'Precio máximo (S/)' }).fill('5000');
      await filtros(page).getByRole('textbox', { name: 'Precio máximo (S/)' }).press('Enter');
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

test.describe('PBI-0181: rango de precio (lote 16, ADR-0021)', () => {
  test('filtra con mínimo y máximo, lo escribe en la URL, avisa un rango que no vale y lee el tope anterior', async ({
    page,
  }) => {
    await page.goto('/catalogo');
    const minimo = filtros(page).getByRole('textbox', { name: 'Precio mínimo (S/)' });
    const maximo = filtros(page).getByRole('textbox', { name: 'Precio máximo (S/)' });
    // Los límites del catálogo orientan el rango: en la ayuda y como ejemplo en cada campo.
    await expect(filtros(page).getByText('En el catálogo: de S/ 449 a S/ 3,299.')).toBeVisible();
    await expect(minimo).toHaveAttribute('placeholder', '449');
    await expect(maximo).toHaveAttribute('placeholder', '3,299');

    await minimo.fill('1000');
    await minimo.press('Tab');
    await expect(page).toHaveURL('/catalogo?precioMin=1000');
    await maximo.fill('2,000');
    await maximo.press('Enter');
    await expect(page).toHaveURL('/catalogo?precioMin=1000&precioMax=2000');
    await expect(productos(page)).toHaveCount(2);
    await expect(page.getByRole('heading', { level: 3, name: 'Lavadora SmartWash 18 kg' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Monitor UltraWide 34”' })).toBeVisible();

    // Un mínimo mayor que el máximo no se aplica: el máximo dice por qué y la URL no cambia.
    await minimo.fill('3000');
    await minimo.press('Enter');
    await expect(maximo).toHaveAttribute('aria-invalid', 'true');
    await expect(filtros(page).getByText('El máximo no puede ser menor que el mínimo.')).toBeVisible();
    await expect(page).toHaveURL('/catalogo?precioMin=1000&precioMax=2000');
    await minimo.fill('-5');
    await minimo.press('Enter');
    await expect(filtros(page).getByText('El precio no puede ser negativo.')).toBeVisible();
    await expect(minimo).toHaveAttribute('aria-invalid', 'true');

    await filtros(page).getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL('/catalogo');
    await expect(minimo).toHaveValue('');
    await expect(minimo).not.toHaveAttribute('aria-invalid', 'true');

    // Un enlace guardado con el tope anterior (`precio`, lote 05) sigue filtrando, como precio máximo.
    await page.goto('/catalogo?precio=1000');
    await expect(maximo).toHaveValue('1000');
    await expect(productos(page)).toHaveCount(2);
  });

  test('en el celular, el rango va en el panel de filtros y se aplica al ver los productos', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/catalogo');
    await page.getByRole('button', { name: 'Filtros' }).click();
    const maximo = filtros(page).getByRole('textbox', { name: 'Precio máximo (S/)' });
    await expect(maximo).toBeVisible();
    await maximo.fill('700');
    await filtros(page)
      .getByRole('button', { name: /^Ver \d+ productos?$/ })
      .click();
    await expect(page).toHaveURL('/catalogo?precioMax=700');
    await expect(productos(page)).toHaveCount(2);
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
