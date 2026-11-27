import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 45 (ADR-0033, PBI-0270): el Dashboard con la estructura del panel del SGC. El filtro principal elige el periodo
 * (por omisión «Mes actual»), que va en la URL (`?periodo=`, STD-08), y con él cambian las cifras, su variación,
 * «Pedidos por estado» y la distribución de ventas por categoría.
 *
 * Las cifras no dependen de los pedidos que hayan creado otras specs: el snapshot que recibe la página se sustituye por
 * uno propio, con dos categorías y dos productos de la prueba, y no se guarda nada. Los pedidos se fechan respecto del
 * reloj de la prueba: uno ahora y otro hace dos días, así «Hoy» y «Últimos 7 días» difieren cualquier día del año.
 */
type Snapshot = {
  orders: Record<string, unknown>[];
  products: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  activity: unknown[];
};

const CATEGORIAS = [
  { id: 'cat-e2e-audio', name: 'Audio de prueba', order: 90 },
  { id: 'cat-e2e-hogar', name: 'Hogar de prueba', order: 91 },
];
const producto = (id: string, categoryId: string) => ({
  id,
  sku: id.toUpperCase(),
  name: `Producto ${id}`,
  description: '',
  imageUrl: '',
  thumbnailUrl: '',
  brandId: '',
  categoryId,
  price: 100,
  stock: 50,
  active: true,
  highlights: [],
  gallery: [],
});
/** Cada pedido lleva S/ 15 de envío en su total: las ventas y la distribución no lo cuentan (PBI-0186). */
const pedido = (n: number, createdAt: Date, productId: string, subtotal: number, status = 'confirmed') => ({
  id: `WS-PER-${n}`,
  customer: `Cliente ${n}`,
  customerEmail: `periodo-${n}@example.com`,
  district: 'Miraflores',
  status,
  subtotal,
  shippingCost: 15,
  total: subtotal + 15,
  createdAt: createdAt.toISOString(),
  items: [{ productId, name: `Producto ${productId}`, quantity: 1, unitPrice: subtotal }],
});

async function conPedidosDePrueba(page: Page): Promise<void> {
  const ahora = Date.now();
  const haceDosDias = new Date(ahora - 2 * 24 * 60 * 60 * 1000);
  await page.route('**/bff/admin/snapshot', async (ruta) => {
    if (ruta.request().method() !== 'GET') return ruta.fallback();
    const respuesta = await ruta.fetch();
    const snapshot = (await respuesta.json()) as Snapshot;
    snapshot.categories = [...snapshot.categories, ...CATEGORIAS];
    snapshot.products = [
      ...snapshot.products,
      producto('p-e2e-audio', 'cat-e2e-audio'),
      producto('p-e2e-hogar', 'cat-e2e-hogar'),
    ];
    snapshot.activity = [];
    // Uno de hoy (audio, S/ 300) y uno de hace dos días (hogar, S/ 100); el cancelado no cuenta en las ventas.
    snapshot.orders = [
      pedido(1, new Date(ahora), 'p-e2e-audio', 300, 'delivered'),
      pedido(2, haceDosDias, 'p-e2e-hogar', 100),
      pedido(3, haceDosDias, 'p-e2e-hogar', 999, 'cancelled'),
    ];
    await ruta.fulfill({ response: respuesta, json: snapshot });
  });
}

const tarjeta = (page: Page, titulo: string) =>
  page
    .getByRole('main')
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { level: 3, name: titulo, exact: true }) });
const periodo = (page: Page) => page.getByRole('main').getByRole('combobox', { name: 'Periodo' });
const distribucion = (page: Page) =>
  page.getByRole('main').getByRole('list', { name: 'Ventas por categoría' });
/** La tabla del gráfico de pedidos (para lectores de pantalla), por su título: «… por hora», «… por mes»… */
const tablaDelGrafico = (page: Page, unidad: string) =>
  page
    .getByRole('main')
    .getByRole('table', { name: new RegExp(`^Pedidos y clientes web nuevos por ${unidad}`) });
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

async function elegirPeriodo(page: Page, nombre: string): Promise<void> {
  await periodo(page).click();
  await page.getByRole('option', { name: nombre, exact: true }).click();
  await expect(periodo(page)).toContainText(nombre);
}

test('el encabezado y el filtro principal son los del panel del SGC, con «Mes actual» por omisión', async ({
  page,
}) => {
  await conPedidosDePrueba(page);
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const main = page.getByRole('main');

  await expect(main.getByText(/(^|\s)Panel\s*$/)).toBeVisible();
  await expect(
    main.getByRole('heading', { level: 1, name: 'Dashboard de la tienda', exact: true }),
  ).toBeVisible();
  // La fecha de Lima, con su día de la semana: «26 noviembre, 2026».
  await expect(main.locator('time').first()).toHaveText(/^\d{1,2} [a-z]+, \d{4}$/);

  await expect(main.getByRole('heading', { level: 2, name: 'Periodo del Dashboard' })).toBeVisible();
  await expect(main.getByText('Las cifras se calculan según el periodo seleccionado.')).toBeVisible();
  await expect(periodo(page)).toContainText('Mes actual');
  await expect(page).not.toHaveURL(/periodo=/);

  await periodo(page).click();
  await expect(page.getByRole('option')).toHaveText([
    'Hoy',
    'Últimos 7 días',
    'Últimos 30 días',
    'Mes actual',
    'Trimestre actual',
    'Año actual',
  ]);
  await page.keyboard.press('Escape');
});

