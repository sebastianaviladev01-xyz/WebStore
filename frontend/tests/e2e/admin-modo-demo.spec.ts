import { expect, test, type Page } from '@playwright/test';

import { botonMenuUsuario, cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';
import {
  ANCHOS,
  elegirCConTeclado,
  marcarSinRecarga,
  menuDeTemas,
  PRIMARIO,
  primario,
  sigueSinRecargar,
  sinCruceConLaTuerca,
  sinNadaBajoLaTuercaAlFinal,
  sinModoDemo,
  temaActivoDelBff,
  tuerca,
  vistaPrevia,
  volverAlActivoConTeclado,
} from './apoyo/modo-demo';

/**
 * Modo demo en el Admin (feature 002). TEST-21: la tuerca está también en el acceso, se maneja con teclado y
 * cambia el tema solo en este navegador (AC-15, AC-21); sin modo demo no existe (AC-16); no tapa el menú. Desde el
 * lote 14 (PBI-0188) es la única tuerca: ofrece solo A, B y C, y la tienda pinta lo que elige.
 */
const menu = (page: Page) => page.getByRole('navigation', { name: 'Administración' });

test('la tuerca del acceso cambia el tema solo en este navegador y se maneja con teclado', async ({
  page,
  context,
  browser,
}) => {
  await page.goto('/login');
  await expect(tuerca(page)).toBeVisible();
  expect(await primario(page)).toBe(PRIMARIO.b);
  await marcarSinRecarga(page);

  await elegirCConTeclado(page);
  await expect.poll(() => primario(page)).toBe(PRIMARIO.c);
  expect(await sigueSinRecargar(page)).toBe(true);
  expect(await vistaPrevia(context)).toBe('c');

  // Dentro del panel sigue C, también al recargar.
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await expect(tuerca(page)).toBeVisible();
  expect(await primario(page)).toBe(PRIMARIO.c);
  await page.reload();
  await expect(tuerca(page)).toBeVisible();
  expect(await primario(page)).toBe(PRIMARIO.c);

  // Mismo navegador: la tienda también se ve con C, sin tuerca propia (PBI-0188).
  await page.goto(`${urls.storefront}/`);
  await expect.poll(() => primario(page)).toBe(PRIMARIO.c);
  await expect(tuerca(page)).toHaveCount(0);

  const otro = await browser.newContext();
  try {
    const otraPagina = await otro.newPage();
    await otraPagina.goto(`${urls.admin}/login`);
    await expect(tuerca(otraPagina)).toBeVisible();
    expect(await primario(otraPagina)).toBe(PRIMARIO.b);
  } finally {
    await otro.close();
  }
  expect(await temaActivoDelBff(page)).toBe('b');

  await page.goto('/');
  await expect(tuerca(page)).toBeVisible();
  // Solo los tres temas predefinidos (PBI-0188).
  await tuerca(page).click();
  await expect(menuDeTemas(page).getByRole('menuitemradio')).toHaveText([
    /^Violeta tienda/,
    /^Azul cobalto/,
    /^Grafito y ámbar/,
  ]);
  await page.keyboard.press('Escape');
  await expect(menuDeTemas(page)).toBeHidden();
  await volverAlActivoConTeclado(page);
  await expect.poll(() => primario(page)).toBe(PRIMARIO.b);
  expect(await vistaPrevia(context)).toBeNull();
});

test('sin modo demo, la tuerca no está en el acceso ni en el panel', async ({ page }) => {
  await sinModoDemo(page);
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('ws-admin-selector-tema')).toHaveCount(0);
  await expect(tuerca(page)).toHaveCount(0);

  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('ws-admin-selector-tema')).toHaveCount(0);
  await expect(tuerca(page)).toHaveCount(0);
});

for (const { ancho, alto } of ANCHOS) {
  test(`a ${ancho} px la tuerca no tapa el menú del Admin`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto('/login');
    await sinCruceConLaTuerca(
      page,
      page.getByRole('button', { name: 'Ingresar al panel' }),
      '«Ingresar al panel»',
    );

    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    for (const ruta of ['/', '/productos', '/contenido']) {
      await page.goto(ruta);
      if (ancho < 1024) {
        // Lote 07b (PBI-0044): por debajo de 1024 px el menú se abre en un panel con la hamburguesa.
        const abrir = page.getByRole('button', { name: 'Abrir el menú' });
        await sinCruceConLaTuerca(page, abrir, `Botón del menú en ${ruta}`);
        await abrir.click();
        await sinCruceConLaTuerca(page, menu(page), `Menú del Admin en ${ruta}`);
        await page.keyboard.press('Escape');
      } else await sinCruceConLaTuerca(page, menu(page), `Menú del Admin en ${ruta}`);
      await sinCruceConLaTuerca(page, botonMenuUsuario(page), `Menú de usuario en ${ruta}`);
    }
  });
}

/**
 * Lote 35 (ADR-0029, PBI-0249): el contenido reserva al final el espacio de la tuerca. Con la página desplazada
 * hasta el final, nada de `main` queda bajo ella: ni el último «Eliminar» de Productos ni un botón de otra página
 * con el mismo contenedor. Sin modo demo no hay tuerca ni reserva.
 */
const PAGINAS_CON_TUERCA = [
  { ruta: '/productos', titulo: 'Productos' },
  { ruta: '/inventario', titulo: 'Inventario' },
  { ruta: '/categorias', titulo: 'Categorías' },
  { ruta: '/marcas', titulo: 'Marcas' },
  { ruta: '/pedidos', titulo: 'Pedidos' },
  { ruta: '/clientes', titulo: 'Clientes' },
  { ruta: '/banners', titulo: 'Banners' },
  { ruta: '/usuarios', titulo: 'Usuarios y roles' },
  { ruta: '/temas', titulo: 'Temas' },
  { ruta: '/envios', titulo: 'Tarifas de envío' },
] as const;

for (const { ancho, alto } of [
  { ancho: 1440, alto: 900 },
  { ancho: 375, alto: 812 },
]) {
  test(`a ${ancho} px, al llegar al final de cada página nada queda bajo la tuerca`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    for (const { ruta, titulo } of PAGINAS_CON_TUERCA) {
      await page.goto(ruta);
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
      await sinNadaBajoLaTuercaAlFinal(page, `${titulo} a ${ancho} px`);
    }
  });
}

test('sin modo demo, el contenido no reserva espacio para la tuerca', async ({ page }) => {
  await sinModoDemo(page);
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/productos');
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(tuerca(page)).toHaveCount(0);
  const reserva = await page.getByRole('main').evaluate((main) => getComputedStyle(main).paddingBottom);
  expect(reserva).toBe('28px');
});
