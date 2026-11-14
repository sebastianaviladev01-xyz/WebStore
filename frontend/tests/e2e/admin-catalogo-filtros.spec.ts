import { expect, request as nuevoRequest, test, type Locator, type Page } from '@playwright/test';

import {
  actualizarProducto,
  agregarProductos,
  cambiarProductos,
  leerProductos,
  productoDePrueba,
  retirarProductos,
  type ProductoApi,
} from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Filtros y registro del catálogo del Admin (feature 008). Productos (⚠ TASK-08):
 *
 * - TEST-11 (AC-02, AC-03): con `/productos` abierto, otra sesión agrega «Cooler portátil» y cambia otro producto;
 *   «Buscar» con «cooler» solo muestra coincidencias y, sin filtros, todo, con el cambio. Sin distinguir
 *   mayúsculas, tildes ni espacios de los extremos.
 * - TEST-12 (AC-04, AC-14): sin resultados, un mensaje distinto del catálogo vacío y el panel disponible;
 *   «Limpiar filtros» vacía todos los filtros de una vez y, con «Buscar», vuelve la lista completa.
 * - TEST-13 (AC-05, AC-06): «Nuevo producto» abre `/productos/nuevo` sin la lista y con todos los campos; «Volver a
 *   productos» conserva filtros y página; guardar vuelve al listado con sus filtros y el producto, y la tienda lo
 *   publica.
 * - TEST-14 (AC-07): «Editar» abre `/productos/:id` con los datos actuales y vuelve con el cambio; un producto que
 *   otra sesión eliminó muestra «Este producto ya no existe».
 * - TEST-17 (AC-11): el vendedor filtra, busca y edita la ficha con SKU, precio, categoría, marca y estado
 *   bloqueados (el BFF los conserva); no ve «Nuevo producto» ni «Eliminar»; `/productos/nuevo` lo lleva al Resumen.
 *
 * Los cambios de datos se hacen como «otra sesión» con la API del Admin (`apoyo/catalogo.ts`) y cada prueba deja
 * los productos como estaban en un `finally`. A 1440 px, el tamaño por defecto de la suite.
 */

const lista = (page: Page) => page.getByRole('region', { name: 'Lista de productos' });
const panel = (page: Page) => page.getByRole('search', { name: 'Filtros de productos' });
const editar = (zona: Locator) => zona.getByRole('link', { name: 'Editar', exact: true });

const filaDe = (page: Page, nombre: string) =>
  lista(page)
    .locator('div')
    .filter({ has: editar(page) })
    .filter({ hasText: nombre });

/** Nombres de los productos de la lista, en orden: el texto del `strong` de cada fila. */
const nombresEnLista = (page: Page) => lista(page).locator('strong');

async function abrirProductos(page: Page, ruta = '/productos'): Promise<void> {
  await page.goto(ruta);
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
  await expect(panel(page)).toBeVisible();
}

/** Pulsa «Buscar» y espera a que termine la consulta («Buscando…» vuelve a «Buscar»). */
async function buscar(page: Page): Promise<void> {
  await panel(page)
    .getByRole('button', { name: /^Busca/ })
    .click();
  await expect(panel(page).getByRole('button', { name: 'Buscar', exact: true })).toBeEnabled();
}

