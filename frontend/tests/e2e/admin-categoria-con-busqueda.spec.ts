import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  agregarCategorias,
  agregarProductos,
  leerCategorias,
  leerProductos,
  productoDePrueba,
  retirarCategorias,
  retirarProductos,
  type CategoriaApi,
} from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';
import { cargarImagenPrincipal } from './apoyo/fotos';

/**
 * Lote 29 (ADR-0027, PBI-0238; provisional, por confirmar con Daniel): la categoría del filtro de Productos y del registro
 * del producto se elige con búsqueda, en lugar del `mat-select` sangrado. Daniel: «es un input select» que busca «en
 * todos los niveles donde esté una categoría» (electrodomésticos, refrigeradoras y, dentro, side by side), desde «mínimo
 * tres caracteres y le doy enter», y se limita «únicamente a una categoría».
 *
 * - Al abrirse muestra todo el árbol, con la ruta de cada categoría; con menos de tres caracteres no filtra.
 * - Desde el tercero filtra en todos los niveles, sin distinguir mayúsculas ni tildes, y Enter elige la primera.
 * - La elegida se ve en el campo con su ruta; «Quitar la categoría» y «Limpiar filtros» la vacían.
 * - Lo escrito sin elegir se descarta al salir; el resultado del filtro (con las subcategorías) y la validación del
 *   registro no cambian.
 *
 * Las categorías y los productos se agregan como «otra sesión» con la API del Admin y se retiran en un `finally`.
 */
const ID = 'e2e29';
const CATEGORIAS: CategoriaApi[] = [
  { id: `${ID}-elec`, name: 'Electrodomésticos', order: 9 },
  { id: `${ID}-refri`, name: 'Refrigeradoras', parentId: `${ID}-elec`, order: 1 },
  { id: `${ID}-side`, name: 'Side by side', parentId: `${ID}-refri`, order: 1 },
  { id: `${ID}-frigo`, name: 'Frigobar', parentId: `${ID}-refri`, order: 2 },
  { id: `${ID}-lava`, name: 'Lavadoras', parentId: `${ID}-elec`, order: 2 },
];
const SIDE = 'Electrodomésticos › Refrigeradoras › Side by side';
const PRODUCTOS = [
  productoDePrueba({
    id: `${ID}-p-side`,
    sku: 'E2E29-SIDE',
    name: 'Nevera E2E29 side',
    categoryId: `${ID}-side`,
  }),
  productoDePrueba({
    id: `${ID}-p-frigo`,
    sku: 'E2E29-FRIGO',
    name: 'Frigobar E2E29',
    categoryId: `${ID}-frigo`,
  }),
  productoDePrueba({
    id: `${ID}-p-lava`,
    sku: 'E2E29-LAVA',
    name: 'Lavadora E2E29',
    categoryId: `${ID}-lava`,
  }),
];

const panel = (page: Page) => page.getByRole('search', { name: 'Filtros de productos' });
const lista = (page: Page) => page.getByRole('region', { name: 'Lista de productos' });
const nombresEnLista = (page: Page) => lista(page).locator('strong');
const categoria = (zona: Locator) => zona.getByRole('combobox', { name: 'Categoría' });
const opciones = (page: Page) => page.getByRole('listbox').getByRole('option');

async function abrirProductos(page: Page, ruta = '/productos'): Promise<void> {
  await page.goto(ruta);
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
  await expect(panel(page)).toBeVisible();
}

async function buscar(page: Page): Promise<void> {
  await panel(page)
    .getByRole('button', { name: /^Busca/ })
    .click();
  await expect(panel(page).getByRole('button', { name: 'Buscar', exact: true })).toBeEnabled();
}

async function conDatos(prueba: () => Promise<void>): Promise<void> {
  await agregarCategorias(CATEGORIAS);
  await agregarProductos(PRODUCTOS);
  try {
    await prueba();
  } finally {
    await retirarProductos((await leerProductos()).filter((p) => p.sku.startsWith('E2E29')).map((p) => p.id));
    await retirarCategorias(CATEGORIAS.map((c) => c.id).reverse());
  }
}

