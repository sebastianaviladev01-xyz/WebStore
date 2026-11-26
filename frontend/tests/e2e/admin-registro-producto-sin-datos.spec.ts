import { expect, test } from '@playwright/test';

import { leerProductos } from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 40 (ADR-0032), PBI-0256: al abrir el registro de un producto en una carga nueva, el panel todavía no tiene
 * datos. Si la consulta del snapshot falla, la página no dice que el producto no existe: avisa de que no pudo traer
 * los datos y ofrece «Reintentar». «Este producto ya no existe» queda para cuando la consulta responde sin él.
 */
test.describe('Registro del producto sin datos del panel', () => {
  test('PBI-0256: si la consulta falla en una carga nueva, avisa y reintenta, sin decir que el producto no existe', async ({
    page,
  }) => {
    const producto = (await leerProductos()).find((item) => item.id === 'p-002')!;
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);

    let fallar = true;
    let consultas = 0;
    await page.route('**/bff/admin/snapshot', (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      consultas++;
      if (!fallar) return route.fallback();
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"UNAVAILABLE"}' });
    });
    // Carga nueva: el panel arranca sin datos y la sesión se restaura del token.
    await page.goto('/productos/p-002');

    const principal = page.getByRole('main');
    const aviso = principal.getByRole('alert').filter({ hasText: 'No pudimos traer los datos del producto' });
    await expect(aviso).toBeVisible();
    await expect(aviso.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(principal.getByText('Este producto ya no existe')).toHaveCount(0);
    await expect(principal.getByRole('form', { name: 'Editar producto' })).toHaveCount(0);
    expect(consultas).toBe(1);

    // Con el BFF de vuelta, «Reintentar» trae el producto y muestra el formulario, sin avisos.
    fallar = false;
    await aviso.getByRole('button', { name: 'Reintentar' }).click();
    const formulario = principal.getByRole('form', { name: 'Editar producto' });
    await expect(formulario.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue(producto.name);
    await expect(principal.getByRole('alert')).toHaveCount(0);
    expect(consultas).toBe(2);
  });

  test('PBI-0256: si la consulta responde sin el producto, dice que ya no existe', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/productos/p-no-existe-040');
    const principal = page.getByRole('main');
    await expect(principal.getByRole('alert')).toContainText('Este producto ya no existe');
    await expect(principal.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
  });
});