async function elegir(page: Page, zona: Locator, campo: string, opcion: string): Promise<void> {
  await zona.getByRole('combobox', { name: campo }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
}

/** Deja los productos del BFF como estaban al empezar la prueba. */
const restaurar = (originales: ProductoApi[]) => cambiarProductos(() => originales);

test.describe('Filtros y registro de productos del Admin', () => {
  test('TEST-11 · «Buscar» filtra con los datos actuales y, sin filtros, muestra todo', async ({ page }) => {
    const originales = await leerProductos();
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await abrirProductos(page);
      await expect(editar(lista(page))).toHaveCount(originales.length);

      // Otra sesión agrega un producto y cambia el nombre de otro con la página abierta.
      await agregarProductos([
        productoDePrueba({ id: 'e2e-008-cooler', sku: 'E2E-COOLER-01', name: 'Cooler portátil' }),
      ]);
      await actualizarProducto('p-005', { name: 'Monitor UltraWide 34” Edición 008' });
      await expect(filaDe(page, 'Cooler portátil')).toHaveCount(0);

      // Mayúsculas y espacios en los extremos no cuentan; la URL guarda el texto sin ellos.
      await panel(page).getByRole('textbox', { name: 'Nombre' }).fill('  COOLER ');
      await buscar(page);
      await expect(page).toHaveURL(/\/productos\?nombre=COOLER$/);
      await expect(nombresEnLista(page)).toHaveText(['Cooler portátil']);

      // Sin tilde también lo encuentra.
      await panel(page).getByRole('textbox', { name: 'Nombre' }).fill('portatil');
      await buscar(page);
      await expect(nombresEnLista(page)).toHaveText(['Cooler portátil']);

      // Sin filtros: todos, con el agregado y con el nombre cambiado.
      await panel(page).getByRole('textbox', { name: 'Nombre' }).fill('');
      await buscar(page);
      await expect(page).toHaveURL(/\/productos$/);
      await expect(editar(lista(page))).toHaveCount(originales.length + 1);
      await expect(filaDe(page, 'Cooler portátil')).toHaveCount(1);
      await expect(filaDe(page, 'Monitor UltraWide 34” Edición 008')).toHaveCount(1);
    } finally {
      await restaurar(originales);
    }
  });

  test('TEST-12 · sin resultados y «Limpiar filtros»', async ({ page }) => {
    const originales = await leerProductos();
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await abrirProductos(page);
    const filtros = panel(page);

    await filtros.getByRole('textbox', { name: 'Nombre' }).fill('Televisor');
    await filtros.getByRole('textbox', { name: 'SKU' }).fill('ZZZ-008');
    await elegir(page, filtros, 'Marca', 'Zenith');
    await elegir(page, filtros, 'Estado', 'Inactivos');
    await buscar(page);

    await expect(lista(page).getByText('Ningún producto cumple los filtros.')).toBeVisible();
    await expect(lista(page).getByText('Todavía no hay productos.')).toHaveCount(0);
    await expect(editar(lista(page))).toHaveCount(0);
    await expect(filtros.getByRole('textbox', { name: 'Nombre' })).toBeEditable();

    // «Limpiar filtros» vacía todo de una vez y no busca.
    await filtros.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(filtros.getByRole('textbox', { name: 'Nombre' })).toHaveValue('');
    await expect(filtros.getByRole('textbox', { name: 'SKU' })).toHaveValue('');
    await expect(filtros.getByRole('combobox', { name: 'Marca' })).toContainText('Todas');
    await expect(filtros.getByRole('combobox', { name: 'Estado' })).toContainText('Todos');
    await expect(page).toHaveURL(/\/productos\?/);
    await expect(lista(page).getByText('Ningún producto cumple los filtros.')).toBeVisible();

    await buscar(page);
    await expect(page).toHaveURL(/\/productos$/);
    await expect(editar(lista(page))).toHaveCount(originales.length);
  });

  test('TEST-13 · «Nuevo producto» abre el registro, «Volver» conserva los filtros y guardar publica', async ({
    page,
  }) => {
    const originales = await leerProductos();
    const nombre = 'Ventilador de torre 008';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      // Filtros y página en la URL; la página 2 no existe con un resultado y se muestra la última.
      const consulta = /\/productos\?nombre=ventilador&pagina=2$/;
      await abrirProductos(page, '/productos?nombre=ventilador&pagina=2');
      await expect(panel(page).getByRole('textbox', { name: 'Nombre' })).toHaveValue('ventilador');

      await page.getByRole('link', { name: 'Nuevo producto', exact: true }).click();
      await expect(page).toHaveURL(/\/productos\/nuevo\?nombre=ventilador&pagina=2$/);
      const formulario = page.getByRole('form', { name: 'Nuevo producto' });
      await expect(formulario).toBeVisible();
      await expect(lista(page)).toHaveCount(0);
      for (const [rol, campo] of [
        ['textbox', 'Nombre'],
        ['textbox', 'SKU'],
        ['textbox', 'Descripción'],
        ['textbox', 'Imagen principal'],
        ['textbox', 'Miniatura optimizada'],
        ['textbox', 'URL de foto'],
        ['textbox', 'Características (una por línea)'],
        ['spinbutton', 'Precio'],
        ['spinbutton', 'Stock'],
        ['combobox', 'Categoría'],
        ['combobox', 'Marca'],
        ['checkbox', 'Activo'],
      ] as const) {
        await expect(formulario.getByRole(rol, { name: campo, exact: true })).toBeVisible();
      }
      await expect(formulario.getByRole('group', { name: 'Galería de fotos' })).toBeVisible();

      // «Volver a productos» sin guardar conserva filtros y página.
      await page.getByRole('link', { name: 'Volver a productos' }).click();
      await expect(page).toHaveURL(consulta);
      await expect(panel(page).getByRole('textbox', { name: 'Nombre' })).toHaveValue('ventilador');

      // Guardar vuelve al listado con los mismos filtros, y el producto nuevo los cumple.
      await page.getByRole('link', { name: 'Nuevo producto', exact: true }).click();
      await formulario.getByRole('textbox', { name: 'Nombre', exact: true }).fill(nombre);
      await formulario.getByRole('textbox', { name: 'SKU', exact: true }).fill('E2E-VENT-008');
      await formulario.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Tres velocidades.');
      await formulario
        .getByRole('textbox', { name: 'Imagen principal', exact: true })
        .fill('assets/products/washer-studio.jpg');
      await formulario
        .getByRole('textbox', { name: 'Características (una por línea)', exact: true })
        .fill('Tres velocidades\nTemporizador');
      await formulario.getByRole('spinbutton', { name: 'Precio', exact: true }).fill('249');
      await formulario.getByRole('spinbutton', { name: 'Stock', exact: true }).fill('5');
      await elegir(page, formulario, 'Categoría', 'Electrohogar');
      await elegir(page, formulario, 'Marca', 'Zenith');
      await formulario.getByRole('button', { name: 'Guardar producto' }).click();

      await expect(page).toHaveURL(consulta);
      await expect(nombresEnLista(page)).toHaveText([nombre]);

      const tienda = await nuevoRequest.newContext({ baseURL: urls.bff });
      try {
        const catalogo = await tienda.get('/bff/catalog/products');
        expect(catalogo.ok()).toBe(true);
        const nombres = ((await catalogo.json()) as { name: string }[]).map((p) => p.name);
        expect(nombres).toContain(nombre);
      } finally {
        await tienda.dispose();
      }
    } finally {
      await restaurar(originales);
    }
  });

  test('TEST-14 · «Editar» abre los datos actuales y avisa si el producto ya no existe', async ({ page }) => {
    const originales = await leerProductos();
    const temporal = productoDePrueba({
      id: 'e2e-008-temporal',
      sku: 'E2E-TEMP-01',
      name: 'Producto temporal 008',
    });
    try {
      await agregarProductos([temporal]);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await abrirProductos(page);
      await expect(filaDe(page, temporal.name)).toHaveCount(1);

      // Otra sesión cambia «Soundbar Cinema 500» con la lista abierta: la edición trae el nombre actual.
      await actualizarProducto('p-004', { name: 'Soundbar Cinema 500 Pro' });
      await editar(filaDe(page, 'Soundbar Cinema 500')).click();
      await expect(page).toHaveURL(/\/productos\/p-004$/);
      const formulario = page.getByRole('form', { name: 'Editar producto' });
      const campoNombre = formulario.getByRole('textbox', { name: 'Nombre', exact: true });
      await expect(campoNombre).toHaveValue('Soundbar Cinema 500 Pro');

      await campoNombre.fill('Soundbar Cinema 500 editada');
      await formulario.getByRole('button', { name: 'Guardar producto' }).click();
      await expect(page).toHaveURL(/\/productos$/);
      await expect(filaDe(page, 'Soundbar Cinema 500 editada')).toHaveCount(1);
      await expect(filaDe(page, temporal.name)).toHaveCount(1);

      // Otra sesión elimina el temporal con la lista abierta: al abrirlo, ya no existe.
      await retirarProductos([temporal.id]);
      await editar(filaDe(page, temporal.name)).click();
      await expect(page).toHaveURL(/\/productos\/e2e-008-temporal$/);
      await expect(page.getByText('Este producto ya no existe')).toBeVisible();
      await expect(page.getByRole('form', { name: 'Editar producto' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Volver a productos' }).click();
      await expect(page).toHaveURL(/\/productos$/);
    } finally {
      await restaurar(originales);
    }
  });

  test('TEST-17 · el vendedor filtra y edita la ficha, sin crear ni eliminar', async ({ page }) => {
    const originales = await leerProductos();
    const antes = originales.find((p) => p.id === 'p-004');
    if (!antes) throw new Error('Falta «Soundbar Cinema 500» (p-004) en el seed');
    try {
      await ingresarAlAdmin(page, cuentasAdmin.vendedor);
      await abrirProductos(page);
      await expect(page.getByRole('link', { name: 'Nuevo producto', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Eliminar producto/ })).toHaveCount(0);

      await panel(page).getByRole('textbox', { name: 'Nombre' }).fill('soundbar');
      await buscar(page);
      await expect(nombresEnLista(page)).toHaveText([antes.name]);

      await editar(filaDe(page, antes.name)).click();
      await expect(page).toHaveURL(/\/productos\/p-004\?nombre=soundbar$/);
      const formulario = page.getByRole('form', { name: 'Editar producto' });
      // Solo lectura: Playwright cuenta `readonly` como no editable.
      await expect(formulario.getByRole('textbox', { name: 'Nombre', exact: true })).toBeEditable();
      await expect(formulario.getByRole('textbox', { name: 'SKU', exact: true })).not.toBeEditable();
      await expect(formulario.getByRole('spinbutton', { name: 'Precio', exact: true })).not.toBeEditable();
      await expect(formulario.getByRole('combobox', { name: 'Categoría' })).toBeDisabled();
      await expect(formulario.getByRole('combobox', { name: 'Marca' })).toBeDisabled();
      await expect(formulario.getByRole('checkbox', { name: 'Activo' })).toBeDisabled();

      await formulario
        .getByRole('textbox', { name: 'Nombre', exact: true })
        .fill('Soundbar Cinema 500 vendedor');
      await formulario.getByRole('button', { name: 'Guardar producto' }).click();
      await expect(page).toHaveURL(/\/productos\?nombre=soundbar$/);
      await expect(nombresEnLista(page)).toHaveText(['Soundbar Cinema 500 vendedor']);

      // El BFF guarda la ficha y conserva SKU, precio, categoría, marca y estado.
      const despues = (await leerProductos()).find((p) => p.id === 'p-004');
      expect(despues).toMatchObject({
        name: 'Soundbar Cinema 500 vendedor',
        sku: antes.sku,
        price: antes.price,
        categoryId: antes.categoryId,
        brandId: antes.brandId,
        active: antes.active,
      });

      // La dirección del registro de un producto nuevo lo lleva al Resumen.
      await page.goto('/productos/nuevo');
      await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole('form', { name: 'Nuevo producto' })).toHaveCount(0);
    } finally {
      await restaurar(originales);
    }
  });
});
