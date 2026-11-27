import { expect, test, type Locator, type Page } from '@playwright/test';

import { ventanaDeConfirmacion } from './apoyo/confirmacion';
import {
  correoUnico,
  cuentasAdmin,
  fechaDeEntrega,
  ingresarAlAdmin,
  terminosAceptados,
  urls,
} from './apoyo/entorno';
import { conservarElStock } from './apoyo/pedidos';
import { abrirVentana, campoNombre, campoTiendaDeOrigen } from './apoyo/ventanas';

/**
 * PBI-0272 (hallazgo del lote 47): en el diálogo de temas, un texto `sr-only` en posición absoluta se colocaba respecto
 * de la ventana, no del contenido que se desplaza, y daba a la ventana desplazamiento propio: al llegar al final del
 * contenido con la rueda, la ventana entera subía y dejaba un hueco bajo los botones. Aquí se mide en todas las ventanas
 * del backoffice (`MatDialog`), a 375 × 812 y a 1440 × 900, que el pie queda al final: el espacio entre el final de los
 * botones del pie y el final de la ventana no pasa del relleno del pie al abrir, tras la rueda hasta el final (sobre el
 * contenido y sobre el título) y tras llevar el último elemento del contenido a la vista con `scrollIntoView`.
 */

// La ventana de cancelación se cierra sin cancelar: `conservarElStock` cancela al final los pedidos que deja abiertos.
conservarElStock();

interface Caso {
  readonly nombre: string;
  /** Abre la ventana y la devuelve, con su foco inicial ya puesto. */
  readonly abrir: (page: Page) => Promise<Locator>;
  /** Un botón del pie. */
  readonly pie: (ventana: Locator) => Locator;
  /** El último elemento del contenido. */
  readonly ultimo: (ventana: Locator) => Locator;
}

