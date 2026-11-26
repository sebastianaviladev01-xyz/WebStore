import { expect, test, type Page } from '@playwright/test';

import { leerSnapshot } from './apoyo/catalogo';
import { aceptarEliminacion, ventanaDeConfirmacion } from './apoyo/confirmacion';
import { relacionDeContraste, medirTexto, MINIMO } from './apoyo/contraste';
import {
  correoUnico,
  cuentasAdmin,
  fechaDeEntrega,
  ingresarAlAdmin,
  terminosAceptados,
  urls,
} from './apoyo/entorno';
import { conservarElStock } from './apoyo/pedidos';

/**
 * Lote 43 (ADR-0033, PBI-0269): los borrados del backoffice se confirman en una ventana propia, como la del SGC, y ya no
 * con el `confirm()` del navegador:
 * - una papelera grande, el título «Confirmar eliminación» (el nombre accesible de la ventana), «¿Deseas eliminar el
 *   registro de:» y el nombre del registro entre comillas;
 * - «No, cancelar (Esc)» con el foco al abrir; Esc, el clic fuera o ese botón cierran sin borrar;
 * - «Sí, eliminar», relleno del principal, borra hasta el BFF;
 * - la cancelación de un pedido usa la misma ventana con «Cancelar pedido», sin la papelera, con el aviso del stock y
 *   los botones «No, volver» y «Sí, cancelar pedido».
 * Ninguna confirmación abre la ventana nativa del navegador.
 */

conservarElStock();

/** Cuenta las ventanas nativas (`confirm()`) que se abran; ninguna debería. */
function contarVentanasNativas(page: Page): () => number {
  let nativas = 0;
  page.on('dialog', (dialogo) => {
    nativas += 1;
    void dialogo.dismiss();
  });
  return () => nativas;
}

