import { expect, test } from '@playwright/test';

import { correoUnico } from './apoyo/entorno';

/**
 * Cuenta de cliente: registro, verificación con el código temporal que el BFF de prueba expone en la
 * respuesta (`WEBSTORE_EXPOSE_TEST_CODES`), inicio de sesión, edición del perfil y cierre de sesión.
 */
test('registrar, verificar, iniciar sesión y editar el perfil', async ({ page }) => {
  const correo = correoUnico('cliente');
  const contrasenia = 'Prueba2026x';

  await page.goto('/cuenta/registro');
  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).fill('Cliente E2E');
  await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('987654321');
  await page.getByRole('textbox', { name: 'DNI' }).fill('45678912');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(contrasenia);
  await page.getByRole('button', { name: 'Registrar y verificar correo' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Verifica tu cuenta' })).toBeVisible();
  await expect(page.getByText(`Ingresa el código temporal enviado a ${correo}.`)).toBeVisible();
  const canal = page.getByText('Canal local de demostración:').locator('..');
  await expect(canal).toHaveText(/\d{6}/);
  const codigo = (await canal.textContent())?.match(/\d{6}/)?.[0] ?? '';

  await page.getByRole('textbox', { name: 'Código' }).fill('000000');
  await page.getByRole('button', { name: 'Verificar cuenta' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.getByRole('textbox', { name: 'Código' }).fill(codigo);
  await page.getByRole('button', { name: 'Verificar cuenta' }).click();

  await expect(page).toHaveURL('/cuenta/login');
  await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(contrasenia);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL('/cuenta/perfil');
  await expect(page.getByRole('heading', { level: 1, name: 'Datos personales' })).toBeVisible();
  await expect(page.getByText(`${correo} · cuenta verificada`)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Cliente E2E');

  await page.getByRole('textbox', { name: 'Teléfono' }).fill('912345678');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('status')).toHaveText('Cambios guardados.');

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Teléfono' })).toHaveValue('912345678');

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/cuenta/perfil');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Inicia sesión para administrar tu cuenta' }),
  ).toBeVisible();
});

test('el inicio de sesión rechaza credenciales incorrectas', async ({ page }) => {
  await page.goto('/cuenta/login');
  await page.getByRole('textbox', { name: 'Correo' }).fill('nadie@example.com');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Incorrecta2026');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL('/cuenta/login');
});
