import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * CMS compartido: desactivar una página informativa en Contenido la bloquea en el Storefront (el guard lleva al
 * inicio) y activarla de nuevo la vuelve a publicar. La prueba deja la página activada al terminar.
 */
const terminos = `${urls.storefront}/info/terminos`;

async function publicarTerminos(page: Page, activa: boolean): Promise<void> {
  await page.goto('/contenido');
  await expect(page.getByRole('heading', { level: 1, name: 'Contenido y configuración' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Términos y condiciones' }).setChecked(activa);
  await page.getByRole('button', { name: 'Guardar configuración' }).click();
  await expect(page.getByRole('status')).toHaveText('Configuración publicada en la tienda.');
}

test('desactivar Términos en el CMS bloquea la página en el Storefront', async ({ page, context }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const tienda = await context.newPage();

  try {
    await publicarTerminos(page, false);
    await tienda.goto(terminos);
    await expect(tienda).toHaveURL(`${urls.storefront}/`);
    await expect(tienda.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toHaveCount(0);
  } finally {
    await publicarTerminos(page, true);
  }

  await tienda.goto(terminos);
  await expect(tienda).toHaveURL(terminos);
  await expect(tienda.getByRole('heading', { level: 1, name: 'Términos y condiciones' })).toBeVisible();
});
