import { expect, test } from '@playwright/test';

import { urls } from './apoyo/entorno';
import {
  ANCHOS,
  elegirCConTeclado,
  marcarSinRecarga,
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
 * Modo demo en la tienda (feature 002). TEST-21: la tuerca «Cambiar tema» se maneja con teclado y cambia el
 * tema solo en este navegador (AC-15, AC-21); sin modo demo no existe (AC-16); no tapa el carrito ni «Pagar».
 */
test('la tuerca cambia el tema solo en este navegador y se maneja con teclado', async ({
  page,
  context,
  browser,
}) => {
  await page.goto('/');
  await expect(tuerca(page)).toBeVisible();
  expect(await primario(page)).toBe(PRIMARIO.b);
  await marcarSinRecarga(page);

  await elegirCConTeclado(page);
  await expect.poll(() => primario(page)).toBe(PRIMARIO.c);
  expect(await sigueSinRecargar(page)).toBe(true);
  expect(await vistaPrevia(context)).toBe('c');

  await page.reload();
  await expect(tuerca(page)).toBeVisible();
  expect(await primario(page)).toBe(PRIMARIO.c);

  // Mismo navegador: el Admin también se ve con C (la cookie no distingue puertos en localhost).
  await page.goto(`${urls.admin}/login`);
  await expect(tuerca(page)).toBeVisible();
  expect(await primario(page)).toBe(PRIMARIO.c);

  // Otra persona, en otro navegador, sigue viendo el tema activo, que no cambió en el BFF.
  const otro = await browser.newContext();
  try {
    const otraPagina = await otro.newPage();
    await otraPagina.goto(`${urls.storefront}/`);
    await expect(tuerca(otraPagina)).toBeVisible();
    expect(await primario(otraPagina)).toBe(PRIMARIO.b);
  } finally {
    await otro.close();
  }
  expect(await temaActivoDelBff(page)).toBe('b');

  await page.goto('/');
  await expect(tuerca(page)).toBeVisible();
  await volverAlActivoConTeclado(page);
  await expect.poll(() => primario(page)).toBe(PRIMARIO.b);
  expect(await vistaPrevia(context)).toBeNull();
});

test('sin modo demo, la tuerca no está en la página', async ({ page }) => {
  await sinModoDemo(page);
  for (const ruta of ['/', '/catalogo', '/no-existe']) {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('ws-root')).not.toBeEmpty();
    await expect(page.locator('ws-selector-tema')).toHaveCount(0);
    await expect(tuerca(page)).toHaveCount(0);
  }
});

for (const { ancho, alto } of ANCHOS) {
  test(`a ${ancho} px la tuerca no tapa el carrito ni «Pagar»`, async ({ page, request }) => {
    await page.setViewportSize({ width: ancho, height: alto });
    const productos: { id: string; stock: number }[] = await (
      await request.get(`${urls.bff}/bff/catalog/products`)
    ).json();
    // El carrito se escribe antes de que arranque la aplicación: si se escribiera después, CarritoFacade podría
    // guardar encima su carrito vacío al conciliar el catálogo.
    await page.addInitScript(
      (id) => localStorage.setItem('webstore-cart-v1', JSON.stringify([{ productId: id, quantity: 1 }])),
      productos.find((producto) => producto.stock > 0)!.id,
    );
    await page.goto('/');
    await expect(page.locator('.ws-cart-count')).toHaveText('1');

    const carrito = page.locator('a[aria-label="Carrito"]');
    await sinCruceConLaTuerca(page, carrito, 'Carrito de la cabecera');

    await page.goto('/carrito');
    await sinCruceConLaTuerca(page, carrito, 'Carrito de la cabecera');
    // Textos de la feature 004 (D1, TEST-16).
    await sinCruceConLaTuerca(
      page,
      page.getByRole('link', { name: 'Confirmar pedido' }),
      '«Confirmar pedido»',
    );

    await page.goto('/checkout');
    await sinCruceConLaTuerca(
      page,
      page.getByRole('button', { name: 'Finalizar compra' }),
      '«Finalizar compra»',
    );
  });
}
