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

/**
 * Lote 17 (ADR-0021; provisional, por confirmar con Daniel): «Entregas y feriados» del superadministrador, con la
 * primera fecha de entrega (PBI-0178) y los días no laborables (PBI-0183); la versión de los términos aceptada en el
 * detalle del pedido y la vigente en Contenido (PBI-0177). Las pruebas que cambian datos los dejan como estaban en un
 * `finally`: las suites van en serie.
 */

const abrirEntregas = async (page: Page) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await desplegarGrupo(page, 'Tienda');
  await menuAdmin(page).getByRole('link', { name: 'Entregas y feriados', exact: true }).click();
  await expect(page).toHaveTitle('WebStore Admin | Entregas y feriados');
  await expect(page.getByRole('heading', { level: 1, name: 'Entregas y feriados' })).toBeVisible();
};

/** La primera fecha que el BFF da a la tienda ahora. */
const primeraFecha = async (page: Page): Promise<string> =>
  (await (await page.request.get(`${urls.bff}/bff/checkout/delivery-dates`)).json()).minimum;

test('PBI-0178: el superadministrador elige la primera fecha de entrega y la tienda la usa', async ({
  page,
}) => {
  const anterior = (await leerSnapshot()).config;
  try {
    await abrirEntregas(page);
    const grupo = page.getByRole('radiogroup', { name: 'Primera fecha de entrega' });
    await expect(grupo.getByRole('radio', { name: 'El día calendario siguiente' })).toBeChecked();
    await expect(
      page.getByText('El comprador puede elegir desde el día siguiente al pedido, aunque sea sábado'),
    ).toBeVisible();
    expect(await primeraFecha(page)).toBe(fechaDeEntrega(1));

    await grupo.getByRole('radio', { name: 'El mismo día' }).check();
    await page.getByLabel('Hora de corte (opcional)').fill('23:59');
    await expect(
      page.getByText('Pedidos hasta las 23:58: desde el mismo día. Desde las 23:59: desde el día siguiente.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Guardar primera fecha' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'La tienda ya usa esta regla.' })).toBeVisible();
    const config = (await leerSnapshot()).config;
    expect([config['firstDeliveryDay'], config['deliveryCutoffTime']]).toEqual(['same-day', '23:59']);
    // Antes de las 23:59 de Lima, hoy; a esa hora exacta o después, mañana.
    expect([fechaDeEntrega(0), fechaDeEntrega(1)]).toContain(await primeraFecha(page));
  } finally {
    await enviarCambios({
      config: {
        firstDeliveryDay: anterior['firstDeliveryDay'],
        deliveryCutoffTime: anterior['deliveryCutoffTime'],
      },
    });
  }
});

test('PBI-0183: el superadministrador agrega y quita días no laborables, con filtro por año', async ({
  page,
}) => {
  const anio = String(Number(fechaDeEntrega(0).slice(0, 4)) + 1);
  const fecha = `${anio}-07-28`;
  const visible = `28/07/${anio}`;
  try {
    await abrirEntregas(page);
    await page.getByLabel('Fecha', { exact: true }).fill(fecha);
    await page.getByLabel('Nombre (opcional)').fill('Fiestas Patrias');
    await page.getByRole('button', { name: 'Agregar' }).click();

    // El año del día agregado queda a la vista.
    await expect(page.getByRole('combobox', { name: 'Año' })).toHaveText(anio);
    const tabla = page.getByRole('table', { name: `Días no laborables de ${anio}` });
    const fila = tabla.getByRole('row').filter({ hasText: visible });
    await expect(fila).toContainText('Fiestas Patrias');
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    await expect(fila).toContainText(dias[new Date(`${fecha}T12:00:00Z`).getUTCDay()]);

    // Repetida: se avisa sin enviar.
    let guardados = 0;
    page.on('request', (peticion) => {
      if (peticion.method() === 'PUT' && peticion.url().endsWith('/bff/admin/snapshot')) guardados += 1;
    });
    await page.getByLabel('Fecha', { exact: true }).fill(fecha);
    await page.getByRole('button', { name: 'Agregar' }).click();
    await expect(page.getByRole('alert')).toHaveText(`El ${visible} ya está en el calendario.`);
    expect(guardados).toBe(0);

    // Otro año en el filtro: la lista cambia.
    await page.getByRole('combobox', { name: 'Año' }).click();
    await page.getByRole('option', { name: fechaDeEntrega(0).slice(0, 4) }).click();
    await expect(page.getByRole('table', { name: `Días no laborables de ${anio}` })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Año' }).click();
    await page.getByRole('option', { name: anio }).click();

    page.once('dialog', (dialogo) => void dialogo.accept());
    await tabla.getByRole('button', { name: `Quitar el ${visible}` }).click();
    await expect(tabla.getByRole('row').filter({ hasText: visible })).toHaveCount(0);
    await expect(tabla).toContainText(`No hay días no laborables en ${anio}`);
  } finally {
    const snapshot = (await leerSnapshot()) as unknown as { nonWorkingDates: { id: string; date: string }[] };
    const restos = snapshot.nonWorkingDates.filter((dia) => dia.date === fecha).map((dia) => dia.id);
    if (restos.length) await enviarCambios({ nonWorkingDates: { remove: restos } });
  }
});

test('el administrador no ve «Entregas y feriados» ni llega por la URL', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.admin);
  await expect(menuAdmin(page).getByRole('link', { name: 'Entregas y feriados' })).toHaveCount(0);
  await page.goto('/entregas');
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
});

test('PBI-0177: el detalle del pedido dice la versión de los términos aceptada; Contenido, la vigente', async ({
  page,
}) => {
  const terminos = await terminosAceptados(page.request);
  const respuesta = await page.request.post(`${urls.bff}/bff/checkout/orders`, {
    data: {
      customer: {
        fullName: 'Pedido Lote 17',
        email: correoUnico('lote17'),
        phone: '987654321',
        document: '45678912',
      },
      shipping: { addressLine: 'Av. Lote 17', district: 'Miraflores', province: 'Lima', department: 'Lima' },
      items: [{ productId: 'p-004', quantity: 1 }],
      paymentMethod: 'card',
      deliveryDate: fechaDeEntrega(),
      ...terminos,
    },
  });
  expect(respuesta.ok()).toBe(true);
  const pedido = await respuesta.json();
  try {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(`/pedidos?pedido=${pedido.id}`);
    await expect(page.getByRole('heading', { level: 2, name: pedido.id })).toBeVisible();
    await expect(
      page.getByText(
        new RegExp(
          `Aceptados el \\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}:\\d{2}\\s*Versión ${terminos.termsVersion}`,
        ),
      ),
    ).toBeVisible();

    await page.goto('/contenido');
    await expect(page.getByText(`Versión vigente de los términos: ${terminos.termsVersion}`)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Términos y condiciones' })).toHaveAccessibleDescription(
      new RegExp(`Versión vigente de los términos: ${terminos.termsVersion}`),
    );
  } finally {
    await page.request.patch(`${urls.bff}/bff/orders/${encodeURIComponent(pedido.id)}/cancel`, {
      headers: { 'x-order-token': pedido.accessToken },
      data: {},
    });
  }
});
