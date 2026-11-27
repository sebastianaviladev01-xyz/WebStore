import { readFile } from 'node:fs/promises';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { agregarProductos, productoDePrueba, retirarProductos } from './apoyo/catalogo';
import {
  TEMAS,
  activarTema,
  colorDelToken,
  fondoDe,
  medirTexto,
  MINIMO,
  relacionDeContraste,
  restablecerTemas,
} from './apoyo/contraste';
import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 43 (ADR-0033, PBI-0265): cada listado del backoffice en un solo panel, como la lista de proveedores del SGC.
 * - Una sola tarjeta (`ws-admin-listado`) con el título y su descripción arriba a la izquierda, «Exportar» arriba a la
 *   derecha, los filtros en una fila, la tabla y el pie.
 * - «Buscar» y «Limpiar» con borde; «Agregar» relleno del principal.
 * - La tabla con «N°» continua entre páginas, el estado como insignia (verde «Activo», naranja «Inactivo») y las
 *   acciones de solo ícono, con nombre accesible y descripción emergente; la de eliminar, roja con el puntero.
 * - El pie: las fichas del total y de cada estado y la paginación con «Elementos por página» (10, 25 o 50; 10 por
 *   omisión, en la URL), el rango «1 - 8 de 8» y primera, anterior, siguiente y última página.
 * - «Exportar» → «CSV (Excel)» descarga las filas filtradas de todas las páginas con BOM UTF-8; «Imprimir o PDF» abre la
 *   impresión con una vista solo de la tabla filtrada completa.
 * - Las insignias, los íconos y los bordes de los controles cumplen ADR-0022 y ADR-0023 con A, B y C.
 * Datos: 12 productos de prueba («Panel 43 …», 3 inactivos) que se quitan al terminar.
 */

const PREFIJO = 'Panel 43';
const PRODUCTOS = Array.from({ length: 12 }, (_, i) =>
  productoDePrueba({
    id: `e2e-43-${String(i + 1).padStart(2, '0')}`,
    sku: `E2E-43-${String(i + 1).padStart(2, '0')}`,
    // Con tildes y una coma, para el CSV.
    name: `${PREFIJO} ${String(i + 1).padStart(2, '0')}${i === 0 ? ' cámara, edición única' : ''}`,
    active: i >= 3,
  }),
);
const ids = PRODUCTOS.map((producto) => producto.id);
const BUSQUEDA = `/productos?nombre=${encodeURIComponent(PREFIJO)}`;

const tarjeta = (page: Page) => page.locator('ws-admin-listado');
const lista = (page: Page) => page.getByRole('region', { name: 'Lista de productos' });
const paginacion = (page: Page, que = 'productos') =>
  page.getByRole('navigation', { name: `Páginas de ${que}` });
const filas = (page: Page) =>
  lista(page)
    .getByRole('row')
    .filter({ has: page.getByRole('cell') });

/** Las cajas se tocan en vertical: están en la misma fila. */
async function enLaMismaFila(a: Locator, b: Locator): Promise<boolean> {
  const [cajaA, cajaB] = [await a.boundingBox(), await b.boundingBox()];
  if (!cajaA || !cajaB) return false;
  return cajaA.y < cajaB.y + cajaB.height && cajaB.y < cajaA.y + cajaA.height;
}

/** Números de la columna «N°» de las filas visibles. */
const numeros = (page: Page) =>
  filas(page).evaluateAll((nodos) =>
    nodos.map((nodo) => Number(nodo.querySelector('[role="cell"]')?.textContent?.replace(/\D+/g, ''))),
  );

