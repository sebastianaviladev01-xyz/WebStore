import { expect, test, type Locator } from '@playwright/test';

import { enviarCambios } from './apoyo/catalogo';

/**
 * Lote 07b (ADR-0017), PBI-0052: la tienda muestra la imagen pequeña de una categoría junto a su nombre, en el menú de
 * categorías del escritorio y en el panel del celular, solo si la categoría tiene una. Sin imagen, como antes. Lote 11
 * (ADR-0021, PBI-0162): también en el filtro «Categoría» del catálogo y en las tarjetas «Compra por categoría» del
 * inicio (`/inicio-anterior` se quitó en el lote 16, PBI-0193).
 */
/** PNG gris de 100 × 100 px: desde el lote 11 (PBI-0176) el BFF solo acepta la versión de 100 × 100 px. */
const IMAGEN =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAA5UlEQVR4nO3QQQ0AIAzAwElHOhbWFyG5U9B0DmvzOuAnZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBRdHfptnsVYXbAAAAABJRU5ErkJggg==';

/**
 * Lote 25 (ADR-0026, PBI-0228): la tienda no recibe la Data URL, sino la dirección del BFF con su versión, y la imagen
 * se carga desde ahí con sus 100 × 100 px.
 */
async function esperarImagenServida(imagen: Locator): Promise<void> {
  await expect(imagen).toHaveAttribute('src', /^\/bff\/images\/categories\/cat-tv\/image\?v=[\w-]+$/);
  await expect(imagen).toHaveJSProperty('naturalWidth', 100);
}

test.describe('imagen de la categoría', () => {
  test.beforeAll(async () => {
    await enviarCambios({ categories: { upsert: [{ id: 'cat-tv', imageUrl: IMAGEN }] } });
  });
  test.afterAll(async () => {
    await enviarCambios({ categories: { upsert: [{ id: 'cat-tv', imageUrl: null }] } });
  });

  test('en el escritorio, la categoría con imagen la muestra junto al nombre y las demás no', async ({
    page,
  }) => {
    await page.goto('/');
    const menu = page.getByRole('navigation', { name: 'Categorías principales' });
    const tv = menu.getByRole('button', { name: 'TV y audio' });
    await esperarImagenServida(tv.locator('img'));
    // Decorativa: el nombre de la categoría ya lo dice.
    await expect(tv.locator('img')).toHaveAttribute('alt', '');
    await expect(menu.getByRole('link', { name: 'Electrohogar', exact: true }).locator('img')).toHaveCount(0);
  });

  test('PBI-0162: el filtro «Categoría» del catálogo muestra la imagen junto al nombre, solo si la categoría la tiene', async ({
    page,
  }) => {
    await page.goto('/catalogo');
    await page.getByRole('combobox', { name: 'Categoría' }).click();
    const tv = page.getByRole('option', { name: 'TV y audio', exact: true });
    await esperarImagenServida(tv.locator('img'));
    await expect(tv.locator('img')).toHaveAttribute('alt', '');
    await expect(page.getByRole('option', { name: 'Electrohogar', exact: true }).locator('img')).toHaveCount(
      0,
    );
    // Al elegirla, el campo muestra solo el nombre.
    await tv.click();
    await expect(page.getByRole('combobox', { name: 'Categoría' })).toHaveText('TV y audio');
  });

  test('PBI-0162: las tarjetas «Compra por categoría» del inicio muestran la imagen, solo si la categoría la tiene', async ({
    page,
  }) => {
    await page.goto('/');
    const seccion = page.getByRole('region', { name: 'Compra por categoría' });
    const tv = seccion.getByRole('link', { name: /^TV y audio/ });
    await esperarImagenServida(tv.locator('img'));
    await expect(tv.locator('img')).toHaveAttribute('alt', '');
    await expect(seccion.getByRole('link', { name: /^Electrohogar/ }).locator('img')).toHaveCount(0);
  });

  test.describe('en el celular', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('el panel de navegación muestra la imagen junto al nombre de la categoría', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
      const panel = page.getByRole('navigation', { name: 'Navegación móvil' });
      await esperarImagenServida(panel.locator('summary', { hasText: 'TV y audio' }).locator('img'));
      await expect(panel.locator('summary', { hasText: 'Electrohogar' }).locator('img')).toHaveCount(0);
    });
  });
});
