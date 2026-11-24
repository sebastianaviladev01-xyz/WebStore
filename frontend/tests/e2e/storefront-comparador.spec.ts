import { expect, test, type Page } from '@playwright/test';

/**
 * Lote 19 (ADR-0021, PBI-0001; provisional, por confirmar con Daniel): el comparador de productos. «Comparar» en la
 * tarjeta y en la ficha (botón de alternar, hasta 4 productos), el acceso de la cabecera con cuántos hay y `/comparar`,
 * con la lista en la URL para compartirla. La lista vive en memoria: no se guarda en el navegador (STD-08).
 */

const comparar = (page: Page, nombre: string) =>
  page.getByRole('button', { name: `Comparar ${nombre}`, exact: true }).first();
const accesoDeLaCabecera = (page: Page) =>
  page.getByRole('banner').getByRole('link', { name: /^Comparar productos/ });
const tabla = (page: Page) => page.getByRole('table', { name: /Comparación de \d+ productos/ });

test('desde el catálogo se eligen hasta 4 productos, con aviso al pasar el máximo, y se comparan', async ({
  page,
}) => {
  await page.goto('/catalogo');
  await expect(accesoDeLaCabecera(page)).toHaveCount(0);

  const tele = comparar(page, 'OLED Vision 55” 4K');
  await expect(tele).toHaveAttribute('aria-pressed', 'false');
  await tele.click();
  await expect(tele).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Agregado a la comparación (1 de 4).')).toBeVisible();
  await expect(accesoDeLaCabecera(page)).toHaveAccessibleName('Comparar productos (1)');

  for (const nombre of ['Soundbar Cinema 500', 'Monitor UltraWide 34”', 'Lavadora SmartWash 18 kg'])
    await comparar(page, nombre).click();
  await expect(accesoDeLaCabecera(page)).toHaveAccessibleName('Comparar productos (4)');

  // El quinto no entra: avisa y el botón sigue sin marcar.
  const quinto = comparar(page, 'Refrigeradora FreshMax 420 L');
  await quinto.click();
  await expect(
    page.getByText('Puedes comparar hasta 4 productos. Quita uno para agregar otro.'),
  ).toBeVisible();
  await expect(quinto).toHaveAttribute('aria-pressed', 'false');

  // Volver a pulsar uno elegido lo quita.
  await comparar(page, 'Lavadora SmartWash 18 kg').click();
  await expect(accesoDeLaCabecera(page)).toHaveAccessibleName('Comparar productos (3)');

  await accesoDeLaCabecera(page).click();
  await expect(page).toHaveURL(/\/comparar\?ids=p-001(%2C|,)p-004(%2C|,)p-005$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Comparar productos' })).toBeVisible();
  const columnas = tabla(page).getByRole('columnheader');
  await expect(columnas).toHaveText(['Característica', /OLED Vision/, /Soundbar Cinema 500/, /Monitor/]);
  for (const fila of ['Marca', 'Categoría', 'Precio', 'Disponibilidad', 'Características'])
    await expect(tabla(page).getByRole('rowheader', { name: fila })).toBeVisible();
  await expect(tabla(page).getByText('Subwoofer inalámbrico')).toBeVisible();

  // Quitar actualiza la tabla, la URL y la cabecera.
  await page.getByRole('button', { name: 'Quitar Soundbar Cinema 500 de la comparación' }).click();
  await expect(page).toHaveURL(/\/comparar\?ids=p-001(%2C|,)p-005$/);
  await expect(tabla(page)).toHaveAccessibleName('Comparación de 2 productos');
  await expect(accesoDeLaCabecera(page)).toHaveAccessibleName('Comparar productos (2)');

  // «Agregar al carrito» desde la comparación.
  await page.getByRole('button', { name: 'Agregar OLED Vision 55” 4K al carrito' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('un enlace compartido abre la misma comparación y quita los productos que ya no están a la venta', async ({
  page,
}) => {
  await page.goto('/comparar?ids=p-001,p-no-existe,p-004,p-001');
  await expect(tabla(page)).toHaveAccessibleName('Comparación de 2 productos');
  await expect(page.getByRole('status').filter({ hasText: 'ya no está a la venta' })).toHaveText(
    'Quitamos de la comparación un producto que ya no está a la venta.',
  );
  await expect(page).toHaveURL(/\/comparar\?ids=p-001(%2C|,)p-004$/);
  await expect(accesoDeLaCabecera(page)).toHaveAccessibleName('Comparar productos (2)');
  // No se guarda en el navegador (STD-08): solo el carrito.
  const claves = await page.evaluate(() => Object.keys(localStorage));
  expect(claves.filter((clave) => clave !== 'webstore-cart-v1')).toEqual([]);
});

test('sin productos elegidos, /comparar invita a elegirlos', async ({ page }) => {
  await page.goto('/comparar');
  await expect(page.getByRole('heading', { name: 'No hay productos para comparar' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver productos' })).toHaveAttribute('href', '/catalogo');
});

test('desde la ficha se agrega a la comparación y se llega a ella', async ({ page }) => {
  await page.goto('/catalogo/oled-vision-55-4k');
  const boton = page.getByRole('button', { name: 'Comparar OLED Vision 55” 4K', exact: true });
  await boton.click();
  await expect(boton).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Ver comparación (1)' }).click();
  await expect(page).toHaveURL(/\/comparar\?ids=p-001$/);
  await expect(tabla(page)).toHaveAccessibleName('Comparación de 1 productos');
});

test.describe('en el celular', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('la tabla se desliza de lado y la página no se desborda', async ({ page }) => {
    await page.goto('/comparar?ids=p-001,p-004,p-005');
    await expect(tabla(page)).toBeVisible();
    await expect(page.getByText('Desliza la tabla para ver todos los productos.')).toBeVisible();
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(desborde).toBeLessThanOrEqual(0);
    const region = page.getByRole('region', { name: 'Tabla de comparación' });
    const { ancho, visible } = await region.evaluate((elemento) => ({
      ancho: elemento.scrollWidth,
      visible: elemento.clientWidth,
    }));
    expect(ancho).toBeGreaterThan(visible);
  });
});
