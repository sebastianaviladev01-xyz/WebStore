import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin, menuAdmin } from './apoyo/entorno';

/**
 * Resumen del Admin: estructura y textos de la especificación (tarjetas con «Ver más», gráfico, distritos,
 * alertas, últimos pedidos y estados). No comprueba cifras: dependen de los pedidos que hayan creado otras specs.
 */
const tarjetas = [
  { titulo: 'Total de pedidos', destino: '/pedidos' },
  { titulo: 'Total de ventas', destino: '/pedidos' },
  { titulo: 'Total de clientes', destino: '/clientes' },
  { titulo: 'Stock bajo', destino: '/inventario' },
];

test('el superadministrador ve los bloques del Resumen en su orden', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const main = page.getByRole('main');

  // Los títulos de los bloques, en el orden de la página.
  await expect(main.getByRole('heading', { level: 2 })).toHaveText([
    ...tarjetas.map((t) => t.titulo),
    'Pedidos y clientes nuevos por día',
    'Pedidos por distrito',
    'Alertas de inventario',
    'Últimos pedidos',
    'Pedidos por estado',
    // Lote 07b (PBI-0028 y PBI-0027): al final, para no mover los bloques que ya había.
    'Actividad reciente',
    'Personas en línea',
  ]);

  // Cada tarjeta lleva su «Ver más» hacia el módulo correspondiente.
  for (const { titulo, destino } of tarjetas) {
    const enlace = main.getByRole('link', { name: `Ver más (${titulo})` });
    await expect(enlace).toBeVisible();
    await expect(enlace).toHaveAttribute('href', destino);
  }

  // Leyendas del gráfico.
  const leyenda = main.getByRole('list', { name: 'Leyenda' });
  await expect(leyenda).toContainText('Pedidos');
  await expect(leyenda).toContainText('Clientes nuevos');

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
  await page.getByRole('main').getByRole('link', { name: 'Ver más (Total de clientes)' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
});

test('el vendedor solo ve el stock bajo y las alertas, que llevan a Productos (PBI-0013)', async ({
  page,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.vendedor);
  const main = page.getByRole('main');

  await expect(main.getByRole('heading', { level: 2, name: 'Stock bajo' })).toBeVisible();
  for (const oculto of ['Total de pedidos', 'Total de ventas', 'Total de clientes', 'Pedidos por día']) {
    await expect(main.getByRole('heading', { level: 2, name: oculto })).toHaveCount(0);
  }
  await expect(main.getByText('Clientes nuevos')).toHaveCount(0);
  // Sin Inventario, el stock se cambia en la ficha de cada producto.
  await expect(main.getByRole('link', { name: 'Gestionar productos →' })).toBeVisible();
  await main.getByRole('link', { name: 'Ver más (Stock bajo)' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
});

/**
 * Bloques plegables del Resumen (feature 003, TEST-05). Los cinco bloques con título se pliegan desde un botón
 * dentro de su `h2` y las tarjetas no (D1); plegar oculta el contenido sin perder los datos (AC-04); teclado
 * (AC-05); al recargar o al volver al Resumen, todos desplegados (AC-07, D2, D4); a 375 px también (AC-13).
 */
const BLOQUES_SUPERADMIN = [
  'Pedidos y clientes nuevos por día',
  'Pedidos por distrito',
  'Alertas de inventario',
  'Últimos pedidos',
  'Pedidos por estado',
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

test.describe('Bloques plegables del Resumen', () => {
  test('los bloques con título tienen botón plegable dentro del h2 y las tarjetas no', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const main = page.getByRole('main');

    await expect(main.getByRole('heading', { level: 2 }).getByRole('button')).toHaveText([
      ...BLOQUES_SUPERADMIN,
    ]);
    for (const { titulo } of tarjetas) {
      await expect(main.getByRole('heading', { level: 2, name: titulo }).getByRole('button')).toHaveCount(0);
    }
    for (const titulo of BLOQUES_SUPERADMIN) await expect(await regionDeBloque(page, titulo)).toHaveCount(1);
    // Al entrar, todos desplegados (D2).
    await esperarBloques(page, BLOQUES_SUPERADMIN, []);
  });

  test('plegar «Pedidos por distrito» oculta su contenido sin cambiar los demás, y al desplegarlo vuelven los mismos datos', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const distritos = botonDeBloque(page, 'Pedidos por distrito');
    const region = await regionDeBloque(page, 'Pedidos por distrito');
    const otros = BLOQUES_SUPERADMIN.filter((titulo) => titulo !== 'Pedidos por distrito');
    const contenido = await region.innerText();
    expect(contenido).toContain('Los cinco distritos con más pedidos');

    await distritos.click();
    await esperarBloques(page, otros, ['Pedidos por distrito']);
    await expect(distritos).toBeVisible();
    await expect(page.getByText('Los cinco distritos con más pedidos')).toBeHidden();

    await distritos.click();
    await esperarBloques(page, BLOQUES_SUPERADMIN, []);
    expect(await region.innerText()).toBe(contenido);
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

  test('al recargar y al volver al Resumen desde otra página, todos los bloques están desplegados', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const plegados = ['Pedidos por distrito', 'Últimos pedidos'];
    const abiertos = BLOQUES_SUPERADMIN.filter((titulo) => !plegados.includes(titulo));

    for (const titulo of plegados) await botonDeBloque(page, titulo).click();
    await esperarBloques(page, abiertos, plegados);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
    await esperarBloques(page, BLOQUES_SUPERADMIN, []);

    for (const titulo of plegados) await botonDeBloque(page, titulo).click();
    await esperarBloques(page, abiertos, plegados);
    await page.getByRole('main').getByRole('link', { name: 'Ver más (Stock bajo)' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
    await menuAdmin(page).getByRole('link', { name: 'Resumen', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
    await esperarBloques(page, BLOQUES_SUPERADMIN, []);
  });

  test('el vendedor solo tiene botones en los bloques que ve', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.vendedor);
    const main = page.getByRole('main');

    // Lote 07 (PBI-0013): sin pedidos, solo queda el bloque de las alertas de inventario.
    await expect(main.getByRole('heading', { level: 2 }).getByRole('button')).toHaveText([
      'Alertas de inventario',
    ]);
    await botonDeBloque(page, 'Alertas de inventario').click();
    await esperarBloques(page, [], ['Alertas de inventario']);
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

      await botonDeBloque(page, 'Pedidos por distrito').click();
      await esperarBloques(
        page,
        otros.filter((titulo) => titulo !== 'Pedidos por distrito'),
        ['Pedidos por distrito', 'Últimos pedidos'],
      );

      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborde).toBe(false);
    });
  });
});
