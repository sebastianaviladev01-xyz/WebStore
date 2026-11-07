import { expect, test, type Page } from '@playwright/test';

/**
 * Carrito: confirmación al agregar (Seguir comprando / Ver carrito / Finalizar compra), cambio de cantidad,
 * totales con valor de venta e IGV explícitos, persistencia al recargar y eliminación.
 */
function fila(page: Page, nombre: string) {
  return page.getByRole('main').getByRole('article').filter({ hasText: nombre });
}

function resumen(page: Page, concepto: string) {
  // Cada concepto del resumen y su monto comparten un contenedor.
  return page.getByRole('main').getByText(concepto, { exact: true }).locator('..');
}

test('agregar desde el catálogo, cambiar la cantidad y ver los totales con IGV', async ({ page }) => {
  await page.goto('/catalogo');
  await fila(page, 'Soundbar Cinema 500').getByRole('button', { name: 'Agregar al carrito' }).click();

  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByRole('heading', { name: 'Producto agregado' })).toBeVisible();
  await expect(dialogo.getByRole('button', { name: 'Finalizar compra' })).toBeVisible();
  await dialogo.getByRole('button', { name: 'Ver carrito' }).click();

  await expect(page).toHaveURL('/carrito');
  await expect(fila(page, 'Soundbar Cinema 500')).toBeVisible();
  await expect(resumen(page, 'Subtotal con IGV')).toContainText('S/ 699.00');

  await page.getByRole('button', { name: 'Aumentar cantidad de Soundbar Cinema 500' }).click();
  await expect(fila(page, 'Soundbar Cinema 500')).toContainText('S/ 1,398.00');
  // 1398 / 1.18 = 1184.75 de valor de venta y 213.25 de IGV.
  await expect(resumen(page, 'Valor de venta')).toContainText('S/ 1,184.75');
  await expect(resumen(page, 'IGV (18%)')).toContainText('S/ 213.25');
  await expect(resumen(page, 'Subtotal con IGV')).toContainText('S/ 1,398.00');
  await expect(resumen(page, 'Envío')).toContainText('Se calcula en checkout');

  await page.reload();
  await expect(fila(page, 'Soundbar Cinema 500')).toContainText('S/ 1,398.00');

  await page.getByRole('button', { name: 'Reducir cantidad de Soundbar Cinema 500' }).click();
  await expect(resumen(page, 'Subtotal con IGV')).toContainText('S/ 699.00');

  await fila(page, 'Soundbar Cinema 500').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible();
});

test('agregar desde la ficha con cantidad y seguir comprando', async ({ page }) => {
  await page.goto('/catalogo/oled-vision-55-4k');
  await page.getByRole('button', { name: 'Aumentar cantidad' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Seguir comprando' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('banner').getByRole('link', { name: 'Carrito' }).click();
  await expect(fila(page, 'OLED Vision 55” 4K')).toContainText('S/ 6,598.00');
});
