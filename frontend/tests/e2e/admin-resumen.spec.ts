import { expect, test } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

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

test('el vendedor no ve las tarjetas ni la serie de clientes', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.vendedor);
  const main = page.getByRole('main');

  await expect(main.getByRole('heading', { level: 2, name: 'Total de pedidos' })).toBeVisible();
  await expect(main.getByRole('heading', { level: 2, name: 'Pedidos por día' })).toBeVisible();
  await expect(main.getByRole('heading', { level: 2, name: 'Total de clientes' })).toHaveCount(0);
  await expect(main.getByText('Clientes nuevos')).toHaveCount(0);
  await expect(main.getByRole('link', { name: 'Ver más (Total de clientes)' })).toHaveCount(0);
});
