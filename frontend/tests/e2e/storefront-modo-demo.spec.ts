import { expect, test } from '@playwright/test';

import { urls } from './apoyo/entorno';
import { COOKIE_VISTA_PREVIA, PRIMARIO, primario, tuerca, vistaPrevia } from './apoyo/modo-demo';

/**
 * Modo demo en la tienda. Desde el lote 14 (PBI-0188, ADR-0022) la tienda no tiene tuerca: el tema se configura en el
 * Admin. En modo demo, la tienda pinta la vista previa que eligió la tuerca del Admin (la cookie se comparte en el
 * mismo host), así que la demo sigue enseñando A, B y C en la tienda.
 */
const vistaPreviaEn = (valor: string) => ({
  name: COOKIE_VISTA_PREVIA,
  value: valor,
  domain: new URL(urls.storefront).hostname,
  path: '/',
});

test('la tienda no tiene tuerca, tampoco en modo demo', async ({ page }) => {
  for (const ruta of ['/', '/catalogo', '/carrito', '/no-existe']) {
    await page.goto(ruta);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('ws-root')).not.toBeEmpty();
    await expect(page.locator('ws-selector-tema')).toHaveCount(0);
    await expect(tuerca(page)).toHaveCount(0);
  }
});

test('la tienda pinta la vista previa de A, B o C que eligió el Admin, sin tuerca', async ({
  page,
  context,
}) => {
  await context.addCookies([vistaPreviaEn('c')]);
  await page.goto('/');
  await expect.poll(() => primario(page)).toBe(PRIMARIO.c);
  await expect(tuerca(page)).toHaveCount(0);
  expect(await vistaPrevia(context)).toBe('c');
});

test('una vista previa que no es A, B ni C se ignora y se borra', async ({ page, context }) => {
  await context.addCookies([vistaPreviaEn('no-es-un-predefinido')]);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(await primario(page)).toBe(PRIMARIO.b);
  await expect.poll(() => vistaPrevia(context)).toBeNull();
});
