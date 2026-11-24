import { expect, test, type Page } from '@playwright/test';

import { enviarCambios, leerSnapshot } from './apoyo/catalogo';
import {
  correoUnico,
  cuentasAdmin,
  desplegarGrupo,
  fechaDeEntrega,
  ingresarAlAdmin,
  menuAdmin,
  terminosAceptados,
  urls,
} from './apoyo/entorno';
import { conservarElStock } from './apoyo/pedidos';

// Los pedidos que crea esta spec se cancelan al terminar: el stock queda como estaba (PBI-0207).
conservarElStock();

/**
 * Lote 19 (ADR-0021, PBI-0006; provisional, por confirmar con Daniel): el superadministrador elige en «Entregas y
 * feriados» una dirección por pedido o una por producto, y el detalle del pedido muestra la dirección de cada producto
 * que va a otra. Las pruebas que cambian la configuración la dejan como estaba en un `finally`.
 */

const abrirEntregas = async (page: Page) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await desplegarGrupo(page, 'Tienda');
  await menuAdmin(page).getByRole('link', { name: 'Entregas y feriados', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Entregas y feriados' })).toBeVisible();
};

test('el superadministrador elige una dirección por producto y la tienda la recibe', async ({ page }) => {
  try {
    await abrirEntregas(page);
    const grupo = page.getByRole('radiogroup', { name: 'Dirección de entrega' });
    await expect(grupo.getByRole('radio', { name: 'Una dirección por pedido' })).toBeChecked();
    await expect(
      page.getByText('Todo el pedido se entrega en la dirección que indica el comprador.'),
    ).toBeVisible();

    await grupo.getByRole('radio', { name: 'Una dirección por producto' }).check();
    await expect(page.getByText('El envío se cobra una vez por cada dirección distinta.')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar dirección de entrega' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'La tienda ya usa esta opción.' })).toBeVisible();
    expect((await leerSnapshot()).config['deliveryAddressMode']).toBe('per-product');
    const ajustes = await (await page.request.get(`${urls.bff}/bff/content/settings`)).json();
    expect(ajustes.deliveryAddressMode).toBe('per-product');
    // La primera fecha de entrega no cambió con este guardado.
    expect((await leerSnapshot()).config['firstDeliveryDay']).toBe('next-calendar-day');
  } finally {
    await enviarCambios({ config: { deliveryAddressMode: 'per-order' } });
  }
});

test('el detalle del pedido muestra la dirección de cada producto que va a otra', async ({ page }) => {
  await enviarCambios({ config: { deliveryAddressMode: 'per-product' } });
  let pedido!: { id: string; accessToken: string };
  try {
    const respuesta = await page.request.post(`${urls.bff}/bff/checkout/orders`, {
      data: {
        customer: {
          fullName: 'Cliente Lote 19',
          email: correoUnico('admin-lote19'),
          phone: '999888777',
          document: '12345678',
        },
        shipping: {
          addressLine: 'Av. Principal 123',
          district: 'San Isidro',
          province: 'Lima',
          department: 'Lima',
        },
        deliveryDate: fechaDeEntrega(2),
        paymentMethod: 'card',
        items: [
          { productId: 'p-001', quantity: 1 },
          {
            productId: 'p-004',
            quantity: 1,
            shipping: {
              addressLine: 'Calle Regalo 456',
              district: 'Miraflores',
              province: 'Lima',
              department: 'Lima',
              reference: 'Portón verde',
            },
          },
        ],
        ...(await terminosAceptados(page.request)),
      },
    });
    expect(respuesta.status()).toBe(201);
    pedido = await respuesta.json();
  } finally {
    await enviarCambios({ config: { deliveryAddressMode: 'per-order' } });
  }
  try {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(`/pedidos?pedido=${pedido.id}`);
    const detalle = page.getByRole('complementary').filter({ hasText: pedido.id });
    await expect(detalle).toContainText(
      'Se entrega en otra dirección: Calle Regalo 456, Miraflores, Lima, Lima (Portón verde)',
    );
    await expect(detalle.getByText('Se entrega en otra dirección')).toHaveCount(1);
    await expect(detalle).toContainText('Av. Principal 123, San Isidro');
  } finally {
    await page.request.patch(`${urls.bff}/bff/orders/${pedido.id}/cancel`, {
      headers: { 'x-order-token': pedido.accessToken },
      data: {},
    });
  }
});
