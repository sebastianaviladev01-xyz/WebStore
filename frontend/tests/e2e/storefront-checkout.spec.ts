import { expect, test } from '@playwright/test';

import { correoUnico, cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Compra como invitado: el checkout cotiza el envío por distrito, crea el pedido en el BFF, lo muestra en
 * «Mis pedidos» del dispositivo y el Admin lo ve en Pedidos y al comprador en Clientes.
 */
test('un invitado compra, consulta su pedido y el Admin lo recibe', async ({ page }) => {
  const correo = correoUnico('invitado');
  const nombre = 'Invitada E2E';

  await page.goto('/catalogo/soundbar-cinema-500');
  await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Finalizar compra' }).click();

  await expect(page).toHaveURL('/checkout');
  await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeDisabled();

  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).fill(nombre);
  await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('987654321');
  await page.getByRole('textbox', { name: 'DNI / documento' }).fill('45678912');
  await page.getByRole('combobox', { name: 'Distrito destino' }).click();
  await page.getByRole('option', { name: 'Miraflores', exact: true }).click();
  await page.getByRole('textbox', { name: 'Dirección' }).fill('Av. Larco 123');
  await page.getByRole('radio', { name: 'Yape / Plin' }).check();

  await expect(page.getByText(/Envío cotizado:\s*S\/\s*12\.00/)).toBeVisible();
  // 699 del producto + 12 de envío a Miraflores.
  await expect(page.getByRole('main')).toContainText('S/ 711.00');
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
  await expect(page).toHaveURL(/\/pedido\//);
  const pedido = decodeURIComponent(page.url().split('/pedido/')[1]);
  await expect(page.getByRole('main')).toContainText(pedido);
  await expect(page.getByRole('main')).toContainText('S/ 711.00');

  await page.getByRole('link', { name: 'Ver pedido' }).click();
  await expect(page).toHaveTitle('WebStore | Detalle de pedido');
  await expect(page.getByRole('main')).toContainText(pedido);
  await expect(page.getByRole('main')).toContainText('Soundbar Cinema 500');

  await page.goto('/pedidos');
  await expect(page.getByRole('main')).toContainText(pedido);

  // El carrito queda vacío después de comprar.
  await page.goto('/carrito');
  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible();

  await ingresarAlAdmin(page, cuentasAdmin.superadmin, urls.admin);
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Pedidos' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(nombre);

  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Clientes' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(correo);
});
