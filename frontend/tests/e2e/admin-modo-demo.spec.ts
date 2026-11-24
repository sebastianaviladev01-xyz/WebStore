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