test.describe('Categoría con búsqueda en Productos (PBI-0238)', () => {
  test('el filtro busca en todos los niveles desde el tercer carácter, Enter elige y filtra con las subcategorías', async ({
    page,
  }) => {
    await conDatos(async () => {
      const total = (await leerCategorias()).length;
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await abrirProductos(page);
      const campo = categoria(panel(page));
      await expect(campo).toHaveValue('');
      await expect(campo).toHaveAttribute('placeholder', 'Todas');
      await expect(campo).toHaveAccessibleDescription('Escribe 3 caracteres para buscar.');

      // Al abrirse, todo el árbol con la ruta de cada categoría; con dos caracteres, todavía no filtra.
      await campo.click();
      await expect(opciones(page)).toHaveCount(total);
      await expect(opciones(page).filter({ hasText: SIDE })).toHaveCount(1);
      await campo.pressSequentially('sí');
      await expect(opciones(page)).toHaveCount(total);

      // Desde el tercero filtra, sin distinguir mayúsculas ni tildes; Enter elige la primera y no busca todavía.
      await campo.pressSequentially('DE');
      await expect(opciones(page)).toHaveText([SIDE]);
      await campo.press('Enter');
      await expect(campo).toHaveValue(SIDE);
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(page).toHaveURL(/\/productos$/);

      // Con la categoría elegida, Enter envía el filtro; el resultado no cambia de criterio.
      await campo.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/productos\\?categoria=${ID}-side$`));
      await expect(nombresEnLista(page)).toHaveText(['Nevera E2E29 side']);

      // Quitar la deja vacía y con el foco en el campo.
      await panel(page).getByRole('button', { name: 'Quitar la categoría' }).click();
      await expect(campo).toHaveValue('');
      await expect(campo).toBeFocused();

      // Primero las que coinciden por su nombre; las flechas recorren la lista y Enter elige la activa.
      await campo.pressSequentially('refri');
      await expect(opciones(page)).toHaveText([
        'Electrodomésticos › Refrigeradoras',
        'Electrodomésticos › Refrigeradoras › Side by side',
        'Electrodomésticos › Refrigeradoras › Frigobar',
      ]);
      await campo.press('ArrowDown');
      await campo.press('ArrowDown');
      await campo.press('Enter');
      await expect(campo).toHaveValue('Electrodomésticos › Refrigeradoras › Frigobar');

      // Sin coincidencias lo dice; lo escrito sin elegir se descarta al salir y queda la elegida.
      await campo.fill('');
      await campo.pressSequentially('zzzz');
      await expect(opciones(page)).toHaveText(['Ninguna categoría coincide']);
      await campo.press('Tab');
      await expect(campo).toHaveValue('Electrodomésticos › Refrigeradoras › Frigobar');

      // Una categoría con subcategorías filtra también las de dentro, como antes.
      await campo.fill('');
      await campo.pressSequentially('electrodomesticos');
      await campo.press('Enter');
      await expect(campo).toHaveValue('Electrodomésticos');
      await buscar(page);
      await expect(page).toHaveURL(new RegExp(`/productos\\?categoria=${ID}-elec$`));
      await expect(nombresEnLista(page)).toHaveText([
        'Nevera E2E29 side',
        'Frigobar E2E29',
        'Lavadora E2E29',
      ]);

      // «Limpiar filtros» la vacía sin buscar; al volver con la URL, el campo muestra la ruta.
      await panel(page).getByRole('button', { name: 'Limpiar filtros' }).click();
      await expect(campo).toHaveValue('');
      await expect(page).toHaveURL(new RegExp(`/productos\\?categoria=${ID}-elec$`));
      await abrirProductos(page, `/productos?categoria=${ID}-refri`);
      await expect(categoria(panel(page))).toHaveValue('Electrodomésticos › Refrigeradoras');
      await expect(nombresEnLista(page)).toHaveText(['Nevera E2E29 side', 'Frigobar E2E29']);
    });
  });

  test('el registro del producto elige la categoría con búsqueda y sigue siendo obligatoria', async ({
    page,
  }) => {
    await conDatos(async () => {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/productos/p-004');
      const editar = page.getByRole('form', { name: 'Editar producto' });
      await expect(categoria(editar)).toHaveValue('TV y audio');

      await page.goto('/productos/nuevo');
      const formulario = page.getByRole('form', { name: 'Nuevo producto' });
      const campo = categoria(formulario);
      await expect(campo).toHaveAttribute('aria-required', 'true');
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(campo).toHaveAccessibleDescription('Completa este campo.');

      await formulario.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Nevera E2E29 registro');
      await formulario.getByRole('textbox', { name: 'SKU', exact: true }).fill('E2E29-REGISTRO');
      await formulario.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Dos puertas.');
      await cargarImagenPrincipal(formulario);
      await formulario.getByRole('textbox', { name: 'Característica 1', exact: true }).fill('Dos puertas');
      await formulario.getByRole('spinbutton', { name: 'Precio', exact: true }).fill('2999');

      // Elegida con Enter; quitada, vuelve a ser obligatoria; elegida otra vez con el clic.
      await campo.click();
      await campo.pressSequentially('Side');
      await campo.press('Enter');
      await expect(campo).toHaveValue(SIDE);
      await expect(campo).toHaveAccessibleDescription('Escribe 3 caracteres para buscar.');
      await formulario.getByRole('button', { name: 'Quitar la categoría' }).click();
      await expect(campo).toHaveValue('');
      await campo.press('Tab');
      await expect(campo).toHaveAccessibleDescription('Completa este campo.');
      await campo.click();
      await opciones(page).filter({ hasText: SIDE }).click();
      await expect(campo).toHaveValue(SIDE);

      await formulario.getByRole('combobox', { name: 'Marca' }).click();
      await page.getByRole('option', { name: 'Zenith', exact: true }).click();
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/productos$/);
      expect((await leerProductos()).find((p) => p.sku === 'E2E29-REGISTRO')).toMatchObject({
        categoryId: `${ID}-side`,
      });
    });
  });
});
