import { expect, test } from '@playwright/test';

import { cuentasAdmin, desplegarGrupo, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Libro de reclamaciones: el formulario público registra la solicitud con una constancia `REC-*` y el Admin
 * la recibe en su bandeja de Reclamaciones.
 */
test('registrar un reclamo y verlo en la bandeja del Admin', async ({ page }) => {
  const nombre = 'Reclamante E2E';

  await page.goto('/libro-reclamaciones');
  await page.getByRole('textbox', { name: 'Nombre completo' }).fill(nombre);
  await page.getByRole('textbox', { name: 'DNI / documento' }).fill('45678912');
  await page.getByRole('textbox', { name: 'Correo' }).fill('reclamante@example.com');
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('987654321');
  await page.getByRole('textbox', { name: 'Domicilio' }).fill('Av. Arequipa 456, Lince');
  await page.getByRole('textbox', { name: 'Producto o servicio' }).fill('Soundbar Cinema 500');
  await page.getByRole('spinbutton', { name: 'Monto del bien' }).fill('699');
  await page
    .getByRole('textbox', { name: 'Detalle de lo ocurrido' })
    .fill('El producto llegó con la caja dañada.');
  await page.getByRole('textbox', { name: 'Pedido del consumidor' }).fill('Cambio del producto.');
  await page.getByRole('button', { name: 'Registrar solicitud' }).click();

  const constancia = page.getByRole('status');
  await expect(constancia.getByRole('heading', { name: 'Solicitud registrada' })).toBeVisible();
  const codigoVisible = constancia.getByText(/^REC-[\w-]+$/);
  await expect(codigoVisible).toBeVisible();
  await expect(constancia).toContainText('S/ 699.00');
  const codigo = ((await codigoVisible.textContent()) ?? '').trim();
  expect(codigo).toMatch(/^REC-/);

  await constancia.getByRole('button', { name: 'Registrar otra solicitud' }).click();
  await expect(page.getByRole('button', { name: 'Registrar solicitud' })).toBeVisible();

  await ingresarAlAdmin(page, cuentasAdmin.superadmin, urls.admin);
  // Al entrar solo está desplegado «General» (feature 003).
  await desplegarGrupo(page, 'Ventas');
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Reclamaciones' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Reclamaciones' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(codigo);
  await expect(page.getByRole('main')).toContainText(nombre);
});
