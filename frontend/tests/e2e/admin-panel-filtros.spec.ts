import { expect, test, type Locator, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 11 (ADR-0021), PBI-0171: en el panel de filtros de los diez listados del backoffice, los botones van alineados a
 * la derecha, en el orden «Buscar», «Limpiar» y, en los listados con alta, «Agregar», cada uno con su ícono (Daniel,
 * 2026-11-20). «Limpiar» conserva el nombre accesible «Limpiar filtros». «Agregar» abre la interfaz de registro en
 * Productos, Categorías y Marcas, y lleva al formulario de alta en los listados que registran junto a la lista.
 */
const LISTADOS: readonly { ruta: string; panel: string; agregar: string | null }[] = [
  { ruta: '/productos', panel: 'Filtros de productos', agregar: 'Agregar producto' },
  { ruta: '/categorias', panel: 'Filtros de categorías', agregar: 'Agregar categoría' },
  { ruta: '/marcas', panel: 'Filtros de marcas', agregar: 'Agregar marca' },
  { ruta: '/inventario', panel: 'Filtros de inventario', agregar: null },
  { ruta: '/clientes', panel: 'Filtros de clientes', agregar: 'Agregar cliente' },
  { ruta: '/usuarios', panel: 'Filtros de usuarios', agregar: 'Agregar usuario' },
  { ruta: '/banners', panel: 'Filtros de banners', agregar: 'Agregar banner' },
  { ruta: '/reclamaciones', panel: 'Filtros de reclamaciones', agregar: null },
  { ruta: '/pedidos', panel: 'Filtros de pedidos', agregar: null },
  { ruta: '/envios', panel: 'Filtros de tarifas', agregar: 'Agregar tarifa' },
];

const panelDe = (page: Page, nombre: string) => page.getByRole('search', { name: nombre });

/** Botones y enlaces de acción del panel, en el orden del documento. */
const accionesDe = (panel: Locator) => panel.locator(':scope > div:last-child').locator('button, a');

test.describe('PBI-0171: botones del panel de filtros', () => {
  test('en los diez listados, «Buscar», «Limpiar» y «Agregar» van a la derecha, en ese orden y con ícono', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    for (const listado of LISTADOS) {
      await page.goto(listado.ruta);
      const panel = panelDe(page, listado.panel);
      await expect(panel, listado.ruta).toBeVisible();
      const acciones = accionesDe(panel);
      const nombres = ['Buscar', 'Limpiar filtros', ...(listado.agregar ? [listado.agregar] : [])];
      await expect(acciones, listado.ruta).toHaveCount(nombres.length);
      for (const [i, nombre] of nombres.entries()) {
        await expect(acciones.nth(i), listado.ruta).toHaveAccessibleName(nombre);
        await expect(acciones.nth(i).locator('svg'), `${listado.ruta} · ícono de ${nombre}`).toHaveCount(1);
      }

      // En una fila, de izquierda a derecha, y el último pegado al borde derecho del contenido del panel.
      const cajas = await Promise.all(
        nombres.map(
          async (_, i) => (await acciones.nth(i).boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 },
        ),
      );
      for (let i = 1; i < cajas.length; i++) {
        expect(cajas[i].x, `${listado.ruta} · orden`).toBeGreaterThan(cajas[i - 1].x + cajas[i - 1].width);
        expect(Math.abs(cajas[i].y - cajas[0].y), `${listado.ruta} · misma fila`).toBeLessThan(1);
      }
      const fila = (await panel.locator(':scope > div:last-child').boundingBox())!;
      const ultima = cajas[cajas.length - 1];
      expect(
        Math.abs(ultima.x + ultima.width - (fila.x + fila.width)),
        `${listado.ruta} · a la derecha`,
      ).toBeLessThan(1);
    }
  });

  test('«Agregar» abre el registro propio y, en Clientes, sale de la edición y lleva al formulario de alta', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/marcas');
    await panelDe(page, 'Filtros de marcas').getByRole('link', { name: 'Agregar marca' }).click();
    await expect(page).toHaveURL(/\/marcas\/nueva$/);
    await expect(page.getByRole('form', { name: 'Nueva marca' })).toBeVisible();

    await page.goto('/clientes');
    const lista = page.getByRole('region', { name: 'Lista de clientes' });
    await lista
      .getByRole('button', { name: /^Editar cliente / })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 2, name: 'Editar cliente' })).toBeVisible();
    await panelDe(page, 'Filtros de clientes').getByRole('button', { name: 'Agregar cliente' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Nuevo cliente' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('');
  });

  test('«Agregar» no borra lo que ya se escribió en el formulario de alta', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/clientes');
    const nombre = page.getByRole('textbox', { name: 'Nombre', exact: true });
    await nombre.fill('Cliente a medio escribir');
    await page.getByRole('button', { name: 'Agregar cliente' }).click();
    await expect(nombre).toBeFocused();
    await expect(nombre).toHaveValue('Cliente a medio escribir');
  });
});
