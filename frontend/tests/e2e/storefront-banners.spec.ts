import { expect, test } from '@playwright/test';

import { enviarCambios, leerSnapshot } from './apoyo/catalogo';

/**
 * Lote 06 (ADR-0017), PBI-0128: el enlace de un banner puede ser externo (`https://…`). La tienda lo abre como un
 * enlace normal; antes pasaba por el router y quedaba como una ruta rota de la tienda. Cambia el banner «bn-4» por
 * la API del Admin y lo deja como estaba.
 */
test('PBI-0128: el enlace externo de un banner de promoción lleva a esa dirección', async ({ page }) => {
  const banner = (await leerSnapshot()).banners.find((item) => item.id === 'bn-4')!;
  try {
    await enviarCambios({ banners: { upsert: [{ id: 'bn-4', ctaUrl: 'https://example.com/monitores' }] } });
    await page.goto('/');
    await expect(page.getByRole('link', { name: banner.cta })).toHaveAttribute(
      'href',
      'https://example.com/monitores',
    );
  } finally {
    await enviarCambios({ banners: { upsert: [{ id: 'bn-4', ctaUrl: banner.ctaUrl }] } });
  }
});

test('PBI-0128: un enlace de la tienda sigue siendo una ruta de la tienda', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Ver monitores' })).toHaveAttribute(
    'href',
    '/catalogo?categoria=cat-computing',
  );
});
