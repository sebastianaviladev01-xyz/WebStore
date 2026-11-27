import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin, menuAdmin } from './apoyo/entorno';

/**
 * Dashboard del Admin (el «Resumen» hasta el lote 13, PBI-0168): estructura y textos de la especificación (tarjetas
 * con «Ver más», gráfico, alertas, últimos pedidos y estados). No comprueba cifras: dependen de los pedidos que hayan
 * creado otras specs. Desde el lote 13 las tarjetas van bajo el h2 «Cifras», que las pliega (PBI-0187), y su título es
 * un h3. Desde el lote 23 (ADR-0025, PBI-0222; provisional), el gráfico nombra «Clientes web nuevos» y ya no está
 * «Pedidos por distrito». Desde el lote 45 (ADR-0033, PBI-0270), el filtro principal («Periodo del Dashboard») va antes
 * de las cifras, la tarjeta de clientes cuenta los clientes web nuevos del periodo y, tras «Pedidos por estado», va
 * «Distribución de ventas por categoría»; el periodo tiene su propia spec, admin-dashboard-periodo.
 */
const tarjetas = [
  { titulo: 'Total de pedidos', destino: '/pedidos' },
  { titulo: 'Total de ventas', destino: '/pedidos' },
  { titulo: 'Clientes web nuevos', destino: '/clientes' },
  { titulo: 'Stock bajo', destino: '/inventario' },
];

test('el superadministrador ve los bloques del Dashboard en su orden', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const main = page.getByRole('main');

  // Los títulos de los bloques, en el orden de la página.
  await expect(main.getByRole('heading', { level: 2 })).toHaveText([
    // Lote 45 (PBI-0270): el filtro principal, sin botón plegable.
    'Periodo del Dashboard',
    'Cifras',
    'Pedidos y clientes web nuevos por día',
    'Alertas de inventario',
    'Últimos pedidos',
    'Pedidos por estado',
    'Distribución de ventas por categoría',
    // Lote 07b (PBI-0028): al final, para no mover los bloques que ya había. Sin «Personas en línea» (PBI-0172).
    'Actividad reciente',
  ]);
  await expect(main.getByRole('heading', { level: 3 })).toHaveText(tarjetas.map((t) => t.titulo));

  // Cada tarjeta lleva su «Ver más» hacia el módulo correspondiente.
  for (const { titulo, destino } of tarjetas) {
    const enlace = main.getByRole('link', { name: `Ver más (${titulo})` });
    await expect(enlace).toBeVisible();
    await expect(enlace).toHaveAttribute('href', destino);
  }

  // Leyendas del gráfico.
  const leyenda = main.getByRole('list', { name: 'Leyenda' });
  await expect(leyenda).toContainText('Pedidos');
  await expect(leyenda).toContainText('Clientes web nuevos');
  // PBI-0222 (lote 23): sin «Pedidos por distrito».
  await expect(main.getByText('Pedidos por distrito')).toHaveCount(0);
  await expect(main.getByText('Los cinco distritos con más pedidos')).toHaveCount(0);

  // La tabla de últimos pedidos tiene sus columnas.
  const tabla = main.getByRole('region', { name: 'Últimos pedidos' }).getByRole('table');
  await expect(tabla.getByRole('columnheader')).toHaveText([
    'ID',
    'Cliente',
    'Estado',
    'Fecha',
    'Total',
    'Acción',
  ]);

  // Las tres barras de estado.
  for (const estado of ['Completados', 'En proceso', 'Otros']) {
    await expect(main.getByText(estado, { exact: true })).toBeVisible();
  }
});