test('cambiar el periodo cambia las cifras, la variación, la distribución y la URL', async ({ page }) => {
  await conPedidosDePrueba(page);
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);

  await elegirPeriodo(page, 'Hoy');
  await expect(page).toHaveURL(/[?&]periodo=hoy(&|$)/);
  // El gráfico también sigue el periodo: con «Hoy», por hora (las 24 del día de Lima).
  await expect(
    page.getByRole('main').getByRole('heading', { level: 2, name: 'Pedidos y clientes web nuevos por hora' }),
  ).toBeVisible();
  await expect(tablaDelGrafico(page, 'hora').getByRole('rowheader')).toHaveCount(24);
  await expect(tarjeta(page, 'Total de pedidos')).toContainText(/(?<!\d)1(?!\d)/);
  await expect(tarjeta(page, 'Total de ventas')).toContainText(/S\/\s?300\.00/);
  await expect(tarjeta(page, 'Total de pedidos')).toContainText('frente a ayer a la misma hora');
  // Ayer no hubo pedidos: sin porcentaje, y el lector de pantalla dice qué falta.
  await expect(tarjeta(page, 'Total de pedidos')).toContainText('Sin datos de ayer');
  await expect(distribucion(page).getByRole('listitem')).toHaveCount(1);
  await expect(distribucion(page).getByRole('listitem')).toContainText(['Audio de prueba']);
  await expect(distribucion(page).getByRole('listitem').first()).toContainText('100 %');

  await elegirPeriodo(page, 'Últimos 7 días');
  await expect(page).toHaveURL(/[?&]periodo=7-dias(&|$)/);
  await expect(tablaDelGrafico(page, 'día').getByRole('rowheader')).toHaveCount(7);
  await expect(page.getByRole('main').getByText(/^Del \d{1,2} .* de \d{4}$/)).toBeVisible();
  // Los tres pedidos de la semana (el cancelado cuenta como pedido); las ventas, sin el cancelado ni el envío.
  await expect(tarjeta(page, 'Total de pedidos')).toContainText(/(?<!\d)3(?!\d)/);
  await expect(tarjeta(page, 'Total de ventas')).toContainText(/S\/\s?400\.00/);
  await expect(tarjeta(page, 'Total de pedidos')).toContainText('frente a los 7 días anteriores');
  await expect(distribucion(page).getByRole('listitem')).toHaveCount(2);
  await expect(distribucion(page).getByRole('listitem').nth(0)).toContainText('Audio de prueba');
  await expect(distribucion(page).getByRole('listitem').nth(0)).toContainText('75 %');
  await expect(distribucion(page).getByRole('listitem').nth(1)).toContainText('Hogar de prueba');
  await expect(distribucion(page).getByRole('listitem').nth(1)).toContainText('25 %');
  for (const fila of await distribucion(page).getByRole('listitem').all())
    await expect(fila).toContainText('Participación', { ignoreCase: true });

  // El periodo se conserva al recargar, porque está en la URL.
  await page.reload();
  await expect(periodo(page)).toContainText('Últimos 7 días');
  await expect(tarjeta(page, 'Total de pedidos')).toContainText(/(?<!\d)3(?!\d)/);

  // «Mes actual», el de por omisión, deja la URL sin el parámetro.
  await elegirPeriodo(page, 'Mes actual');
  await expect(page).not.toHaveURL(/periodo=/);
  await expect(tarjeta(page, 'Total de pedidos')).toContainText('frente al mismo tramo del mes anterior');
});

test('un periodo que no existe en la URL muestra «Mes actual»', async ({ page }) => {
  await conPedidosDePrueba(page);
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/?periodo=semana');
  await expect(periodo(page)).toContainText('Mes actual');
  await expect(tarjeta(page, 'Total de pedidos')).toContainText('frente al mismo tramo del mes anterior');
});

test('el vendedor ve el filtro, sus cifras y la distribución, sin clientes ni actividad', async ({
  page,
}) => {
  await conPedidosDePrueba(page);
  await ingresarAlAdmin(page, cuentasAdmin.vendedor);
  const main = page.getByRole('main');

  await elegirPeriodo(page, 'Últimos 7 días');
  await expect(tarjeta(page, 'Total de ventas')).toContainText(/S\/\s?400\.00/);
  await expect(distribucion(page).getByRole('listitem')).toHaveCount(2);
  await expect(main.getByRole('heading', { level: 3, name: 'Clientes web nuevos' })).toHaveCount(0);
  await expect(main.getByRole('heading', { level: 2, name: 'Actividad reciente' })).toHaveCount(0);
});

test.describe('a 375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('el filtro y las tarjetas de color caben sin desbordar la página', async ({ page }) => {
    await conPedidosDePrueba(page);
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await elegirPeriodo(page, 'Año actual');
    await expect(page).toHaveURL(/[?&]periodo=anio(&|$)/);
    // Con «Año actual», el gráfico va por mes: 12 barras, de enero a diciembre, con el pedido de hoy en su mes.
    await expect(
      page
        .getByRole('main')
        .getByRole('heading', { level: 2, name: 'Pedidos y clientes web nuevos por mes' }),
    ).toBeVisible();
    const tabla = tablaDelGrafico(page, 'mes');
    await expect(tabla.getByRole('rowheader')).toHaveText(MESES);
    const mesDeHoy =
      MESES[
        Number(
          new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', month: 'numeric' }).format(new Date()),
        ) - 1
      ];
    const filaDeHoy = tabla
      .getByRole('row')
      .filter({ has: page.getByRole('rowheader', { name: mesDeHoy, exact: true }) });
    await expect(filaDeHoy.getByRole('cell').first()).not.toHaveText('0');
    await expect(tarjeta(page, 'Total de pedidos')).toContainText('frente al mismo tramo del año anterior');
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);
  });
});
