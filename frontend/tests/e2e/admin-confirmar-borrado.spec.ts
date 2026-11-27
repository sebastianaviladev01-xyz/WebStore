import { expect, test, type Page } from '@playwright/test';

import { enviarCambios, leerSnapshot, retirarClientes, sembrarClientes } from './apoyo/catalogo';
import { aceptarEliminacion, responderEliminacion, ventanaDeConfirmacion } from './apoyo/confirmacion';
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
 * - Tras eliminar, el foco va al botón de eliminar de la fila que ocupa su lugar; si era la última, al de la anterior;
 *   si la lista queda vacía, al `h1`. Al cancelar, vuelve al botón que abrió la ventana.
 * - Clientes dice «1 pedido» y «2 pedidos».
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
  // Más de 10 clientes, como al final de la suite completa: el nuevo queda en otra página y el listado salta a ella.
  const relleno = await sembrarClientes(11, 'l43-borrar');
  try {
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
  } finally {
    await retirarClientes(relleno);
  }
});

test('al crear desde la ventana, el listado va a la página del registro nuevo; si los filtros lo dejan fuera, los quita', async ({
  page,
}) => {
  const relleno = await sembrarClientes(11, 'l43-pagina');
  const creados: string[] = [];
  try {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const lista = page.getByRole('region', { name: 'Lista de clientes' });
    const paginacion = page.getByRole('navigation', { name: 'Páginas de clientes' });
    const crear = async (nombre: string) => {
      await page.getByRole('button', { name: 'Agregar cliente' }).click();
      const registro = page.getByRole('dialog', { name: 'Nuevo cliente' });
      const correo = correoUnico('l43-pagina');
      await registro.getByRole('textbox', { name: 'Nombre' }).fill(nombre);
      await registro.getByRole('textbox', { name: 'Correo' }).fill(correo);
      await registro.getByRole('textbox', { name: 'Documento' }).fill('70000044');
      await registro.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(registro).toBeHidden();
      await expect
        .poll(async () => (await leerSnapshot()).customers.find((cliente) => cliente.email === correo)?.id)
        .toBeTruthy();
      creados.push((await leerSnapshot()).customers.find((cliente) => cliente.email === correo)!.id);
    };

    // Desde la página 1, con más de 10 clientes: el nuevo queda al final y el listado salta a su página.
    await page.goto('/clientes');
    await expect(paginacion).toContainText(/^.*1 - 10 de \d+/);
    await crear('Nuevo de la página 43');
    await expect(page).toHaveURL(/[?&]pagina=\d+/);
    await expect(lista.getByRole('button', { name: 'Eliminar cliente Nuevo de la página 43' })).toBeVisible();
    const total = (await leerSnapshot()).customers.length;
    await expect(paginacion).toContainText(`de ${total}`);

    // Con un filtro que no lo incluye: se quitan los filtros y se va a su página.
    await page.goto('/clientes?texto=relleno');
    await crear('Fuera del filtro 43');
    await expect(page).not.toHaveURL(/texto=/);
    await expect(lista.getByRole('button', { name: 'Eliminar cliente Fuera del filtro 43' })).toBeVisible();
    await expect(
      page
        .getByRole('search', { name: 'Filtros de clientes' })
        .getByRole('textbox', { name: 'Buscar cliente' }),
    ).toHaveValue('');
  } finally {
    await retirarClientes([...relleno, ...creados]);
  }
});

test('el foco tras eliminar va a la fila que ocupa su lugar, a la anterior o al título; al cancelar, al botón', async ({
  page,
}) => {
  const clientes = ['A', 'B', 'C'].map((letra, i) => ({
    id: `c-e2e-43-foco-${letra.toLowerCase()}`,
    name: `Foco 43 ${letra}`,
    email: `foco43${letra.toLowerCase()}@example.com`,
    document: `7000043${i}`,
    orders: i === 0 ? 1 : 2,
  }));
  const ids = clientes.map((cliente) => cliente.id);
  try {
    await enviarCambios({ customers: { upsert: clientes } });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(`/clientes?texto=${encodeURIComponent('Foco 43')}`);
    const lista = page.getByRole('region', { name: 'Lista de clientes' });
    const eliminar = (letra: string) =>
      lista.getByRole('button', { name: `Eliminar cliente Foco 43 ${letra}` });
    await expect(eliminar('C')).toBeVisible();

    // Concordancia del número de pedidos (antes, «1 pedidos»).
    await expect(lista.getByText('1 pedido', { exact: true })).toHaveCount(1);
    await expect(lista.getByText('2 pedidos', { exact: true })).toHaveCount(2);

    // Cancelar: el foco vuelve al botón que abrió la ventana.
    await eliminar('A').click();
    await responderEliminacion(page, 'Foco 43 A', false);
    await expect(eliminar('A')).toBeFocused();

    // La primera: el foco pasa a la que ocupa su lugar (B).
    await eliminar('A').click();
    await aceptarEliminacion(page, 'Foco 43 A');
    await expect(eliminar('A')).toHaveCount(0);
    await expect(eliminar('B')).toBeFocused();

    // La última: el foco pasa a la anterior (B).
    await eliminar('C').click();
    await aceptarEliminacion(page, 'Foco 43 C');
    await expect(eliminar('C')).toHaveCount(0);
    await expect(eliminar('B')).toBeFocused();

    // La única: la lista queda vacía y el foco va al título del listado.
    await eliminar('B').click();
    await aceptarEliminacion(page, 'Foco 43 B');
    await expect(lista).toContainText('Ningún cliente cumple los filtros.');
    await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeFocused();
  } finally {
    const quedan = (await leerSnapshot()).customers.filter((cliente) => ids.includes(cliente.id));
    if (quedan.length) await enviarCambios({ customers: { remove: quedan.map((cliente) => cliente.id) } });
  }
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