test('«Ver más» de una tarjeta lleva al módulo', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.getByRole('main').getByRole('link', { name: 'Ver más (Clientes web nuevos)' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
});

test('el vendedor ve las cifras de pedidos y el stock bajo, sin clientes ni actividad (PBI-0013, PBI-0170)', async ({
  page,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.vendedor);
  const main = page.getByRole('main');

  // PBI-0170 (lote 11, provisional): ve los pedidos, así que también sus cifras; los clientes y la actividad, no.
  for (const visible of ['Total de pedidos', 'Total de ventas', 'Stock bajo']) {
    await expect(main.getByRole('heading', { level: 3, name: visible })).toBeVisible();
  }
  await expect(main.getByRole('heading', { level: 2, name: 'Pedidos por día' })).toBeVisible();
  await expect(main.getByRole('heading', { level: 3, name: 'Clientes web nuevos' })).toHaveCount(0);
  // Lote 45 (PBI-0270): ve el filtro principal y la distribución de las ventas, que ve.
  await expect(main.getByRole('combobox', { name: 'Periodo' })).toBeVisible();
  await expect(
    main.getByRole('heading', { level: 2, name: 'Distribución de ventas por categoría' }),
  ).toBeVisible();
  for (const oculto of ['Actividad reciente', 'Personas en línea']) {
    await expect(main.getByRole('heading', { name: oculto })).toHaveCount(0);
  }
  await expect(main.getByText(/clientes (web )?nuevos/i)).toHaveCount(0);
  await expect(main.getByText('Pedidos por distrito')).toHaveCount(0);
  // Con Inventario, el stock bajo lleva allí, como para el administrador.
  await expect(main.getByRole('link', { name: 'Gestionar inventario →' })).toBeVisible();
  await main.getByRole('link', { name: 'Ver más (Stock bajo)' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
});

/**
 * Bloques plegables del Dashboard (feature 003, TEST-05). Los bloques con título se pliegan desde un botón dentro de
 * su `h2`; desde el lote 13 (PBI-0187), también la fila de tarjetas, con el h2 «Cifras» (antes no, D1). Plegar
 * oculta el contenido sin perder los datos (AC-04); teclado (AC-05); al recargar o al volver al Dashboard, todos
 * desplegados (AC-07, D2, D4); a 375 px también (AC-13).
 */
const BLOQUES_SUPERADMIN = [
  'Cifras',
  'Pedidos y clientes web nuevos por día',
  'Alertas de inventario',
  'Últimos pedidos',
  'Pedidos por estado',
  'Distribución de ventas por categoría',
  'Actividad reciente',
] as const;

const botonDeBloque = (page: Page, titulo: string) =>
  page
    .getByRole('main')
    .getByRole('heading', { level: 2, name: titulo, exact: true })
    .getByRole('button', { name: titulo, exact: true });

/** Región que controla el botón del bloque, por su `aria-controls`. */
async function regionDeBloque(page: Page, titulo: string) {
  const id = await botonDeBloque(page, titulo).getAttribute('aria-controls');
  expect(id).toMatch(/^bloque-/);
  return page.locator(`[id="${id}"]`);
}

async function esperarBloques(page: Page, abiertos: readonly string[], plegados: readonly string[]) {
  for (const titulo of abiertos) {
    await expect(botonDeBloque(page, titulo)).toHaveAttribute('aria-expanded', 'true');
    await expect(await regionDeBloque(page, titulo)).toBeVisible();
  }
  for (const titulo of plegados) {
    await expect(botonDeBloque(page, titulo)).toHaveAttribute('aria-expanded', 'false');
    await expect(await regionDeBloque(page, titulo)).toBeHidden();
  }
}

test.describe('Bloques plegables del Dashboard', () => {
  test('cada bloque, también la fila de cifras, tiene su botón plegable dentro del h2; cada tarjeta, no', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const main = page.getByRole('main');

    await expect(main.getByRole('heading', { level: 2 }).getByRole('button')).toHaveText([
      ...BLOQUES_SUPERADMIN,
    ]);
    for (const { titulo } of tarjetas) {
      await expect(main.getByRole('heading', { level: 3, name: titulo }).getByRole('button')).toHaveCount(0);
    }
    for (const titulo of BLOQUES_SUPERADMIN) await expect(await regionDeBloque(page, titulo)).toHaveCount(1);
    // Al entrar, todos desplegados (D2).
    await esperarBloques(page, BLOQUES_SUPERADMIN, []);
  });

  // Hasta el lote 23 este caso plegaba «Pedidos por distrito», que se quitó (PBI-0222): ahora pliega el gráfico.
  test('plegar el gráfico por día oculta su contenido sin cambiar los demás, y al desplegarlo vuelven los mismos datos', async ({
    page,
  }) => {
    const titulo = 'Pedidos y clientes web nuevos por día';
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const grafico = botonDeBloque(page, titulo);
    const region = await regionDeBloque(page, titulo);
    const otros = BLOQUES_SUPERADMIN.filter((bloque) => bloque !== titulo);
    const contenido = await region.innerText();
    expect(contenido).toContain('Clientes web nuevos');

    await grafico.click();
    await esperarBloques(page, otros, [titulo]);
    await expect(grafico).toBeVisible();
    await expect(page.getByRole('main').getByRole('list', { name: 'Leyenda' })).toBeHidden();

    await grafico.click();
    await esperarBloques(page, BLOQUES_SUPERADMIN, []);
    expect(await region.innerText()).toBe(contenido);
  });

  test('PBI-0187: plegar «Cifras» oculta las cuatro tarjetas sin cambiar los demás bloques', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const cifras = botonDeBloque(page, 'Cifras');
    const otros = BLOQUES_SUPERADMIN.filter((titulo) => titulo !== 'Cifras');

    await cifras.click();
    await esperarBloques(page, otros, ['Cifras']);
    for (const { titulo } of tarjetas)
      await expect(page.getByRole('main').getByRole('link', { name: `Ver más (${titulo})` })).toBeHidden();
    // Plegada, la fila no se lleva el «Actualizar» del encabezado.
    await expect(page.getByRole('button', { name: 'Actualizar' })).toBeVisible();

    await cifras.click();
    await esperarBloques(page, BLOQUES_SUPERADMIN, []);
    for (const { titulo } of tarjetas)
      await expect(page.getByRole('main').getByRole('link', { name: `Ver más (${titulo})` })).toBeVisible();
  });

  test('con teclado, Intro y Espacio pliegan y despliegan un bloque y el foco sigue en el botón', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const alertas = botonDeBloque(page, 'Alertas de inventario');
    const gestionar = page.getByRole('main').getByRole('link', { name: 'Gestionar inventario →' });

    // Tab desde el principio de la página hasta el botón del bloque.
    await page.locator('body').focus();
    for (let pulsaciones = 0; pulsaciones < 60; pulsaciones += 1) {
      if (await alertas.evaluate((nodo) => nodo === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(alertas).toBeFocused();
    expect(await alertas.evaluate((nodo) => nodo.matches(':focus-visible'))).toBe(true);

    await page.keyboard.press('Enter');
    await expect(alertas).toHaveAttribute('aria-expanded', 'false');
    await expect(alertas).toBeFocused();
    await expect(gestionar).toBeHidden();

    // Lo plegado sale del orden de tabulación: el siguiente Tab salta al botón del bloque de al lado.
    await page.keyboard.press('Tab');
    await expect(botonDeBloque(page, 'Últimos pedidos')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(alertas).toBeFocused();

    await page.keyboard.press('Space');
    await expect(alertas).toHaveAttribute('aria-expanded', 'true');
    await expect(alertas).toBeFocused();
    await expect(gestionar).toBeVisible();
  });

  test('al recargar y al volver al Dashboard desde otra página, todos los bloques están desplegados', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const plegados = ['Cifras', 'Pedidos por estado', 'Últimos pedidos'];
    const abiertos = BLOQUES_SUPERADMIN.filter((titulo) => !plegados.includes(titulo));

    for (const titulo of plegados) await botonDeBloque(page, titulo).click();
    await esperarBloques(page, abiertos, plegados);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await esperarBloques(page, BLOQUES_SUPERADMIN, []);

    for (const titulo of plegados) await botonDeBloque(page, titulo).click();
    await esperarBloques(page, abiertos, plegados);
    await page.getByRole('main').getByRole('link', { name: 'Gestionar inventario →' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
    await menuAdmin(page).getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    await esperarBloques(page, BLOQUES_SUPERADMIN, []);
  });

  test('el vendedor solo tiene botones en los bloques que ve', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.vendedor);
    const main = page.getByRole('main');

    // Lote 11 (PBI-0170): con los pedidos, todos los bloques menos la actividad reciente, que es del Dashboard completo.
    const bloques = BLOQUES_SUPERADMIN.filter((titulo) => titulo !== 'Actividad reciente').map((titulo) =>
      titulo === 'Pedidos y clientes web nuevos por día' ? 'Pedidos por día' : titulo,
    );
    await expect(main.getByRole('heading', { level: 2 }).getByRole('button')).toHaveText(bloques);
    await botonDeBloque(page, 'Alertas de inventario').click();
    await esperarBloques(
      page,
      bloques.filter((titulo) => titulo !== 'Alertas de inventario'),
      ['Alertas de inventario'],
    );
  });

  test.describe('a 375 px', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('los bloques se pliegan y la página no desborda', async ({ page }) => {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      const otros = BLOQUES_SUPERADMIN.filter((titulo) => titulo !== 'Últimos pedidos');

      await botonDeBloque(page, 'Últimos pedidos').click();
      await esperarBloques(page, otros, ['Últimos pedidos']);
      await expect(
        page.getByRole('main').getByRole('link', { name: 'Ver todos los pedidos →' }),
      ).toBeVisible();

      await botonDeBloque(page, 'Pedidos por estado').click();
      await esperarBloques(
        page,
        otros.filter((titulo) => titulo !== 'Pedidos por estado'),
        ['Pedidos por estado', 'Últimos pedidos'],
      );

      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborde).toBe(false);
    });
  });
});

/**
 * Lote 08 (ADR-0017), PBI-0077: la presentación del Dashboard (formato de moneda, texto de la variación y estados vacíos)
 * no tenía prueba. Las cifras de estas pruebas no dependen de los pedidos que hayan creado otras specs: el snapshot
 * que recibe la página se sustituye por uno propio, y no se guarda nada.
 */
type SnapshotDelResumen = {
  orders: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  products: { stock: number }[];
  activity: unknown[];
};

async function conSnapshot(page: Page, cambiar: (snapshot: SnapshotDelResumen) => void): Promise<void> {
  await page.route('**/bff/admin/snapshot', async (ruta) => {
    if (ruta.request().method() !== 'GET') return ruta.fallback();
    const respuesta = await ruta.fetch();
    const snapshot = (await respuesta.json()) as SnapshotDelResumen;
    cambiar(snapshot);
    await ruta.fulfill({ response: respuesta, json: snapshot });
  });
}

/** Cada pedido lleva S/ 10 de envío en su total: las ventas suman solo los productos (`subtotal`, PBI-0186). */
const pedidoDe = (n: number, createdAt: string, subtotal: number, status = 'confirmed') => ({
  id: `WS-RES-${n}`,
  customer: `Cliente ${n}`,
  customerEmail: `cliente-${n}@example.com`,
  district: 'Miraflores',
  status,
  subtotal,
  shippingCost: 10,
  total: subtotal + 10,
  createdAt,
  items: [],
});
const tarjeta = (page: Page, titulo: string) =>
  page
    .getByRole('main')
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { level: 3, name: titulo, exact: true }) });

