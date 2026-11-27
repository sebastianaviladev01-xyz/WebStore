import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin, menuAdmin } from './apoyo/entorno';

/**
 * Ruta de navegación en la barra superior del backoffice (lote 44, ADR-0033, PBI-0271; decidido por Sebastián Avila el
 * 2026-11-26, sin esperar a Daniel), como el SGC: el ícono del módulo, el grupo del menú lateral y la página. Las
 * páginas de registro llevan, además, su listado como enlace. Es un `nav` «Ruta de navegación» con una lista y
 * `aria-current="page"` en la última. En el celular, si no cabe, solo se ve la página actual.
 */

const ruta = (page: Page) => page.getByRole('navigation', { name: 'Ruta de navegación' });

/** El texto de cada tramo visible de la ruta, en orden. */
async function tramosVisibles(page: Page): Promise<string[]> {
  const tramos = ruta(page).getByRole('listitem');
  const textos: string[] = [];
  for (const tramo of await tramos.all())
    if (await tramo.isVisible()) textos.push((await tramo.innerText()).trim());
  return textos;
}

/** Trazo del ícono de una entrada del menú lateral. */
async function trazoDelMenu(page: Page, entrada: string): Promise<string | null> {
  return menuAdmin(page)
    .getByRole('link', { name: entrada, exact: true, includeHidden: true })
    .first()
    .locator('svg path')
    .first()
    .getAttribute('d');
}

test.describe('PBI-0271: ruta de navegación en la barra superior', () => {
  test('una página del menú muestra el ícono de su módulo, su grupo y su nombre', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await expect(ruta(page)).toBeVisible();
    await expect(ruta(page).getByRole('listitem')).toHaveText(['General', 'Dashboard']);

    await page.goto('/productos');
    await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
    await expect(ruta(page).getByRole('listitem')).toHaveText(['Catálogo', 'Productos']);
    // La página actual lleva `aria-current` y no es un enlace; el grupo tampoco lo es.
    await expect(ruta(page).getByRole('link')).toHaveCount(0);
    await expect(ruta(page).locator('[aria-current="page"]')).toHaveText('Productos');
    // El ícono es el de su entrada del menú, decorativo.
    const icono = ruta(page).locator('svg').first();
    await expect(icono).toHaveAttribute('aria-hidden', 'true');
    expect(await icono.locator('path').first().getAttribute('d')).toBe(await trazoDelMenu(page, 'Productos'));
    // Sin el texto fijo que había antes en la barra.
    await expect(page.getByText('Backoffice de la tienda')).toHaveCount(0);

    // Los nombres son los del menú, aunque el título de la pestaña diga otra cosa.
    await page.goto('/envios');
    await expect(ruta(page).getByRole('listitem')).toHaveText(['Tienda', 'Tarifas de envío']);
    await page.goto('/usuarios');
    await expect(ruta(page).getByRole('listitem')).toHaveText(['Accesos', 'Usuarios y roles']);
  });

  test('un registro muestra el grupo, el listado como enlace con sus filtros y la página actual', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/productos?nombre=tv');
    await page.getByRole('link', { name: 'Agregar producto', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Nuevo producto' })).toBeVisible();
    await expect(ruta(page).getByRole('listitem')).toHaveText(['Catálogo', 'Productos', 'Nuevo producto']);
    await expect(ruta(page).locator('[aria-current="page"]')).toHaveText('Nuevo producto');

    const listado = ruta(page).getByRole('link', { name: 'Productos', exact: true });
    await expect(listado).toHaveAttribute('href', '/productos?nombre=tv');
    await listado.click();
    await expect(page).toHaveURL(/\/productos\?nombre=tv$/);
    await expect(ruta(page).getByRole('listitem')).toHaveText(['Catálogo', 'Productos']);

    await page.goto('/categorias/nueva');
    await expect(ruta(page).getByRole('listitem')).toHaveText(['Catálogo', 'Categorías', 'Nueva categoría']);
    await page.goto('/usuarios/nuevo');
    await expect(ruta(page).getByRole('listitem')).toHaveText([
      'Accesos',
      'Usuarios y roles',
      'Nuevo usuario',
    ]);
    await page.goto('/productos/p-004');
    await expect(ruta(page).getByRole('listitem')).toHaveText(['Catálogo', 'Productos', 'Editar producto']);
  });

  test('Perfil, que no está en el menú, muestra solo su nombre', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible();
    await expect(ruta(page).getByRole('listitem')).toHaveText(['Perfil']);
    await expect(ruta(page).locator('[aria-current="page"]')).toHaveText('Perfil');
  });

  test('la ruta cambia al navegar con el menú lateral', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/productos');
    await menuAdmin(page).getByRole('link', { name: 'Inventario', exact: true }).click();
    await expect(page).toHaveURL(/\/inventario$/);
    await expect(ruta(page).getByRole('listitem')).toHaveText(['Catálogo', 'Inventario']);
  });

  test('en el celular, solo se ve la página actual y la barra no se desborda', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/productos/nuevo');
    await expect(page.getByRole('heading', { level: 1, name: 'Nuevo producto' })).toBeVisible();
    await expect.poll(() => tramosVisibles(page)).toEqual(['Nuevo producto']);
    // Los demás tramos siguen en la lista, ocultos hasta que haya sitio.
    await expect(ruta(page).getByRole('listitem', { includeHidden: true })).toHaveCount(3);
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => tramosVisibles(page)).toEqual(['Catálogo', 'Productos', 'Nuevo producto']);
  });
});
