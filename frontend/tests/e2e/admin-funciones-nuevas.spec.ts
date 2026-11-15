import { expect, request as nuevoRequest, test, type Page } from '@playwright/test';

import { leerSnapshot } from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Lote 07b, Admin: funciones nuevas y lo que dejó el lote 07 (ADR-0017). Recorridos contra el BFF de prueba real:
 * - PBI-0155: Pedidos y Tarifas de envío con el panel de filtros estándar de la feature 008.
 * - PBI-0157: lo escrito en Tarifas de envío vuelve tras vencer la sesión, con su modo.
 * Las pruebas que cambian datos los dejan como estaban en un `finally`: las suites van en serie.
 */

/** Cierra la sesión del navegador en el BFF, como si hubiera vencido, sin que la página se entere. */
async function vencerSesion(page: Page): Promise<void> {
  const token = await page.evaluate(() => sessionStorage.getItem('webstore-admin-session-v1'));
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const respuesta = await api.delete('/bff/admin/sessions/current', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(respuesta.status()).toBe(204);
  } finally {
    await api.dispose();
  }
}

async function ingresarDeNuevo(page: Page, cuenta: { email: string; password: string }): Promise<void> {
  await page.getByRole('textbox', { name: 'Correo' }).fill(cuenta.email);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(cuenta.password);
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
}

test.describe('PBI-0155: Pedidos y Tarifas de envío con el panel estándar', () => {
  test('Tarifas: el panel va entre el título y la lista, filtra con «Buscar», en la URL, y se limpia', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/envios');
    const titulo = page.getByRole('heading', { level: 1, name: 'Tarifas de envío' });
    const panel = page.getByRole('search', { name: 'Filtros de tarifas' });
    const lista = page.getByRole('region', { name: 'Tarifas registradas' });
    const [cajaTitulo, cajaPanel, cajaLista] = await Promise.all(
      [titulo, panel, lista].map(async (zona) => (await zona.boundingBox())!),
    );
    expect(cajaPanel.y).toBeGreaterThan(cajaTitulo.y);
    expect(cajaLista.y).toBeGreaterThan(cajaPanel.y + cajaPanel.height - 1);

    // Escribir no filtra: filtra «Buscar».
    await panel.getByRole('textbox', { name: 'Buscar tarifa' }).fill('jesus maria');
    await expect(lista).toContainText('Surco');
    await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('texto')).toBe('jesus maria');
    await expect(lista).toContainText('Jesús María');
    await expect(lista).not.toContainText('Surco');

    await page.reload();
    await expect(panel.getByRole('textbox', { name: 'Buscar tarifa' })).toHaveValue('jesus maria');
    await expect(lista).not.toContainText('Surco');

    await panel.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(panel.getByRole('textbox', { name: 'Buscar tarifa' })).toHaveValue('');
    await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page).toHaveURL(/\/envios$/);
    await expect(lista).toContainText('Surco');
  });

  test('Pedidos: el estado se elige en el panel y se aplica con «Buscar»', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/pedidos');
    const panel = page.getByRole('search', { name: 'Filtros de pedidos' });
    await panel.getByRole('combobox', { name: 'Filtrar por estado' }).click();
    await page.getByRole('option', { name: 'Entregado' }).click();
    await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('estado')).toBe('delivered');
    await expect(page.getByRole('region', { name: 'Lista de pedidos' })).toContainText(
      /Ningún pedido cumple los filtros\.|Entregado/,
    );
    await page.goto('/pedidos?estado=desconocido');
    await expect(panel.getByRole('combobox', { name: 'Filtrar por estado' })).toContainText('Todos');
  });
});

test.describe('PBI-0157: lo escrito en Tarifas de envío cuando la sesión vence', () => {
  test('vuelve el precio para varios distritos y el ajuste porcentual, sin guardarse', async ({ page }) => {
    const antes = (await leerSnapshot()).rates;
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/envios');
    await page.getByRole('combobox', { name: 'Tienda de origen' }).fill('Lima Norte');
    await page.getByRole('textbox', { name: 'Distritos' }).fill('Comas, Independencia');
    await page.getByRole('spinbutton', { name: 'Porcentaje' }).fill('7');
    await vencerSesion(page);
    await page.getByRole('button', { name: 'Guardar 2 tarifas' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await ingresarDeNuevo(page, cuentasAdmin.superadmin);
    await expect(page).toHaveURL(/\/envios$/);
    await expect(page.getByRole('status').filter({ hasText: 'Recuperamos lo que escribiste' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Tienda de origen' })).toHaveValue('Lima Norte');
    await expect(page.getByRole('textbox', { name: 'Distritos' })).toHaveValue('Comas, Independencia');
    await expect(page.getByRole('spinbutton', { name: 'Porcentaje' })).toHaveValue('7');
    expect((await leerSnapshot()).rates).toEqual(antes);
  });

  test('vuelve a la edición de una tarifa, con lo que se había cambiado', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/envios');
    await page.getByRole('button', { name: 'Editar tarifa de Lima Centro a Lince' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Editar tarifa' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Precio (S/)' }).fill('13');
    await vencerSesion(page);
    await page.getByRole('button', { name: 'Guardar tarifa' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await ingresarDeNuevo(page, cuentasAdmin.superadmin);
    await expect(page).toHaveURL(/\/envios$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Editar tarifa' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Distrito', exact: true })).toHaveValue('Lince');
    await expect(page.getByRole('spinbutton', { name: 'Precio (S/)' })).toHaveValue('13');
  });
});