test.describe('Presentación del Dashboard con datos propios', () => {
  test('sin pedidos ni alertas: cifras en cero, variación sin dato y los estados vacíos dicen qué falta', async ({
    page,
  }) => {
    await conSnapshot(page, (snapshot) => {
      snapshot.orders = [];
      snapshot.customers = [];
      snapshot.activity = [];
      for (const producto of snapshot.products) producto.stock = 50;
    });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const main = page.getByRole('main');

    await expect(tarjeta(page, 'Total de pedidos')).toContainText(/(?<!\d)0(?!\d)/);
    await expect(tarjeta(page, 'Total de ventas')).toContainText(/S\/\s?0\.00/);
    await expect(tarjeta(page, 'Clientes web nuevos')).toContainText(/(?<!\d)0(?!\d)/);
    // Sin pedidos del mes anterior no hay porcentaje: «—» y, para un lector de pantalla, qué significa.
    await expect(tarjeta(page, 'Total de pedidos')).toContainText('—');
    await expect(tarjeta(page, 'Total de pedidos')).toContainText('Sin datos del mes anterior');
    await expect(tarjeta(page, 'Stock bajo')).toContainText('Productos con 5 unidades o menos');

    // Últimos pedidos (antes del lote 23, también «Pedidos por distrito», que se quitó: PBI-0222).
    await expect(main.getByText('Todavía no hay pedidos.')).toHaveCount(1);
    await expect(main.getByText('Sin alertas.')).toBeVisible();
    await expect(main.getByText('Todavía no hay actividad.')).toBeVisible();
    // Sin pedidos, las tres barras de estado quedan en 0 %.
    await expect(main.getByText('0 %', { exact: true })).toHaveCount(3);
  });

  test('con pedidos del mes y del mes anterior: moneda con dos decimales y la variación con su signo', async ({
    page,
  }) => {
    const hoy = new Date();
    const primeroDelMesAnterior = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1, 15));
    await conSnapshot(page, (snapshot) => {
      snapshot.activity = [];
      snapshot.orders = [
        // Este mes, hasta hoy: 2 pedidos y S/ 1,334.50 en productos (S/ 1,354.50 con el envío).
        pedidoDe(1, hoy.toISOString(), 1234.5, 'delivered'),
        pedidoDe(2, hoy.toISOString(), 100),
        // El día 1 del mes anterior, dentro del mismo tramo: 1 pedido y S/ 500.00.
        pedidoDe(3, primeroDelMesAnterior.toISOString(), 500, 'cancelled'),
        // Lote 45 (PBI-0270): las cifras y los estados son los del periodo («Mes actual»); un cancelado de hoy cuenta
        // como pedido, pero no en las ventas.
        pedidoDe(4, hoy.toISOString(), 999, 'cancelled'),
      ];
    });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const main = page.getByRole('main');

    const pedidos = tarjeta(page, 'Total de pedidos');
    await expect(pedidos).toContainText(/(?<!\d)3(?!\d)/);
    await expect(pedidos).toContainText('+200 %');
    await expect(pedidos).toContainText('Sube');
    await expect(pedidos).toContainText('frente al mismo tramo del mes anterior');
    // Las ventas no cuentan el envío (PBI-0186) ni el pedido cancelado: 1,334.50 contra 0 del tramo anterior.
    const ventas = tarjeta(page, 'Total de ventas');
    await expect(ventas).toContainText(/S\/\s?1,334\.50/);
    await expect(ventas).toContainText('—');

    // La tabla de últimos pedidos muestra el total del pedido (con el envío) y la fecha en formato de día.
    const tabla = main.getByRole('region', { name: 'Últimos pedidos' }).getByRole('table');
    await expect(tabla.getByRole('row', { name: /WS-RES-1/ })).toContainText(/S\/\s?1,244\.50/);
    // Estados del mes: 1 de 3 completado, 1 en proceso y 1 cancelado; el resto del reparto va al primer grupo (34, 33 y
    // 33). El pedido del mes anterior ya no cuenta (lote 45).
    await expect(main.getByText('34 %', { exact: true })).toHaveCount(1);
    await expect(main.getByText('33 %', { exact: true })).toHaveCount(2);
  });
});

