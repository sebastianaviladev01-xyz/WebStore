import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  enviarCambios,
  leerCategorias,
  leerMarcas,
  leerProductos,
  leerSnapshot,
  retirarDelSnapshot,
  sembrarBanners,
  sembrarCategorias,
  sembrarMarcas,
  sembrarProductos,
  sembrarUsuarios,
} from './apoyo/catalogo';
import { correoUnico, cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';
import { cargarImagenPrincipal, pngDeColor } from './apoyo/fotos';

/**
 * PBI-0274 (hallazgo de los lotes 43 y 44, ADR-0033): con más de 10 registros, el que se acaba de crear queda fuera de
 * la página 1, y el listado salta a la suya (`paginacionDeLaUrl`, PBI-0265). Clientes lo prueba en
 * admin-confirmar-borrado.spec.ts; aquí, el resto:
 * - Marcas y Tarifas de envío, que crean en una ventana (`irAlRegistro`);
 * - Productos, Categorías, Usuarios y Banners, cuya página de registro vuelve al listado con `?nuevo=<id>`
 *   (`seguirRegistroNuevo`).
 * En todos, tras crear desde la página 1, la URL lleva una página mayor que 1 y no `nuevo`, y el registro está a la
 * vista. Cada prueba siembra el relleno por la API del Admin y lo quita al terminar, con lo que haya creado.
 */

/** Tras crear: el listado está en otra página que la 1, sin `nuevo` en la URL, y el registro se ve en la lista. */
async function enSuPagina(page: Page, registro: Locator): Promise<void> {
  await expect(page).not.toHaveURL(/[?&]nuevo=/);
  await expect(page).toHaveURL(/[?&]pagina=([2-9]|\d{2,})(&|$)/);
  await expect(registro).toBeVisible();
}

/** Elige una opción de un `mat-select` o del selector de categoría con búsqueda. */
async function elegir(page: Page, zona: Locator, campo: string, opcion: string): Promise<void> {
  await zona.getByRole('combobox', { name: campo }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
}

/** Ids de una colección del snapshot que no estaban en `antes`. */
const nuevosDesde = (antes: readonly { id: string }[], ahora: readonly { id: string }[]) =>
  ahora.filter((item) => !antes.some((otro) => otro.id === item.id)).map((item) => item.id);

test.describe('PBI-0274: al crear, el listado va a la página del registro nuevo', () => {
  test('Marcas: la ventana de registro deja el listado en la página de la marca nueva', async ({ page }) => {
    const antes = await leerMarcas();
    const relleno = await sembrarMarcas(11, 'l274-marcas');
    const nombre = 'Marca nueva 0274';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/marcas');
      await page.getByRole('button', { name: 'Agregar marca', exact: true }).click();
      const ventana = page.getByRole('dialog', { name: 'Nueva marca' });
      const campo = ventana.getByRole('textbox', { name: 'Nombre', exact: true });
      await expect(campo).toBeFocused();
      await campo.fill(nombre);
      await ventana.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(ventana).toBeHidden();
      await enSuPagina(
        page,
        page.getByRole('region', { name: 'Lista de marcas' }).getByLabel(`Editar marca ${nombre}`),
      );
    } finally {
      await retirarDelSnapshot('brands', [...relleno, ...nuevosDesde(antes, await leerMarcas())]);
    }
  });

  test('Tarifas de envío: la ventana de registro deja el listado en la página de la tarifa nueva', async ({
    page,
  }) => {
    // Con unas 1.600 tarifas en orden de origen y destino, «Origen E2E 0274» queda lejos de la página 1.
    const antes = (await leerSnapshot()).rates;
    const origen = 'Origen E2E 0274';
    const distrito = 'Pucusana';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/envios');
      await page.getByRole('button', { name: 'Agregar tarifa' }).click();
      const ventana = page.getByRole('dialog', { name: 'Precio para uno o varios distritos' });
      const tienda = ventana.getByRole('combobox', { name: 'Tienda de origen' });
      await expect(tienda).toBeFocused();
      await tienda.fill(origen);
      await ventana.getByRole('combobox', { name: 'Distritos' }).click();
      await page.getByRole('option', { name: distrito, exact: true }).click();
      await page.keyboard.press('Escape');
      await ventana.getByRole('spinbutton', { name: 'Precio (S/)' }).fill('12.5');
      await ventana.getByRole('button', { name: 'Guardar 1 tarifa' }).click();
      await expect(ventana).toBeHidden();
      await enSuPagina(
        page,
        page
          .getByRole('region', { name: 'Tarifas registradas' })
          .getByRole('button', { name: `Editar tarifa de ${origen} a ${distrito}` }),
      );
    } finally {
      const nuevas = nuevosDesde(antes, (await leerSnapshot()).rates);
      if (nuevas.length) await enviarCambios({ rates: { remove: nuevas } });
    }
  });

  test('Productos: «Guardar» vuelve al listado en la página del producto nuevo', async ({ page }) => {
    const antes = await leerProductos();
    const relleno = await sembrarProductos(11, 'l274-productos');
    const nombre = 'Producto nuevo 0274';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/productos');
      await page.getByRole('link', { name: 'Agregar producto', exact: true }).click();
      const formulario = page.getByRole('form', { name: 'Nuevo producto' });
      await formulario.getByRole('textbox', { name: 'Nombre', exact: true }).fill(nombre);
      await formulario.getByRole('textbox', { name: 'SKU', exact: true }).fill('E2E-0274');
      await formulario.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Para PBI-0274.');
      await cargarImagenPrincipal(formulario);
      await formulario
        .getByRole('table', { name: 'Características' })
        .getByRole('textbox', { name: 'Característica 1', exact: true })
        .fill('Silencioso');
      await formulario.getByRole('spinbutton', { name: 'Precio', exact: true }).fill('150');
      await elegir(page, formulario, 'Categoría', 'Electrohogar');
      await elegir(page, formulario, 'Marca', 'Zenith');
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      await enSuPagina(
        page,
        page.getByRole('region', { name: 'Lista de productos' }).getByLabel(`Editar producto ${nombre}`),
      );
    } finally {
      await retirarDelSnapshot('products', [...relleno, ...nuevosDesde(antes, await leerProductos())]);
    }
  });

  test('Categorías: «Guardar» vuelve al listado en la página de la categoría nueva (cuentan las de primer nivel)', async ({
    page,
  }) => {
    // Las de relleno no tienen orden: van después de las ordenadas, por nombre. «Zz…» queda la última.
    const antes = await leerCategorias();
    const relleno = await sembrarCategorias(11, 'l274-categorias');
    const nombre = 'Zz Categoría nueva 0274';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/categorias');
      await page.getByRole('link', { name: 'Agregar categoría', exact: true }).click();
      const formulario = page.getByRole('form', { name: 'Nueva categoría' });
      await formulario.getByRole('textbox', { name: 'Nombre', exact: true }).fill(nombre);
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      await enSuPagina(
        page,
        page.getByRole('region', { name: 'Lista de categorías' }).getByLabel(`Editar categoría ${nombre}`),
      );
    } finally {
      await retirarDelSnapshot('categories', [...relleno, ...nuevosDesde(antes, await leerCategorias())]);
    }
  });

  test('Usuarios: «Guardar» vuelve al listado en la página del usuario nuevo', async ({ page }) => {
    const antes = (await leerSnapshot()).users;
    const relleno = await sembrarUsuarios(11, 'l274-usuarios');
    const nombre = 'Usuario nuevo 0274';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/usuarios');
      await page.getByRole('link', { name: 'Agregar usuario', exact: true }).click();
      const formulario = page.getByRole('form', { name: 'Nuevo usuario' });
      await formulario.getByRole('textbox', { name: 'Nombre', exact: true }).fill(nombre);
      await formulario.getByRole('textbox', { name: 'Correo', exact: true }).fill(correoUnico('l274'));
      await formulario.getByLabel('Contraseña temporal').fill('Temporal1234');
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      await enSuPagina(
        page,
        page.getByRole('region', { name: 'Usuarios administrativos' }).getByLabel(`Editar usuario ${nombre}`),
      );
    } finally {
      await retirarDelSnapshot('users', [...relleno, ...nuevosDesde(antes, (await leerSnapshot()).users)]);
    }
  });

  test('Banners: «Guardar» vuelve al listado en la página del banner nuevo', async ({ page }) => {
    const antes = (await leerSnapshot()).banners;
    const relleno = await sembrarBanners(11, 'l274-banners');
    const titulo = 'Banner nuevo 0274';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/banners');
      await page.getByRole('link', { name: 'Agregar banner', exact: true }).click();
      const formulario = page.getByRole('form', { name: 'Nuevo banner' });
      await formulario
        .getByLabel('Cargar imagen de escritorio', { exact: true })
        .setInputFiles(await pngDeColor(page, 2560, 1024, '#1f2937'));
      await expect(formulario.getByRole('img', { name: 'Imagen de escritorio, la actual' })).toBeVisible();
      await formulario.getByRole('textbox', { name: 'Antetítulo' }).fill('Campaña');
      await formulario.getByRole('textbox', { name: 'Título', exact: true }).fill(titulo);
      await formulario.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Para PBI-0274.');
      // Inactivo y de promoción: no sale en la tienda ni ocupa el tope de los principales.
      await formulario.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('Inactivo');
      await elegir(page, formulario, 'Ubicación', 'Promoción');
      await formulario.getByLabel('Inicio').fill('2030-12-10T09:30');
      await formulario.getByLabel('Fin').fill('2030-12-20T18:00');
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      await enSuPagina(
        page,
        page.getByRole('region', { name: 'Lista de banners' }).getByLabel(`Editar banner ${titulo}`),
      );
    } finally {
      await retirarDelSnapshot('banners', [
        ...relleno,
        ...nuevosDesde(antes, (await leerSnapshot()).banners),
      ]);
    }
  });
});