/** Crea un pedido de invitado por la API; devuelve su código. */
async function crearPedido(page: Page): Promise<string> {
  const respuesta = await page.request.post(`${urls.bff}/bff/checkout/orders`, {
    data: {
      customer: {
        fullName: 'Pedido Lote 43',
        email: correoUnico('lote43'),
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
      paymentMethod: 'card',
      deliveryDate: fechaDeEntrega(),
      ...(await terminosAceptados(page.request)),
    },
  });
  expect(respuesta.ok()).toBe(true);
  return ((await respuesta.json()) as { id: string }).id;
}

/** Ancho del ícono decorativo más grande de la ventana: la papelera mide 44 px; los de los botones, 18. */
const iconoMasGrande = (ventana: ReturnType<typeof ventanaDeConfirmacion>) =>
  ventana.evaluate((nodo) =>
    Math.max(0, ...[...nodo.querySelectorAll('svg')].map((svg) => svg.getBoundingClientRect().width)),
  );

test('la ventana de borrado muestra el nombre, lleva el foco a «No, cancelar» y Esc cierra sin borrar', async ({
  page,
}) => {
  const nativas = contarVentanasNativas(page);
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/clientes');
  const cliente = (await leerSnapshot()).customers[0];
  expect(cliente).toBeDefined();
  const nombre = cliente?.name ?? '';
  const eliminar = page.getByRole('button', { name: `Eliminar cliente ${nombre}` });

  await eliminar.click();
  const ventana = ventanaDeConfirmacion(page);
  await expect(ventana).toBeVisible();
  await expect(ventana.getByRole('heading', { name: 'Confirmar eliminación' })).toBeVisible();
  await expect(ventana).toContainText('¿Deseas eliminar el registro de:');
  await expect(ventana).toContainText(`«${nombre}»`);
  // La pregunta con el nombre es la descripción de la ventana.
  await expect(ventana).toHaveAccessibleDescription(
    new RegExp(`¿Deseas eliminar el registro de:\\s*«${nombre}»`),
  );
  expect(await iconoMasGrande(ventana), 'la papelera grande').toBeGreaterThanOrEqual(40);
  const cancelar = ventana.getByRole('button', { name: 'No, cancelar (Esc)' });
  const aceptar = ventana.getByRole('button', { name: 'Sí, eliminar' });
  await expect(cancelar).toBeFocused();
  await expect(aceptar).toBeVisible();

  // «Sí, eliminar» es el principal relleno; su texto se lee (ADR-0022).
  const { color, fondo } = await medirTexto(aceptar);
  expect(relacionDeContraste(color, fondo)).toBeGreaterThanOrEqual(MINIMO.texto);

  await page.keyboard.press('Escape');
  await expect(ventana).toHaveCount(0);
  await expect(eliminar).toBeVisible();
  // «No, cancelar» tampoco borra.
  await eliminar.click();
  await ventana.getByRole('button', { name: 'No, cancelar (Esc)' }).click();
  await expect(ventana).toHaveCount(0);
  expect((await leerSnapshot()).customers.some((otro) => otro.id === cliente?.id)).toBe(true);
  expect(nativas(), 'ninguna ventana nativa del navegador').toBe(0);
});

test('«Sí, eliminar» borra el registro hasta el BFF, sin ventana nativa', async ({ page }) => {
  const nativas = contarVentanasNativas(page);
  const nombre = 'Cliente del lote 43';
  const correo = correoUnico('lote43');
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/clientes');
  await page.getByRole('button', { name: 'Agregar cliente' }).click();
  const registro = page.getByRole('dialog', { name: 'Nuevo cliente' });
  await registro.getByRole('textbox', { name: 'Nombre' }).fill(nombre);
  await registro.getByRole('textbox', { name: 'Correo' }).fill(correo);
  await registro.getByRole('textbox', { name: 'Documento' }).fill('70000043');
  await registro.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(registro).toBeHidden();

  await page.getByRole('button', { name: `Eliminar cliente ${nombre}` }).click();
  await aceptarEliminacion(page, nombre);
  await expect(page.getByRole('button', { name: `Eliminar cliente ${nombre}` })).toHaveCount(0);
  await expect
    .poll(async () => (await leerSnapshot()).customers.some((cliente) => cliente.email === correo))
    .toBe(false);
  expect(nativas()).toBe(0);
});

test('a 375 px la ventana cabe en la pantalla y sus botones no se desbordan', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/clientes');
  await page
    .getByRole('button', { name: /^Eliminar cliente / })
    .first()
    .click();
  const ventana = ventanaDeConfirmacion(page);
  await expect(ventana).toBeVisible();
  const caja = await ventana.boundingBox();
  expect(caja && caja.x >= 0 && caja.x + caja.width <= 375).toBe(true);
  for (const boton of await ventana.getByRole('button').all()) {
    const medida = await boton.boundingBox();
    expect(medida && medida.x >= 0 && medida.x + medida.width <= 375).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(ventana).toHaveCount(0);
});

test('cancelar un pedido se confirma en la misma ventana, con «Cancelar pedido» y sin la papelera', async ({
  page,
}) => {
  const nativas = contarVentanasNativas(page);
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const id = await crearPedido(page);
  await page.goto(`/pedidos?pedido=${id}`);
  const cambiar = page.getByRole('combobox', { name: 'Cambiar estado' });
  const estado = async () => (await leerSnapshot()).orders.find((pedido) => pedido.id === id)?.status;

  await cambiar.click();
  await page.getByRole('option', { name: 'Cancelado' }).click();
  const ventana = ventanaDeConfirmacion(page, 'Cancelar pedido');
  await expect(ventana).toBeVisible();
  await expect(ventana).toContainText('¿Deseas cancelar el pedido:');
  await expect(ventana).toContainText(`«${id}»`);
  await expect(ventana).toContainText('El stock reservado vuelve al inventario.');
  expect(await iconoMasGrande(ventana), 'sin la papelera').toBeLessThan(40);
  await expect(ventana.getByRole('button', { name: 'No, volver' })).toBeFocused();

  await ventana.getByRole('button', { name: 'No, volver' }).click();
  await expect(ventana).toHaveCount(0);
  await expect(cambiar).toHaveText('Confirmado');
  expect(await estado()).toBe('confirmed');

  await cambiar.click();
  await page.getByRole('option', { name: 'Cancelado' }).click();
  await ventana.getByRole('button', { name: 'Sí, cancelar pedido' }).click();
  await expect(ventana).toHaveCount(0);
  await expect.poll(estado).toBe('cancelled');
  await expect(cambiar).toHaveText('Cancelado');
  expect(nativas()).toBe(0);
});
