import { expect, test } from '@playwright/test';

import { enviarCambios } from './apoyo/catalogo';

/**
 * Lote 07b (ADR-0017), PBI-0052: la tienda muestra la imagen pequeña de una categoría junto a su nombre, en el menú de
 * categorías del escritorio y en el panel del celular, solo si la categoría tiene una. Sin imagen, como antes.
 */
/** PNG gris de 100 × 100 px: desde el lote 11 (PBI-0176) el BFF solo acepta la versión de 100 × 100 px. */
const IMAGEN =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAA5UlEQVR4nO3QQQ0AIAzAwElHOhbWFyG5U9B0DmvzOuAnZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBWYFZgVmBRdHfptnsVYXbAAAAABJRU5ErkJggg==';

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
    await expect(tv.locator('img')).toHaveAttribute('src', IMAGEN);
    // Decorativa: el nombre de la categoría ya lo dice.
    await expect(tv.locator('img')).toHaveAttribute('alt', '');
    await expect(menu.getByRole('link', { name: 'Electrohogar', exact: true }).locator('img')).toHaveCount(0);
  });

  test.describe('en el celular', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('el panel de navegación muestra la imagen junto al nombre de la categoría', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
      const panel = page.getByRole('navigation', { name: 'Navegación móvil' });
      await expect(panel.locator('summary', { hasText: 'TV y audio' }).locator('img')).toHaveAttribute(
        'src',
        IMAGEN,
      );
      await expect(panel.locator('summary', { hasText: 'Electrohogar' }).locator('img')).toHaveCount(0);
    });
  });
});