/**
 * Lote 13 (ADR-0021), PBI-0186: la ayuda de «Total de ventas» dice qué suma. Se abre con el puntero, con el teclado
 * y al tocarla, y se cierra con Escape (WCAG 1.4.13); el botón la nombra con `aria-describedby`.
 */
test.describe('PBI-0186: ayuda de «Total de ventas»', () => {
  const TEXTO = 'Suma el valor de los productos vendidos, con IGV y sin el costo del envío.';

  test('con el teclado se abre al enfocarla y Escape la cierra', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const ayuda = page.getByRole('button', { name: 'Qué incluye: Total de ventas' });
    const texto = page.getByRole('tooltip');
    await expect(ayuda).toHaveAccessibleDescription(new RegExp(TEXTO.replace(/[.]/g, '\\.')));
    await expect(texto).toBeHidden();

    await page.locator('body').focus();
    for (let pulsaciones = 0; pulsaciones < 60; pulsaciones += 1) {
      if (await ayuda.evaluate((nodo) => nodo === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(ayuda).toBeFocused();
    await expect(texto).toBeVisible();
    await expect(texto).toContainText(TEXTO);
    await page.keyboard.press('Escape');
    await expect(texto).toBeHidden();
    await expect(ayuda).toBeFocused();
  });

  test('con el puntero se abre al pasar por encima y se cierra al salir', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const ayuda = page.getByRole('button', { name: 'Qué incluye: Total de ventas' });
    const texto = page.getByRole('tooltip');
    await ayuda.hover();
    await expect(texto).toBeVisible();
    // Se puede llevar el puntero al texto sin que desaparezca.
    await texto.hover();
    await expect(texto).toBeVisible();
    await page.getByRole('heading', { level: 1, name: 'Dashboard' }).hover();
    await expect(texto).toBeHidden();
  });

  test.describe('a 375 px', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('al tocarla se abre dentro de la tarjeta, sin desbordar la página', async ({ page }) => {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.getByRole('button', { name: 'Qué incluye: Total de ventas' }).click();
      const texto = page.getByRole('tooltip');
      await expect(texto).toBeVisible();
      const cajaTexto = (await texto.boundingBox())!;
      const cajaTarjeta = (await tarjeta(page, 'Total de ventas').boundingBox())!;
      expect(cajaTexto.x).toBeGreaterThanOrEqual(cajaTarjeta.x);
      expect(cajaTexto.x + cajaTexto.width).toBeLessThanOrEqual(cajaTarjeta.x + cajaTarjeta.width);
      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborde).toBe(false);
    });
  });
});