/** Crea un pedido de invitado por la API; devuelve su código. */
async function crearPedido(page: Page): Promise<string> {
  const respuesta = await page.request.post(`${urls.bff}/bff/checkout/orders`, {
    data: {
      customer: {
        fullName: 'Pedido PBI-0272',
        email: correoUnico('pbi0272'),
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

const registro = (
  nombre: string,
  ruta: string,
  boton: string,
  titulo: string,
  foco: (ventana: Locator) => Locator,
  guardar: string,
  ultimo: (ventana: Locator) => Locator,
): Caso => ({
  nombre,
  abrir: async (page) => {
    await page.goto(ruta);
    return abrirVentana(page.getByRole('button', { name: boton, exact: true }), titulo, foco);
  },
  pie: (ventana) => ventana.getByRole('button', { name: guardar, exact: true }),
  ultimo,
});

const CASOS: readonly Caso[] = [
  registro('Nueva marca', '/marcas', 'Agregar marca', 'Nueva marca', campoNombre, 'Guardar', (v) =>
    v.getByRole('checkbox', { name: 'Activa' }),
  ),
  registro('Editar marca', '/marcas', 'Editar marca Nova', 'Editar marca', campoNombre, 'Guardar', (v) =>
    v.getByRole('checkbox', { name: 'Activa' }),
  ),
  registro('Nuevo cliente', '/clientes', 'Agregar cliente', 'Nuevo cliente', campoNombre, 'Guardar', (v) =>
    v.getByRole('textbox', { name: 'Documento', exact: true }),
  ),
  registro(
    'Editar cliente',
    '/clientes',
    'Editar cliente Cliente Demo',
    'Editar cliente',
    campoNombre,
    'Guardar',
    (v) => v.getByRole('textbox', { name: 'Documento', exact: true }),
  ),
  registro(
    'Nueva tarifa',
    '/envios',
    'Agregar tarifa',
    'Precio para uno o varios distritos',
    campoTiendaDeOrigen,
    'Guardar 0 tarifas',
    (v) => v.getByRole('spinbutton', { name: 'Precio (S/)' }),
  ),
  registro(
    'Editar tarifa',
    '/envios',
    'Editar tarifa de Lima Centro a Breña',
    'Editar tarifa',
    campoTiendaDeOrigen,
    'Guardar tarifa',
    (v) => v.getByRole('spinbutton', { name: 'Precio (S/)' }),
  ),
  registro('Nuevo tema', '/temas', 'Nuevo tema', 'Nuevo tema', campoNombre, 'Guardar tema', (v) =>
    v.getByText('Solo cambia aquí.', { exact: false }),
  ),
  {
    nombre: 'Confirmar eliminación',
    abrir: async (page) => {
      await page.goto('/usuarios');
      await page.getByRole('button', { name: 'Eliminar usuario Vendedor Demo' }).click();
      const ventana = ventanaDeConfirmacion(page);
      await expect(ventana.getByRole('button', { name: 'No, cancelar (Esc)' })).toBeFocused();
      return ventana;
    },
    pie: (ventana) => ventana.getByRole('button', { name: 'Sí, eliminar' }),
    ultimo: (ventana) => ventana.getByText('«Vendedor Demo»'),
  },
  {
    nombre: 'Cancelar pedido',
    abrir: async (page) => {
      const id = await crearPedido(page);
      await page.goto(`/pedidos?pedido=${id}`);
      await page.getByRole('combobox', { name: 'Cambiar estado' }).click();
      await page.getByRole('option', { name: 'Cancelado' }).click();
      const ventana = ventanaDeConfirmacion(page, 'Cancelar pedido');
      await expect(ventana.getByRole('button', { name: 'No, volver' })).toBeFocused();
      return ventana;
    },
    pie: (ventana) => ventana.getByRole('button', { name: 'Sí, cancelar pedido' }),
    ultimo: (ventana) => ventana.getByText('El stock reservado vuelve al inventario.'),
  },
];

/** Espacio entre el final de los botones del pie y el final de la ventana. */
async function hueco(ventana: Locator, pie: Locator): Promise<number> {
  const caja = (await ventana.boundingBox())!;
  const botones = await pie.locator('..').getByRole('button').all();
  let fin = 0;
  for (const boton of botones) {
    const medida = (await boton.boundingBox())!;
    fin = Math.max(fin, medida.y + medida.height);
  }
  return caja.y + caja.height - fin;
}

for (const viewport of [
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
] as const) {
  test.describe(`PBI-0272: el pie de cada ventana queda al final, sin hueco debajo, a ${viewport.width} px`, () => {
    test.use({ viewport });

    for (const caso of CASOS) {
      test(caso.nombre, async ({ page }) => {
        await ingresarAlAdmin(page, cuentasAdmin.superadmin);
        const ventana = await caso.abrir(page);
        const pie = caso.pie(ventana);
        // El relleno inferior del pie es el único espacio que puede quedar bajo sus botones.
        const relleno = await pie
          .locator('..')
          .evaluate((nodo) => Number.parseFloat(getComputedStyle(nodo).paddingBottom));
        const limite = relleno + 1;
        const caja = (await ventana.boundingBox())!;
        expect(caja.y + caja.height, 'la ventana cabe en la pantalla').toBeLessThanOrEqual(viewport.height);
        expect(await hueco(ventana, pie), 'al abrir').toBeLessThanOrEqual(limite);

        // La rueda hasta el final, sobre el contenido y sobre el título: se desplaza el contenido, no la ventana.
        const titulo = ventana.getByRole('heading').first();
        const centro = { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };
        const cajaTitulo = (await titulo.boundingBox())!;
        const sobreElTitulo = { x: cajaTitulo.x + 4, y: cajaTitulo.y + cajaTitulo.height / 2 };
        for (const punto of [centro, sobreElTitulo]) {
          await page.mouse.move(punto.x, punto.y);
          for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 800);
          await expect
            .poll(() => hueco(ventana, pie), { message: 'tras la rueda' })
            .toBeLessThanOrEqual(limite);
          await expect(titulo).toBeInViewport();
        }

        // El último elemento del contenido llevado al principio (como un enlace o la búsqueda del navegador).
        await caso
          .ultimo(ventana)
          .evaluate((nodo) => nodo.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await expect
          .poll(() => hueco(ventana, pie), { message: 'tras scrollIntoView' })
          .toBeLessThanOrEqual(limite);
        await expect(titulo).toBeInViewport();

        await page.keyboard.press('Escape');
        await expect(ventana).toBeHidden();
      });
    }
  });
}
