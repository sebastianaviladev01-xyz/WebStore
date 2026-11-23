import { expect, test } from '@playwright/test';

import {
  correoUnico,
  cuentasAdmin,
  desplegarGrupo,
  fechaDeEntrega,
  ingresarAlAdmin,
  urls,
} from './apoyo/entorno';

/**
 * Compra como invitado: el checkout cotiza el envío por distrito, crea el pedido en el BFF, lo muestra en
 * «Mis pedidos» del dispositivo y el Admin lo ve en Pedidos y al comprador en Clientes. Feature 004 (D1, TEST-11):
 * se llega por «Ver carrito» y «Confirmar pedido», y el checkout dice «Finalizar compra» en el `h1`, en el título
 * del navegador y en el botón que crea el pedido. Como el `h1` y el botón comparten el texto, se buscan por rol.
 */
test('un invitado compra, consulta su pedido y el Admin lo recibe', async ({ page }) => {
  const correo = correoUnico('invitado');
  const nombre = 'Invitada E2E';
  const finalizar = page.getByRole('button', { name: 'Finalizar compra' });

  await page.goto('/catalogo/soundbar-cinema-500');
  await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ver carrito' }).click();
  await expect(page).toHaveURL('/carrito');
  await page.getByRole('main').getByRole('link', { name: 'Confirmar pedido' }).click();

  await expect(page).toHaveURL('/checkout');
  await expect(page).toHaveTitle('WebStore | Finalizar compra');
  await expect(page.getByRole('heading', { level: 1, name: 'Finalizar compra', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toHaveCount(0);
  await expect(finalizar).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Volver al carrito' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).fill(nombre);
  await page.getByRole('textbox', { name: 'Correo' }).fill(correo);
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('987654321');
  await page.getByRole('textbox', { name: 'DNI / documento' }).fill('45678912');
  await page.getByRole('combobox', { name: 'Distrito destino' }).click();
  await page.getByRole('option', { name: 'Miraflores', exact: true }).click();
  await page.getByRole('textbox', { name: 'Dirección' }).fill('Av. Larco 123');
  await page.getByRole('radio', { name: 'Yape / Plin' }).check();
  // Lote 04 (PBI-0040): la casilla de los términos es obligatoria.
  await page.getByRole('checkbox', { name: 'Acepto los términos y condiciones' }).check();

  await expect(page.getByText(/Envío cotizado:\s*S\/\s*12\.00/)).toBeVisible();
  // 699 del producto + 12 de envío a Miraflores.
  await expect(page.getByRole('main')).toContainText('S/ 711.00');
  await expect(finalizar).toBeEnabled();

  // El BFF responde enseguida: se retiene la respuesta para ver «Procesando…» mientras se envía.
  let soltar = () => {};
  const retenida = new Promise<void>((resolver) => (soltar = resolver));
  await page.route('**/bff/checkout/orders', async (ruta) => {
    await retenida;
    await ruta.continue();
  });
  await finalizar.click();
  await expect(page.getByRole('button', { name: 'Procesando…' })).toBeDisabled();
  soltar();

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
  // Al entrar solo está desplegado «General» (feature 003).
  await desplegarGrupo(page, 'Ventas');
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Pedidos' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(nombre);

  // Sin parámetro, el detalle muestra el pedido más reciente: el que se acaba de crear.
  await expect(page.getByRole('main').getByRole('heading', { level: 2, name: pedido })).toBeVisible();
  await expect(page.getByRole('main').getByRole('complementary')).toContainText(correo);

  // El Dashboard lo muestra al frente de «Últimos pedidos» y su «Ver» abre ese pedido en Pedidos.
  await page.goto(`${urls.admin}/`);
  const ultimos = page.getByRole('region', { name: 'Últimos pedidos' });
  const primeraFila = ultimos.getByRole('row').nth(1);
  await expect(primeraFila).toContainText(pedido);
  await primeraFila.getByRole('link', { name: `Ver el pedido ${pedido}` }).click();
  await expect(page).toHaveURL(`${urls.admin}/pedidos?pedido=${encodeURIComponent(pedido)}`);
  await expect(page.getByRole('main').getByRole('heading', { level: 2, name: pedido })).toBeVisible();

  // Con un segundo pedido, el primero ya no encabeza el listado: así `?pedido=` se distingue de lo de hoy.
  const respuesta = await page.request.post(`${urls.bff}/bff/checkout/orders`, {
    data: {
      customer: {
        fullName: 'Segundo E2E',
        email: correoUnico('segundo'),
        phone: '987654321',
        document: '45678912',
      },
      shipping: {
        addressLine: 'Av. Larco 456',
        district: 'Miraflores',
        province: 'Lima',
        department: 'Lima',
      },
      items: [{ productId: 'p-004', quantity: 1 }],
      paymentMethod: 'yape-plin',
      deliveryDate: fechaDeEntrega(),
      termsAccepted: true,
    },
  });
  expect(respuesta.ok()).toBeTruthy();
  const segundo = ((await respuesta.json()) as { id: string }).id;
  const detalle = (id: string) =>
    page.getByRole('main').getByRole('heading', { level: 2, name: id, exact: true });

  // `?pedido=<id>` selecciona ese pedido aunque no sea el más reciente.
  await page.goto(`${urls.admin}/pedidos?pedido=${encodeURIComponent(pedido)}`);
  await expect(detalle(pedido)).toBeVisible();
  await expect(detalle(segundo)).toHaveCount(0);

  // Un id que no existe se comporta como sin parámetro: el detalle es el pedido más reciente.
  await page.goto(`${urls.admin}/pedidos?pedido=NO-EXISTE`);
  await expect(detalle(segundo)).toBeVisible();
  await expect(detalle(pedido)).toHaveCount(0);

  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('link', { name: 'Clientes' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(correo);
});

test('TEST-11: con el carrito vacío, el checkout se titula «Finalizar compra» sobre el estado vacío', async ({
  page,
}) => {
  await page.goto('/checkout');
  await expect(page).toHaveURL('/checkout');
  await expect(page).toHaveTitle('WebStore | Finalizar compra');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Finalizar compra');
  await expect(page.getByRole('heading', { level: 2, name: 'No hay productos para comprar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Finalizar compra' })).toHaveCount(0);
});