test.describe('PBI-0265: listados en un solo panel', () => {
  test.beforeAll(async () => {
    await retirarProductos(ids);
    await agregarProductos(PRODUCTOS);
  });
  test.afterAll(async () => {
    await retirarProductos(ids);
    await restablecerTemas();
  });

  test('una sola tarjeta: título arriba a la izquierda, «Exportar» a la derecha, filtros en una fila y el pie', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(BUSQUEDA);
    const titulo = page.getByRole('heading', { level: 1, name: 'Productos' });
    const exportar = page.getByRole('button', { name: 'Exportar' });
    const panel = page.getByRole('search', { name: 'Filtros de productos' });
    for (const parte of [titulo, exportar, panel, lista(page), paginacion(page)]) {
      await expect(tarjeta(page).locator(parte)).toHaveCount(1);
    }
    await expect(tarjeta(page)).toHaveCount(1);
    await expect(tarjeta(page)).toContainText('Ficha comercial, imágenes, características y stock');
    const [cajaTitulo, cajaExportar] = [await titulo.boundingBox(), await exportar.boundingBox()];
    expect(cajaExportar!.x).toBeGreaterThan(cajaTitulo!.x + cajaTitulo!.width);
    expect(await enLaMismaFila(titulo, exportar)).toBe(true);

    // Filtros en una fila (Clientes: un campo): la búsqueda a la izquierda y los botones a su derecha.
    await page.goto('/clientes');
    const filtros = page.getByRole('search', { name: 'Filtros de clientes' });
    const texto = filtros.getByRole('textbox', { name: 'Buscar cliente' });
    const buscar = filtros.getByRole('button', { name: 'Buscar', exact: true });
    const limpiar = filtros.getByRole('button', { name: 'Limpiar filtros' });
    const agregar = filtros.getByRole('button', { name: 'Agregar cliente' });
    expect(await enLaMismaFila(texto, buscar)).toBe(true);
    expect((await buscar.boundingBox())!.x).toBeGreaterThan((await texto.boundingBox())!.x);
    // «Buscar» y «Limpiar» con borde que se distingue (3:1); «Agregar», relleno del principal.
    for (const boton of [buscar, limpiar]) {
      const borde = await boton.evaluate((nodo) => getComputedStyle(nodo).borderTopColor);
      expect(relacionDeContraste(borde, await fondoDe(boton.locator('..')))).toBeGreaterThanOrEqual(
        MINIMO.marca,
      );
    }
    await expect(agregar).toHaveCSS('background-color', await colorDelToken(page, '--ws-primary'));
  });

  test('la fila de filtros: las listas con su ancho y los botones al final de la misma fila', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    // Pedidos, con el detalle a la derecha (desde 1280 px): una sola lista y los botones en su fila.
    for (const ancho of [1280, 1440]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto('/pedidos');
      const filtros = page.getByRole('search', { name: 'Filtros de pedidos' });
      const estado = filtros.getByRole('combobox', { name: 'Filtrar por estado' });
      const buscar = filtros.getByRole('button', { name: 'Buscar', exact: true });
      await expect(estado).toBeVisible();
      expect(await enLaMismaFila(estado, buscar), `${ancho} px`).toBe(true);
      expect((await estado.boundingBox())!.width, `${ancho} px · la lista no se estira`).toBeLessThanOrEqual(
        260,
      );
    }
    // Productos (5 filtros): los botones quedan en la primera línea, a la derecha; los campos que no caben bajan.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/productos');
    const filtros = page.getByRole('search', { name: 'Filtros de productos' });
    const nombre = filtros.getByRole('textbox', { name: 'Nombre' });
    const agregar = filtros.getByRole('link', { name: 'Agregar producto' });
    const estado = filtros.getByRole('combobox', { name: 'Estado' });
    expect(await enLaMismaFila(nombre, agregar)).toBe(true);
    expect((await agregar.boundingBox())!.x).toBeGreaterThan((await estado.boundingBox())!.x);
    expect((await estado.boundingBox())!.width).toBeLessThanOrEqual(260);
    // La búsqueda de texto crece: es más ancha que una lista.
    expect((await nombre.boundingBox())!.width).toBeGreaterThan((await estado.boundingBox())!.width);
  });

  test('«N°» sigue entre páginas; «Elementos por página» va en la URL con 10 por omisión', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(BUSQUEDA);
    const nav = paginacion(page);
    await expect(lista(page).getByRole('columnheader', { name: 'N°' })).toBeAttached();
    await expect(filas(page)).toHaveCount(10);
    await expect(nav).toContainText('1 - 10 de 12');
    expect(await numeros(page)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    await expect(nav.getByRole('button', { name: 'Primera página' })).toBeDisabled();
    await expect(nav.getByRole('button', { name: 'Página anterior' })).toBeDisabled();

    await nav.getByRole('button', { name: 'Última página' }).click();
    await expect(page).toHaveURL(/[?&]pagina=2(&|$)/);
    await expect(nav).toContainText('11 - 12 de 12');
    expect(await numeros(page)).toEqual([11, 12]);
    await expect(nav.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    await nav.getByRole('button', { name: 'Primera página' }).click();
    await expect(nav).toContainText('1 - 10 de 12');

    // 25 por página: a la página 1, en la URL; se conserva al recargar y al buscar.
    await nav.getByRole('combobox', { name: 'Elementos por página' }).click();
    await page.getByRole('option', { name: '25' }).click();
    await expect(page).toHaveURL(/[?&]porPagina=25(&|$)/);
    await expect(page).not.toHaveURL(/pagina=2/);
    await expect(filas(page)).toHaveCount(12);
    await expect(nav).toContainText('1 - 12 de 12');
    await page.reload();
    await expect(filas(page)).toHaveCount(12);
    await page
      .getByRole('search', { name: 'Filtros de productos' })
      .getByRole('button', { name: 'Buscar', exact: true })
      .click();
    await expect(page).toHaveURL(/[?&]porPagina=25(&|$)/);

    // Volver a 10 quita el parámetro.
    await nav.getByRole('combobox', { name: 'Elementos por página' }).click();
    await page.getByRole('option', { name: '10' }).click();
    await expect(page).not.toHaveURL(/porPagina/);
    await expect(filas(page)).toHaveCount(10);
  });

  test('estado como insignia, acciones de solo ícono con descripción y el resumen del pie', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(`${BUSQUEDA}&porPagina=25`);
    const inactivo = filas(page).filter({ hasText: `${PREFIJO} 02` });
    const activo = filas(page).filter({ hasText: `${PREFIJO} 05` });
    await expect(inactivo.getByText('Inactivo', { exact: true })).toBeVisible();
    await expect(activo.getByText('Activo', { exact: true })).toBeVisible();

    const resumen = page.getByRole('list', { name: 'Resumen de productos' });
    await expect(resumen.getByRole('listitem')).toHaveText(['12 en total', '9 activos', '3 inactivos']);

    const eliminar = activo.getByRole('button', { name: `Eliminar producto ${PREFIJO} 05` });
    const editar = activo.getByRole('link', { name: `Editar producto ${PREFIJO} 05` });
    for (const accion of [eliminar, editar]) {
      expect((await accion.innerText()).trim(), 'solo ícono').toBe('');
      await expect(accion.locator('svg')).toBeVisible();
    }
    // La descripción emergente (matTooltip) es también la descripción accesible del botón.
    await eliminar.hover();
    await expect(eliminar).toHaveAccessibleDescription('Eliminar');
    await expect(eliminar).toHaveCSS('color', await colorDelToken(page, '--ws-danger'));
    await editar.hover();
    await expect(editar).toHaveAccessibleDescription('Editar');
  });

  test('insignias, íconos y bordes de las acciones con A, B y C (ADR-0022 y ADR-0023)', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    for (const tema of TEMAS) {
      await activarTema(tema);
      await page.goto(`${BUSQUEDA}&porPagina=25`);
      for (const [nombre, texto] of [
        [`${PREFIJO} 02`, 'Inactivo'],
        [`${PREFIJO} 05`, 'Activo'],
      ] as const) {
        const insignia = filas(page).filter({ hasText: nombre }).getByText(texto, { exact: true });
        const { color, fondo } = await medirTexto(insignia);
        expect(relacionDeContraste(color, fondo), `${tema} · «${texto}»`).toBeGreaterThanOrEqual(
          MINIMO.texto,
        );
      }
      const editar = filas(page)
        .filter({ hasText: `${PREFIJO} 05` })
        .getByRole('link', { name: /^Editar producto / });
      const medida = await editar.evaluate((nodo) => ({
        icono: getComputedStyle(nodo).color,
        borde: getComputedStyle(nodo).borderTopColor,
      }));
      const fondo = await fondoDe(editar);
      const exterior = await fondoDe(editar.locator('..'));
      expect(relacionDeContraste(medida.icono, fondo), `${tema} · ícono`).toBeGreaterThanOrEqual(
        MINIMO.marca,
      );
      expect(relacionDeContraste(medida.borde, exterior), `${tema} · borde`).toBeGreaterThanOrEqual(
        MINIMO.marca,
      );
    }
    // B, el tema de las demás pruebas.
    await restablecerTemas();
  });

  test('«Exportar» → «CSV (Excel)» descarga las filas filtradas de todas las páginas, con BOM y tildes', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(BUSQUEDA);
    await expect(filas(page)).toHaveCount(10);
    await page.getByRole('button', { name: 'Exportar' }).click();
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: 'CSV (Excel)' }).click(),
    ]);
    expect(descarga.suggestedFilename()).toMatch(/^productos-\d{4}-\d{2}-\d{2}\.csv$/);
    const contenido = await readFile(await descarga.path(), 'utf8');
    expect(contenido.startsWith('﻿')).toBe(true);
    const lineas = contenido.slice(1).trimEnd().split('\r\n');
    expect(lineas[0]).toBe('N°,Producto,SKU,Precio (S/),Stock,Estado');
    expect(lineas).toHaveLength(13);
    expect(lineas[1]).toBe(`1,"${PREFIJO} 01 cámara, edición única",E2E-43-01,199.00,3,Inactivo`);
    expect(lineas[12]).toBe(`12,${PREFIJO} 12,E2E-43-12,199.00,3,Activo`);
  });

  test('«Exportar» → «Imprimir o PDF» imprime solo la tabla filtrada completa', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(BUSQUEDA);
    await expect(filas(page)).toHaveCount(10);
    // La impresión del navegador no se abre en la prueba: se cuenta la llamada.
    await page.evaluate(() => {
      const ventana = window as unknown as { impresiones: number };
      ventana.impresiones = 0;
      window.print = () => void (ventana.impresiones += 1);
    });
    await page.getByRole('button', { name: 'Exportar' }).click();
    await page.getByRole('menuitem', { name: 'Imprimir o PDF' }).click();
    expect(await page.evaluate(() => (window as unknown as { impresiones: number }).impresiones)).toBe(1);

    await page.emulateMedia({ media: 'print' });
    const impresa = page.getByRole('table', { name: 'Productos' });
    await expect(impresa).toHaveCount(1);
    // Con el encabezado, las 12 filas: también las de la página 2.
    await expect(impresa.getByRole('row')).toHaveCount(13);
    await expect(impresa.getByRole('columnheader')).toHaveText([
      'N°',
      'Producto',
      'SKU',
      'Precio (S/)',
      'Stock',
      'Estado',
    ]);
    await expect(page.getByRole('search', { name: 'Filtros de productos' })).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Administración' })).toBeHidden();

    // Al terminar de imprimir, la vista se quita y el listado vuelve.
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await page.emulateMedia({ media: 'screen' });
    await expect(page.getByRole('cell', { name: `${PREFIJO} 11` })).toHaveCount(0);
    await expect(filas(page)).toHaveCount(10);
  });

  test('Usuarios cuenta cada estado y cada rol; Pedidos y Tarifas toman la misma paginación', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/usuarios');
    const resumen = page.getByRole('list', { name: 'Resumen de usuarios' });
    await expect(resumen.getByRole('listitem').first()).toHaveText(/^\d+ en total$/);
    await expect(resumen).toContainText(/\d+ activos?/);
    await expect(resumen).toContainText(/\d+ inactivos?/);
    for (const rol of [/superadministrador/, /administrador/, /vendedor/])
      await expect(resumen).toContainText(rol);

    for (const [ruta, que] of [
      ['/pedidos', 'pedidos'],
      ['/envios', 'tarifas'],
    ] as const) {
      await page.goto(ruta);
      const nav = paginacion(page, que);
      await expect(nav.getByRole('combobox', { name: 'Elementos por página' })).toHaveText('10');
      await expect(nav).toContainText(/(\d+ - \d+|0) de \d+/);
    }
  });

  test('a 375 px los filtros se apilan y nada desborda', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto(BUSQUEDA);
    const panel = page.getByRole('search', { name: 'Filtros de productos' });
    expect(
      await enLaMismaFila(
        panel.getByRole('textbox', { name: 'Nombre' }),
        panel.getByRole('textbox', { name: 'SKU' }),
      ),
    ).toBe(false);
    await expect(paginacion(page)).toBeVisible();
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde).toBeLessThanOrEqual(0);
  });

  test('las ventanas de registro: «Cancelar» de relleno suave y «Guardar» relleno del principal, a la derecha', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    for (const [ruta, boton, ventana] of [
      ['/marcas', 'Agregar marca', 'Nueva marca'],
      ['/clientes', 'Agregar cliente', 'Nuevo cliente'],
    ] as const) {
      await page.goto(ruta);
      await page.getByRole('button', { name: boton }).click();
      const dialogo = page.getByRole('dialog', { name: ventana });
      const cancelar = dialogo.getByRole('button', { name: 'Cancelar' });
      const guardar = dialogo.getByRole('button', { name: 'Guardar', exact: true });
      await expect(guardar).toHaveCSS('background-color', await colorDelToken(page, '--ws-primary'));
      await expect(cancelar).toHaveCSS(
        'background-color',
        await colorDelToken(page, '--ws-surface-soft', { crudo: true }),
      );
      const [cajaCancelar, cajaGuardar, cajaDialogo] = [
        await cancelar.boundingBox(),
        await guardar.boundingBox(),
        await dialogo.boundingBox(),
      ];
      expect(cajaCancelar!.x).toBeLessThan(cajaGuardar!.x);
      expect(cajaCancelar!.x).toBeGreaterThan(cajaDialogo!.x + cajaDialogo!.width / 2 - cajaCancelar!.width);
      await page.keyboard.press('Escape');
      await expect(dialogo).toHaveCount(0);
    }
  });
});
