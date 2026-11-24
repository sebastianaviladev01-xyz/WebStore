import { expect, test, type Page, type Request } from '@playwright/test';

import { enviarCambios } from './apoyo/catalogo';
import { correoUnico, fechaDeEntrega } from './apoyo/entorno';

/**
 * Lote 19 (ADR-0021, PBI-0006; provisional, por confirmar con Daniel): la configuración de la tienda elige una dirección
 * por pedido (por defecto) o una por producto. Con una por producto, el checkout deja enviar cada producto a otra
 * dirección y cobra el envío una vez por dirección distinta. Las pruebas que cambian la configuración la dejan como
 * estaba en un `finally`: las suites van en serie.
 */
const CARRITO = 'webstore-cart-v1';

async function conCarrito(page: Page): Promise<void> {
  await page.addInitScript(
    ([clave, valor]) => {
      if (sessionStorage.getItem('e2e-carrito-iniciado')) return;
      localStorage.setItem(clave, valor);
      sessionStorage.setItem('e2e-carrito-iniciado', '1');
    },
    [
      CARRITO,
      JSON.stringify([
        { productId: 'p-001', quantity: 1 },
        { productId: 'p-004', quantity: 1 },
      ]),
    ] as const,
  );
}

const modo = (deliveryAddressMode: 'per-order' | 'per-product') =>
  enviarCambios({ config: { deliveryAddressMode } });

/** Llena el checkout como invitado con la dirección de entrega en San Isidro (S/ 12.00). */
async function llenarCheckout(page: Page): Promise<void> {
  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).fill('Comprador Lote 19');
  await page.getByRole('textbox', { name: 'Correo' }).fill(correoUnico('lote19'));
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('987654321');
  await page.getByRole('textbox', { name: 'DNI / documento' }).fill('45678912');
  await page.getByRole('combobox', { name: 'Distrito destino' }).click();
  await page.getByRole('option', { name: 'San Isidro', exact: true }).click();
  await page.getByRole('textbox', { name: 'Dirección', exact: true }).first().fill('Av. Principal 123');
  await page.getByLabel('Fecha de entrega preferida').fill(fechaDeEntrega(2));
  await expect(page.getByText(/Envío cotizado:\s*S\/\s*12\.00/)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Acepto los términos y condiciones' }).check();
}

/** La barra de sonido va a otra dirección, en Miraflores (S/ 12.00). */
async function soundbarAOtraDireccion(page: Page): Promise<void> {
  const linea = page.getByRole('group', { name: 'Soundbar Cinema 500' });
  await linea.getByRole('radio', { name: 'Otra dirección' }).check();
  await linea.getByRole('combobox', { name: 'Distrito' }).click();
  await page.getByRole('option', { name: 'Miraflores', exact: true }).click();
  await linea.getByRole('textbox', { name: 'Dirección', exact: true }).fill('Calle Regalo 456');
  await linea.getByRole('textbox', { name: 'Referencia' }).fill('Portón verde');
}

/** La fila «Envío» del resumen del pedido, con su monto. */
const envio = (page: Page) => page.getByText('Envío', { exact: true }).locator('..');

test('con una dirección por pedido (por defecto), el checkout no pide direcciones por producto', async ({
  page,
}) => {
  await conCarrito(page);
  await page.goto('/checkout');
  await llenarCheckout(page);
  await expect(page.getByRole('heading', { name: 'Dirección de cada producto' })).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Envío por dirección' })).toHaveCount(0);
  await expect(envio(page)).toContainText('S/ 12.00');
});

test('con una por producto, cada producto puede ir a otra dirección y el envío se cobra por dirección', async ({
  page,
}) => {
  await modo('per-product');
  try {
    await conCarrito(page);
    const enviados: Request[] = [];
    page.on('request', (peticion) => {
      if (peticion.url().includes('/bff/checkout/orders')) enviados.push(peticion);
    });
    await page.goto('/checkout');
    await llenarCheckout(page);
    await expect(page.getByRole('heading', { name: 'Dirección de cada producto' })).toBeVisible();
    const tele = page.getByRole('group', { name: 'OLED Vision 55” 4K' });
    await expect(tele.getByRole('radio', { name: 'La dirección de entrega' })).toBeChecked();
    // Mientras todos van a la dirección de entrega, el envío es el cotizado.
    await expect(envio(page)).toContainText('S/ 12.00');

    await soundbarAOtraDireccion(page);
    const desglose = page.getByRole('list', { name: 'Envío por dirección' });
    await expect(desglose.getByRole('listitem')).toHaveText([
      /San Isidro · Av\. Principal 123\s*S\/\s*12\.00/,
      /Miraflores · Calle Regalo 456\s*S\/\s*12\.00/,
    ]);
    await expect(envio(page)).toContainText('S/ 24.00');

    await page.getByRole('button', { name: 'Finalizar compra' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
    expect(enviados).toHaveLength(1);
    const comando = enviados[0].postDataJSON();
    expect(comando.shipping).toMatchObject({ district: 'San Isidro', addressLine: 'Av. Principal 123' });
    expect(comando.items[0].shipping).toBeUndefined();
    expect(comando.items[1].shipping).toMatchObject({
      district: 'Miraflores',
      addressLine: 'Calle Regalo 456',
      reference: 'Portón verde',
    });
    expect(comando.shippingCost).toBe(24);

    // El detalle del pedido del cliente dice a dónde va la barra de sonido.
    const id = new URL(page.url()).pathname.split('/').pop();
    await page.goto(`/pedidos/${id}`);
    await expect(
      page.getByText('Se entrega en: Calle Regalo 456, Miraflores, Lima, Lima (Portón verde)'),
    ).toBeVisible();
  } finally {
    await modo('per-order');
  }
});

test('si la tienda vuelve a una por pedido mientras se compra, avisa y quita las direcciones por producto', async ({
  page,
}) => {
  await modo('per-product');
  try {
    await conCarrito(page);
    await page.goto('/checkout');
    await llenarCheckout(page);
    await soundbarAOtraDireccion(page);
    await modo('per-order');
    await page.getByRole('button', { name: 'Finalizar compra' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'una sola dirección' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dirección de cada producto' })).toHaveCount(0);
    await expect(envio(page)).toContainText('S/ 12.00');
    // Ahora se compra con una sola dirección.
    await page.getByRole('button', { name: 'Finalizar compra' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
  } finally {
    await modo('per-order');
  }
});
