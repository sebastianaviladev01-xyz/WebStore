import { expect, test, type Page } from '@playwright/test';

/**
 * Catálogo y detalle de producto: filtros por nombre, categoría y precio; ficha con galería, stock e IGV;
 * compra bloqueada sin stock. Datos del seed del BFF de prueba.
 */
const productos = (page: Page) => page.getByRole('main').getByRole('article');

async function elegir(page: Page, filtro: string, opcion: string): Promise<void> {
  await page.getByRole('combobox', { name: filtro }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
  // Espera a que el panel de opciones se cierre antes de abrir otro filtro.
  await expect(page.getByRole('listbox')).toHaveCount(0);
}

test('los filtros por nombre, categoría y precio acotan el catálogo', async ({ page }) => {
  await page.goto('/catalogo');
  // El conteo visible; una copia oculta lo anuncia a los lectores de pantalla (aria-live).
  await expect(page.getByText('6 productos', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(productos(page)).toHaveCount(6);

  await page.getByRole('searchbox', { name: 'Buscar por nombre' }).fill('lavadora');
  await expect(productos(page)).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 3, name: 'Lavadora SmartWash 18 kg' })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Buscar por nombre' }).fill('');
  await elegir(page, 'Categoría', 'Cocina');
  await expect(productos(page)).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 3, name: 'Microondas EasyCook 30 L' })).toBeVisible();

  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(productos(page)).toHaveCount(6);
  await page.getByRole('textbox', { name: 'Precio máximo (S/)' }).fill('1000');
  await page.getByRole('textbox', { name: 'Precio máximo (S/)' }).press('Enter');
  await expect(productos(page)).toHaveCount(2);
  await expect(page.getByRole('heading', { level: 3, name: 'Soundbar Cinema 500' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Microondas EasyCook 30 L' })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Buscar por nombre' }).fill('no existe');
  await expect(page.getByRole('heading', { name: 'No encontramos resultados' })).toBeVisible();
});

test('el enlace de una categoría abre el catálogo filtrado', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('region', { name: 'Compra por categoría' })
    .getByRole('link', { name: /^Monitores/ })
    .click();
  await expect(page).toHaveURL(/categoria=cat-computing/);
  await expect(productos(page)).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 3, name: 'Monitor UltraWide 34”' })).toBeVisible();
});

test('la ficha de producto muestra precio, stock y galería', async ({ page }) => {
  await page.goto('/catalogo');
  await page.getByRole('link', { name: 'Ver detalle de OLED Vision 55” 4K' }).click();
  await expect(page).toHaveURL('/catalogo/oled-vision-55-4k');
  await expect(page).toHaveTitle('WebStore | Detalle de producto');
  await expect(page.getByRole('heading', { level: 1, name: 'OLED Vision 55” 4K' })).toBeVisible();
  await expect(page.getByText('S/ 3,299.00').first()).toBeVisible();
  await expect(page.getByText('SKU TV-OLED-55-VSN')).toBeVisible();

  const segundaFoto = page.getByRole('button', { name: /^Ver foto 2 de \d+$/ });
  await segundaFoto.click();
  await expect(segundaFoto).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /^Ver foto 1 de \d+$/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('un producto sin stock no se puede agregar al carrito', async ({ page }) => {
  await page.goto('/catalogo/microondas-easycook-30-l');
  await expect(page.getByRole('heading', { level: 1, name: 'Microondas EasyCook 30 L' })).toBeVisible();
  await expect(page.getByText('Este producto no está disponible por el momento.')).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' })).toHaveCount(0);
});

test('una ficha inexistente avisa que el producto no se encontró', async ({ page }) => {
  await page.goto('/catalogo/producto-inexistente');
  await expect(page.getByRole('heading', { level: 1, name: 'Producto no encontrado' })).toBeVisible();
});
