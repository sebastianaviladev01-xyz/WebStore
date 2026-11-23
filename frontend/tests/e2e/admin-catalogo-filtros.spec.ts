import { expect, request as nuevoRequest, test, type Locator, type Page } from '@playwright/test';

import {
  actualizarProducto,
  agregarCategorias,
  agregarProductos,
  cambiarCategorias,
  cambiarMarcas,
  cambiarProductos,
  leerCategorias,
  leerMarcas,
  leerProductos,
  productoDePrueba,
  retirarCategorias,
  retirarProductos,
  type ProductoApi,
} from './apoyo/catalogo';
import { TEMAS, activarTema, restablecerTemas } from './apoyo/contraste';
import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Filtros y registro del catálogo del Admin (feature 008). Productos (⚠ TASK-08):
 *
 * - TEST-11 (AC-02, AC-03): con `/productos` abierto, otra sesión agrega «Cooler portátil» y cambia otro producto;
 *   «Buscar» con «cooler» solo muestra coincidencias y, sin filtros, todo, con el cambio. Sin distinguir
 *   mayúsculas, tildes ni espacios de los extremos.
 * - TEST-12 (AC-04, AC-14): sin resultados, un mensaje distinto del catálogo vacío y el panel disponible;
 *   «Limpiar filtros» vacía todos los filtros de una vez y, con «Buscar», vuelve la lista completa.
 * - TEST-13 (AC-05, AC-06): «Agregar» (antes «Nuevo producto»; lote 11, PBI-0171) abre `/productos/nuevo` sin la lista y con todos los campos; «Volver a
 *   productos» conserva filtros y página; guardar vuelve al listado con sus filtros y el producto, y la tienda lo
 *   publica.
 * - TEST-14 (AC-07): «Editar» abre `/productos/:id` con los datos actuales y vuelve con el cambio; un producto que
 *   otra sesión eliminó muestra «Este producto ya no existe».
 * - TEST-17 (AC-11, cambiado en el lote 07 por PBI-0013): el vendedor filtra, busca, edita todos los campos y crea
 *   un producto desde «Agregar»; no ve «Eliminar».
 *
 * Categorías (⚠ TASK-09):
 *
 * - TEST-15 (AC-08): «oled» deja una sola fila, la de siempre, con «↳ OLED» y «Padre: TV y audio» aunque el padre no
 *   salga (D7); «Categoría padre» deja solo las hijas directas y «Sin padre», las de primer nivel; «Agregar»
 *   y «Editar» abren su interfaz de registro, y el padre excluye a la misma categoría y a sus subcategorías.
 *
 * Marcas (⚠ TASK-10):
 *
 * - TEST-16 (AC-09): con una marca desactivada por otra sesión, «Inactivos» y «Activos» dejan solo las de ese
 *   estado y «Nombre» filtra sin distinguir mayúsculas; «Agregar» y «Editar» abren su interfaz de registro con
 *   «Nombre» y «Activa», y guardar vuelve al listado con sus filtros.
 *
 * Las tres páginas y los casos de fallo (TASK-11):
 *
 * - TEST-10 (AC-01, AC-10): a 1440 px, Productos, Categorías y Marcas tienen el título, el panel y la lista, en ese
 *   orden vertical, sin formulario de registro; desde el lote 11 (PBI-0171), «Agregar» va en el panel, a la derecha
 *   de «Buscar» y «Limpiar»; la lista ocupa el ancho del panel y los bordes coinciden en las tres páginas.
 * - TEST-18 (AC-12): a 360, 375 y 390 px con A, B y C, las tres listas y sus registros (nuevo y edición) sin
 *   desplazamiento horizontal y con sus controles dentro de la pantalla. B queda activo al terminar.
 * - TEST-19 (AC-15): con 30 productos, 25 en la página 1 y «Página 1 de 2»; «Siguiente» lleva a la 2; una búsqueda
 *   nueva vuelve a la 1; con 25 resultados o menos no hay paginación.
 * - TEST-20 (REQ-02, caso límite): si la consulta del snapshot falla al «Buscar», el aviso sale junto al panel y se
 *   conservan los filtros escritos y los resultados; el reintento funciona.
 * - TEST-21 (REQ-04, caso límite): si el BFF rechaza el guardado con un `400`, el registro de producto, de categoría
 *   y de marca se queda con lo escrito y el motivo junto al botón.
 *
 * Los cambios de datos se hacen como «otra sesión» con la API del Admin (`apoyo/catalogo.ts`) y cada prueba deja
 * los productos, las categorías o las marcas como estaban en un `finally`. TEST-20 y TEST-21 interceptan solo
 * `/bff/admin/snapshot`, con el método que simulan. A 1440 px, el tamaño por defecto de la suite, salvo TEST-18.
 */

const lista = (page: Page) => page.getByRole('region', { name: 'Lista de productos' });
const panel = (page: Page) => page.getByRole('search', { name: 'Filtros de productos' });
const editar = (zona: Locator) => zona.getByRole('link', { name: /^Editar / });

// Lote 07 (PBI-0132): la lista es una tabla; cada producto, una fila con su «Editar producto <nombre>».
const filaDe = (page: Page, nombre: string) =>
  lista(page)
    .getByRole('row')
    .filter({ has: page.getByRole('link', { name: /^Editar / }) })
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

  test('TEST-13 · «Agregar» abre el registro, «Volver» conserva los filtros y guardar publica', async ({
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

      await page.getByRole('link', { name: 'Agregar producto', exact: true }).click();
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
      await page.getByRole('link', { name: 'Agregar producto', exact: true }).click();
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

  test('TEST-17 · el vendedor filtra, crea y modifica todos los campos, sin eliminar (PBI-0013)', async ({
    page,
  }) => {
    const originales = await leerProductos();
    const antes = originales.find((p) => p.id === 'p-004');
    if (!antes) throw new Error('Falta «Soundbar Cinema 500» (p-004) en el seed');
    try {
      await ingresarAlAdmin(page, cuentasAdmin.vendedor);
      await abrirProductos(page);
      await expect(page.getByRole('button', { name: /^Eliminar producto/ })).toHaveCount(0);

      await panel(page).getByRole('textbox', { name: 'Nombre' }).fill('soundbar');
      await buscar(page);
      await expect(nombresEnLista(page)).toHaveText([antes.name]);

      await editar(filaDe(page, antes.name)).click();
      await expect(page).toHaveURL(/\/productos\/p-004\?nombre=soundbar$/);
      const formulario = page.getByRole('form', { name: 'Editar producto' });
      // Lote 07 (PBI-0013, provisional): el vendedor modifica todos los campos del producto.
      await expect(formulario.getByRole('textbox', { name: 'SKU', exact: true })).toBeEditable();
      await expect(formulario.getByRole('spinbutton', { name: 'Precio', exact: true })).toBeEditable();
      await expect(formulario.getByRole('combobox', { name: 'Categoría' })).toBeEnabled();
      await expect(formulario.getByRole('combobox', { name: 'Marca' })).toBeEnabled();
      await expect(formulario.getByRole('checkbox', { name: 'Activo' })).toBeEnabled();

      await formulario
        .getByRole('textbox', { name: 'Nombre', exact: true })
        .fill('Soundbar Cinema 500 vendedor');
      await formulario.getByRole('spinbutton', { name: 'Precio', exact: true }).fill('321');
      await formulario.getByRole('button', { name: 'Guardar producto' }).click();
      await expect(page).toHaveURL(/\/productos\?nombre=soundbar$/);
      await expect(nombresEnLista(page)).toHaveText(['Soundbar Cinema 500 vendedor']);
      expect((await leerProductos()).find((p) => p.id === 'p-004')).toMatchObject({
        name: 'Soundbar Cinema 500 vendedor',
        price: 321,
        sku: antes.sku,
      });

      // Crea un producto desde «Agregar».
      await page.getByRole('link', { name: 'Agregar producto', exact: true }).click();
      const nuevo = page.getByRole('form', { name: 'Nuevo producto' });
      await nuevo.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Parlante del vendedor');
      await nuevo.getByRole('textbox', { name: 'SKU', exact: true }).fill('E2E-VEND-07');
      await nuevo.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Portátil.');
      await nuevo
        .getByRole('textbox', { name: 'Imagen principal', exact: true })
        .fill('assets/products/washer-studio.jpg');
      await nuevo
        .getByRole('textbox', { name: 'Características (una por línea)', exact: true })
        .fill('Batería');
      await nuevo.getByRole('spinbutton', { name: 'Precio', exact: true }).fill('99');
      await nuevo.getByRole('spinbutton', { name: 'Stock', exact: true }).fill('3');
      await elegir(page, nuevo, 'Categoría', 'Electrohogar');
      await elegir(page, nuevo, 'Marca', 'Zenith');
      await nuevo.getByRole('button', { name: 'Guardar producto' }).click();
      await expect(page).toHaveURL(/\/productos\?nombre=soundbar$/);
      expect((await leerProductos()).find((p) => p.sku === 'E2E-VEND-07')).toMatchObject({
        name: 'Parlante del vendedor',
        price: 99,
        stock: 3,
      });
    } finally {
      await restaurar(originales);
    }
  });
});

const listaCategorias = (page: Page) => page.getByRole('region', { name: 'Lista de categorías' });
const panelCategorias = (page: Page) => page.getByRole('search', { name: 'Filtros de categorías' });
/** Filas de la lista de categorías: cada una con su nombre, «Orden: … · Padre: …», «Editar» y «Eliminar». */
const filasCategorias = (page: Page) => listaCategorias(page).locator(':scope > div');
const filaCategoria = (page: Page, nombre: string) =>
  filasCategorias(page).filter({ has: page.locator('strong', { hasText: nombre }) });

async function abrirCategorias(page: Page): Promise<void> {
  await page.goto('/categorias');
  await expect(page.getByRole('heading', { level: 1, name: 'Categorías' })).toBeVisible();
  await expect(panelCategorias(page)).toBeVisible();
}

async function buscarCategorias(page: Page): Promise<void> {
  await panelCategorias(page)
    .getByRole('button', { name: /^Busca/ })
    .click();
  await expect(panelCategorias(page).getByRole('button', { name: 'Buscar', exact: true })).toBeEnabled();
}

test.describe('Filtros y registro de categorías del Admin', () => {
  test('TEST-15 · filtros por nombre y por padre, y registro en su propia ruta', async ({ page }) => {
    const originales = await leerCategorias();
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await abrirCategorias(page);
      await expect(filasCategorias(page)).toHaveCount(originales.length);

      // «oled»: una sola fila, la de hoy (sangría de su profundidad, «↳» y el nombre del padre), aunque «TV y audio»
      // no esté en los resultados (D7).
      await panelCategorias(page).getByRole('textbox', { name: 'Nombre' }).fill('oled');
      await buscarCategorias(page);
      await expect(page).toHaveURL(/\/categorias\?nombre=oled$/);
      await expect(filasCategorias(page)).toHaveCount(1);
      await expect(filasCategorias(page).locator('strong')).toHaveText('↳ OLED');
      await expect(filasCategorias(page)).toContainText('Orden: 1 · Padre: TV y audio');
      await expect(filasCategorias(page)).toHaveCSS('padding-left', '36px');

      // Otra sesión añade una hija de «TV y audio» y una nieta (hija de «OLED»); «Buscar» las trae.
      await agregarCategorias([
        { id: 'e2e-008-barras', name: 'Barras de sonido 008', parentId: 'cat-tv', order: 2 },
        { id: 'e2e-008-qd', name: 'QD-OLED 008', parentId: 'cat-tv-oled' },
      ]);
      await panelCategorias(page).getByRole('button', { name: 'Limpiar filtros' }).click();
      await expect(panelCategorias(page).getByRole('textbox', { name: 'Nombre' })).toHaveValue('');
      await elegir(page, panelCategorias(page), 'Categoría padre', 'TV y audio');
      await buscarCategorias(page);
      await expect(page).toHaveURL(/\/categorias\?padre=cat-tv$/);
      // Solo las hijas directas, en orden de árbol; la nieta no sale.
      await expect(filasCategorias(page).locator('strong')).toHaveText(['↳ OLED', '↳ Barras de sonido 008']);
      for (const fila of await filasCategorias(page).all()) {
        await expect(fila).toContainText('Padre: TV y audio');
      }

      // «Sin padre»: solo las de primer nivel.
      await elegir(page, panelCategorias(page), 'Categoría padre', 'Sin padre');
      await buscarCategorias(page);
      await expect(page).toHaveURL(/\/categorias\?padre=sin-padre$/);
      await expect(filasCategorias(page).locator('strong')).toHaveText([
        'TV y audio',
        'Electrohogar',
        'Monitores',
        'Cocina',
      ]);

      // «Agregar» abre el registro sin la lista; «Volver a categorías» conserva los filtros.
      await page.getByRole('link', { name: 'Agregar categoría', exact: true }).click();
      await expect(page).toHaveURL(/\/categorias\/nueva\?padre=sin-padre$/);
      const nueva = page.getByRole('form', { name: 'Nueva categoría' });
      await expect(nueva).toBeVisible();
      await expect(listaCategorias(page)).toHaveCount(0);
      await expect(nueva.getByRole('textbox', { name: 'Nombre', exact: true })).toBeVisible();
      await expect(nueva.getByRole('combobox', { name: 'Categoría padre' })).toBeVisible();
      await expect(nueva.getByRole('spinbutton', { name: 'Orden (opcional)' })).toBeVisible();
      await page.getByRole('link', { name: 'Volver a categorías' }).click();
      await expect(page).toHaveURL(/\/categorias\?padre=sin-padre$/);

      // Guardar vuelve al listado con los mismos filtros; la categoría nueva cuelga de «TV y audio».
      await page.getByRole('link', { name: 'Agregar categoría', exact: true }).click();
      await nueva.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Proyectores 008');
      await elegir(page, nueva, 'Categoría padre', 'TV y audio');
      await nueva.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/categorias\?padre=sin-padre$/);
      expect((await leerCategorias()).find((c) => c.name === 'Proyectores 008')).toMatchObject({
        parentId: 'cat-tv',
      });

      // «Editar» de «OLED»: el padre no ofrece la misma categoría ni su subcategoría.
      await elegir(page, panelCategorias(page), 'Categoría padre', 'TV y audio');
      await buscarCategorias(page);
      await expect(filaCategoria(page, 'Proyectores 008')).toHaveCount(1);
      await filaCategoria(page, 'OLED')
        .getByRole('link', { name: /^Editar / })
        .click();
      await expect(page).toHaveURL(/\/categorias\/cat-tv-oled\?padre=cat-tv$/);
      const edicion = page.getByRole('form', { name: 'Editar categoría' });
      await expect(edicion.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('OLED');
      await expect(
        edicion.getByText('No se puede elegir la misma categoría ni una de sus subcategorías.'),
      ).toBeVisible();
      await edicion.getByRole('combobox', { name: 'Categoría padre' }).click();
      await expect(page.getByRole('option', { name: 'Sin padre', exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: 'TV y audio', exact: true })).toBeVisible();
      await expect(page.getByRole('option', { name: /Barras de sonido 008/ })).toBeVisible();
      await expect(page.getByRole('option', { name: /OLED/ })).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('listbox')).toHaveCount(0);

      await edicion.getByRole('textbox', { name: 'Nombre', exact: true }).fill('OLED 008');
      await edicion.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/categorias\?padre=cat-tv$/);
      await expect(filaCategoria(page, 'OLED 008')).toContainText('Padre: TV y audio');

      // Otra sesión elimina una categoría con la lista abierta: al abrirla, ya no existe.
      await retirarCategorias(['e2e-008-barras']);
      await filaCategoria(page, 'Barras de sonido 008')
        .getByRole('link', { name: /^Editar / })
        .click();
      await expect(page).toHaveURL(/\/categorias\/e2e-008-barras\?padre=cat-tv$/);
      await expect(page.getByText('Esta categoría ya no existe')).toBeVisible();
      await expect(page.getByRole('form', { name: 'Editar categoría' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Volver a categorías' }).click();
      await expect(page).toHaveURL(/\/categorias\?padre=cat-tv$/);
    } finally {
      await cambiarCategorias(() => originales);
    }
  });
});

const listaMarcas = (page: Page) => page.getByRole('region', { name: 'Lista de marcas' });
const panelMarcas = (page: Page) => page.getByRole('search', { name: 'Filtros de marcas' });
/** Filas de la lista de marcas: cada una con su nombre, «Activa» o «Inactiva», «Editar» y «Eliminar». */
const filasMarcas = (page: Page) => listaMarcas(page).locator(':scope > div');
const filaMarca = (page: Page, nombre: string) =>
  filasMarcas(page).filter({ has: page.locator('strong', { hasText: nombre }) });

async function abrirMarcas(page: Page): Promise<void> {
  await page.goto('/marcas');
  await expect(page.getByRole('heading', { level: 1, name: 'Marcas' })).toBeVisible();
  await expect(panelMarcas(page)).toBeVisible();
}

async function buscarMarcas(page: Page): Promise<void> {
  await panelMarcas(page)
    .getByRole('button', { name: /^Busca/ })
    .click();
  await expect(panelMarcas(page).getByRole('button', { name: 'Buscar', exact: true })).toBeEnabled();
}

test.describe('Filtros y registro de marcas del Admin', () => {
  test('TEST-16 · filtros por nombre y estado, y registro en su propia ruta', async ({ page }) => {
    const originales = await leerMarcas();
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await abrirMarcas(page);
      await expect(filasMarcas(page)).toHaveCount(originales.length);

      // Otra sesión desactiva «Zenith» con la lista abierta (el seed no tiene marcas inactivas); «Buscar» lo trae.
      await cambiarMarcas((actuales) =>
        actuales.map((m) => (m.id === 'b-zen' ? { ...m, active: false } : m)),
      );
      await elegir(page, panelMarcas(page), 'Estado', 'Inactivos');
      await buscarMarcas(page);
      await expect(page).toHaveURL(/\/marcas\?estado=inactivos$/);
      await expect(filasMarcas(page).locator('strong')).toHaveText(['Zenith']);
      await expect(filasMarcas(page)).toContainText('Inactiva');

      await elegir(page, panelMarcas(page), 'Estado', 'Activos');
      await buscarMarcas(page);
      await expect(page).toHaveURL(/\/marcas\?estado=activos$/);
      await expect(filasMarcas(page).locator('strong')).toHaveText(['Nova']);

      // «Nombre» sin distinguir mayúsculas; con «Activos», «zen» no da resultados.
      await panelMarcas(page).getByRole('textbox', { name: 'Nombre' }).fill('ZEN');
      await buscarMarcas(page);
      await expect(listaMarcas(page).getByText('Ninguna marca cumple los filtros.')).toBeVisible();
      await panelMarcas(page).getByRole('button', { name: 'Limpiar filtros' }).click();
      await expect(panelMarcas(page).getByRole('combobox', { name: 'Estado' })).toContainText('Todos');
      await panelMarcas(page).getByRole('textbox', { name: 'Nombre' }).fill('zen');
      await buscarMarcas(page);
      await expect(page).toHaveURL(/\/marcas\?nombre=zen$/);
      await expect(filasMarcas(page).locator('strong')).toHaveText(['Zenith']);

      // «Agregar» abre el registro sin la lista; «Volver a marcas» conserva los filtros.
      await page.getByRole('link', { name: 'Agregar marca', exact: true }).click();
      await expect(page).toHaveURL(/\/marcas\/nueva\?nombre=zen$/);
      const nueva = page.getByRole('form', { name: 'Nueva marca' });
      await expect(nueva).toBeVisible();
      await expect(listaMarcas(page)).toHaveCount(0);
      await expect(nueva.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('');
      await expect(nueva.getByRole('checkbox', { name: 'Activa' })).toBeChecked();
      await page.getByRole('link', { name: 'Volver a marcas' }).click();
      await expect(page).toHaveURL(/\/marcas\?nombre=zen$/);

      // Guardar vuelve al listado con los mismos filtros; la marca nueva los cumple.
      await page.getByRole('link', { name: 'Agregar marca', exact: true }).click();
      await nueva.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Zentro 008');
      await nueva.getByRole('checkbox', { name: 'Activa' }).uncheck();
      await nueva.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/marcas\?nombre=zen$/);
      await expect(filasMarcas(page).locator('strong')).toHaveText(['Zenith', 'Zentro 008']);
      expect((await leerMarcas()).find((m) => m.name === 'Zentro 008')).toMatchObject({ active: false });

      // «Editar» abre los datos actuales: otra sesión volvió a activar «Zenith».
      await cambiarMarcas((actuales) => actuales.map((m) => (m.id === 'b-zen' ? { ...m, active: true } : m)));
      await filaMarca(page, 'Zenith')
        .getByRole('link', { name: /^Editar / })
        .click();
      await expect(page).toHaveURL(/\/marcas\/b-zen\?nombre=zen$/);
      const edicion = page.getByRole('form', { name: 'Editar marca' });
      await expect(edicion.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('Zenith');
      await expect(edicion.getByRole('checkbox', { name: 'Activa' })).toBeChecked();
      await edicion.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Zenith 008');
      await edicion.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/marcas\?nombre=zen$/);
      await expect(filaMarca(page, 'Zenith 008')).toContainText('Activa');

      // Otra sesión elimina una marca con la lista abierta: al abrirla, ya no existe.
      await cambiarMarcas((actuales) => actuales.filter((m) => m.name !== 'Zentro 008'));
      await filaMarca(page, 'Zentro 008')
        .getByRole('link', { name: /^Editar / })
        .click();
      await expect(page.getByText('Esta marca ya no existe')).toBeVisible();
      await expect(page.getByRole('form', { name: 'Editar marca' })).toHaveCount(0);
      await page.getByRole('link', { name: 'Volver a marcas' }).click();
      await expect(page).toHaveURL(/\/marcas\?nombre=zen$/);
    } finally {
      await cambiarMarcas(() => originales);
    }
  });
});

/** Caja de un elemento en la ventana. */
interface Caja {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const caja = (elemento: Locator): Promise<Caja> =>
  elemento.evaluate((nodo) => {
    const { left, top, right, bottom } = nodo.getBoundingClientRect();
    return { left, top, right, bottom };
  });

const TOLERANCIA = 0.5;

/** Las tres páginas del catálogo con su título, su «Agregar» (nombre accesible), su panel y su lista (AC-10). */
const PAGINAS_DEL_CATALOGO = [
  { ruta: '/productos', titulo: 'Productos', nuevo: 'Agregar producto', panel: panel, lista: lista },
  {
    ruta: '/categorias',
    titulo: 'Categorías',
    nuevo: 'Agregar categoría',
    panel: panelCategorias,
    lista: listaCategorias,
  },
  { ruta: '/marcas', titulo: 'Marcas', nuevo: 'Agregar marca', panel: panelMarcas, lista: listaMarcas },
] as const;

/**
 * Listas y registros del catálogo (TEST-18): cada ruta con lo que hay que esperar antes de medir y los controles
 * que se tienen que poder usar dentro de la pantalla.
 */
const VISTAS_DEL_CATALOGO: readonly {
  ruta: string;
  listo: (page: Page) => Locator;
  controles: (page: Page) => Locator[];
}[] = [
  ...PAGINAS_DEL_CATALOGO.map((pagina) => ({
    ruta: pagina.ruta,
    listo: (page: Page) => pagina.lista(page),
    controles: (page: Page) => [
      page.getByRole('link', { name: pagina.nuevo, exact: true }),
      pagina.panel(page).getByRole('button', { name: 'Buscar', exact: true }),
      pagina.panel(page).getByRole('button', { name: 'Limpiar filtros' }),
      pagina
        .lista(page)
        .getByRole('link', { name: /^Editar / })
        .first(),
    ],
  })),
  ...[
    ['/productos/nuevo', 'Nuevo producto', 'Guardar producto'],
    ['/productos/p-001', 'Editar producto', 'Guardar producto'],
    ['/categorias/nueva', 'Nueva categoría', 'Guardar'],
    ['/categorias/cat-tv-oled', 'Editar categoría', 'Guardar'],
    ['/marcas/nueva', 'Nueva marca', 'Guardar'],
    ['/marcas/b-nova', 'Editar marca', 'Guardar'],
  ].map(([ruta, formulario, guardar]) => ({
    ruta,
    listo: (page: Page) => page.getByRole('form', { name: formulario }),
    controles: (page: Page) => [
      page.getByRole('form', { name: formulario }).getByRole('textbox', { name: 'Nombre', exact: true }),
      page.getByRole('form', { name: formulario }).getByRole('button', { name: guardar, exact: true }),
      page.getByRole('form', { name: formulario }).getByRole('link', { name: 'Cancelar' }),
    ],
  })),
];

const MOVILES = [360, 375, 390] as const;

/** Motivo del `400` simulado de TEST-21, con el formato de error del BFF. */
const MOTIVO_RECHAZO = 'El BFF rechazó el cambio (prueba e2e 008).';

test.describe('Filtros y registro del catálogo: las tres páginas y los casos de fallo', () => {
  test('TEST-10 · a 1440 px, las tres páginas con la misma disposición', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const medidas: { titulo: string; panel: Caja; lista: Caja; nuevo: Caja }[] = [];

    for (const pagina of PAGINAS_DEL_CATALOGO) {
      await page.goto(pagina.ruta);
      const titulo = page.getByRole('heading', { level: 1, name: pagina.titulo });
      await expect(titulo).toBeVisible();
      await expect(pagina.lista(page)).toBeVisible();
      const que = (parte: string) => `${pagina.titulo} · ${parte}`;

      // Sin formulario de registro ni columna lateral: solo el panel de búsqueda.
      await expect(page.getByRole('form'), que('sin formulario de registro')).toHaveCount(0);
      const filtros = pagina.panel(page);
      await expect(filtros.getByRole('button', { name: 'Buscar', exact: true })).toBeVisible();
      await expect(filtros.getByRole('button', { name: 'Limpiar filtros' })).toBeVisible();

      const cajaTitulo = await caja(titulo);
      const cajaNuevo = await caja(page.getByRole('link', { name: pagina.nuevo, exact: true }));
      const cajaPanel = await caja(filtros);
      const cajaLista = await caja(pagina.lista(page));

      // Orden vertical: título, panel (con «Agregar» dentro, lote 11, PBI-0171), lista.
      expect(cajaTitulo.bottom, que('el título acaba antes del panel')).toBeLessThanOrEqual(cajaPanel.top);
      expect(cajaPanel.bottom, que('el panel acaba antes de la lista')).toBeLessThanOrEqual(cajaLista.top);
      expect(cajaNuevo.top, que('«Agregar» dentro del panel')).toBeGreaterThanOrEqual(cajaPanel.top);
      expect(cajaNuevo.bottom, que('«Agregar» dentro del panel')).toBeLessThanOrEqual(cajaPanel.bottom);
      // «Agregar» a la derecha de «Limpiar», en su fila; la lista con el ancho del panel (todo el contenido).
      const cajaLimpiar = await caja(filtros.getByRole('button', { name: 'Limpiar filtros' }));
      expect(cajaNuevo.left, que('«Agregar» a la derecha de «Limpiar»')).toBeGreaterThan(cajaLimpiar.right);
      expect(
        Math.abs(cajaLista.left - cajaPanel.left),
        que('lista y panel, mismo borde izquierdo'),
      ).toBeLessThan(TOLERANCIA + 0.5);
      expect(
        Math.abs(cajaLista.right - cajaPanel.right),
        que('lista y panel, mismo borde derecho'),
      ).toBeLessThan(TOLERANCIA + 0.5);
      medidas.push({ titulo: pagina.titulo, panel: cajaPanel, lista: cajaLista, nuevo: cajaNuevo });
    }

    // Las mismas posiciones horizontales en las tres páginas.
    const [productos, ...otras] = medidas;
    for (const otra of otras) {
      for (const [parte, a, b] of [
        ['panel', productos.panel, otra.panel],
        ['lista', productos.lista, otra.lista],
      ] as const) {
        expect(
          Math.abs(a.left - b.left),
          `${otra.titulo} · ${parte}: borde izquierdo de Productos`,
        ).toBeLessThan(1);
        expect(
          Math.abs(a.right - b.right),
          `${otra.titulo} · ${parte}: borde derecho de Productos`,
        ).toBeLessThan(1);
      }
      expect(Math.abs(productos.nuevo.right - otra.nuevo.right), `${otra.titulo} · «Agregar»`).toBeLessThan(
        1,
      );
    }
  });

  test.describe('TEST-18 · móvil sin desplazamiento horizontal', () => {
    test.afterAll(() => restablecerTemas());

    for (const tema of TEMAS) {
      test(`tema ${tema.toUpperCase()} a 360, 375 y 390 px`, async ({ page }) => {
        test.setTimeout(240_000);
        await activarTema(tema);
        await ingresarAlAdmin(page, cuentasAdmin.superadmin);

        for (const ancho of MOVILES) {
          await page.setViewportSize({ width: ancho, height: 812 });
          for (const vista of VISTAS_DEL_CATALOGO) {
            const lugar = `${tema.toUpperCase()} · ${ancho} px · ${vista.ruta}`;
            await page.goto(vista.ruta);
            await expect(vista.listo(page), lugar).toBeVisible();
            await page.evaluate(() => document.fonts.ready);

            const medida = await page.evaluate(() => ({
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth: document.documentElement.clientWidth,
            }));
            expect.soft(medida.scrollWidth, `${lugar} · scrollWidth`).toBe(medida.clientWidth);
            for (const control of vista.controles(page)) {
              await expect.soft(control, `${lugar} · control visible`).toBeVisible();
              const { left, right } = await caja(control);
              expect
                .soft(
                  left >= -TOLERANCIA && right <= medida.clientWidth + TOLERANCIA,
                  `${lugar} · ${await control.innerText()} dentro de la pantalla (x ${left.toFixed(1)}–${right.toFixed(1)})`,
                )
                .toBe(true);
            }
          }
        }
      });
    }
  });

  test('TEST-19 · con 30 productos, 25 por página y una búsqueda nueva vuelve a la 1', async ({ page }) => {
    const originales = await leerProductos();
    const faltan = 30 - originales.length;
    const nuevos = Array.from({ length: faltan }, (_, i) => {
      const n = String(i + 1).padStart(2, '0');
      return productoDePrueba({
        id: `e2e-008-pag-${n}`,
        sku: `E2E-PAG-${n}`,
        name: `Producto paginado 008 ${n}`,
      });
    });
    const paginacion = page.getByRole('navigation', { name: 'Páginas de productos' });
    try {
      await agregarProductos(nuevos);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await abrirProductos(page);

      // 30 resultados: los 25 primeros y «Página 1 de 2»; «Anterior» deshabilitado.
      await expect(editar(lista(page))).toHaveCount(25);
      await expect(paginacion).toContainText('Página 1 de 2');
      await expect(paginacion.getByRole('button', { name: 'Anterior' })).toBeDisabled();
      // La barra está dentro de la lista, después de las filas.
      const cajaLista = await caja(lista(page));
      const cajaBarra = await caja(paginacion);
      expect(cajaBarra.bottom).toBeLessThanOrEqual(cajaLista.bottom + TOLERANCIA);

      await paginacion.getByRole('button', { name: 'Siguiente' }).click();
      await expect(page).toHaveURL(/\/productos\?pagina=2$/);
      await expect(paginacion).toContainText('Página 2 de 2');
      await expect(editar(lista(page))).toHaveCount(5);
      await expect(paginacion.getByRole('button', { name: 'Siguiente' })).toBeDisabled();

      // Una búsqueda nueva, desde la página 2, vuelve a la 1.
      await buscar(page);
      await expect(page).toHaveURL(/\/productos$/);
      await expect(paginacion).toContainText('Página 1 de 2');
      await expect(editar(lista(page))).toHaveCount(25);

      // 25 resultados o menos: sin paginación.
      await panel(page).getByRole('textbox', { name: 'Nombre' }).fill('Producto paginado 008');
      await buscar(page);
      await expect(page).toHaveURL(/\/productos\?nombre=Producto(%20|\+)paginado(%20|\+)008$/);
      await expect(editar(lista(page))).toHaveCount(faltan);
      await expect(paginacion).toHaveCount(0);
    } finally {
      await restaurar(originales);
    }
  });

  test('TEST-20 · si «Buscar» falla, avisa junto al panel y conserva filtros y resultados', async ({
    page,
  }) => {
    const originales = await leerProductos();
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await abrirProductos(page);
    await panel(page).getByRole('textbox', { name: 'Nombre' }).fill('oled');
    await buscar(page);
    await expect(nombresEnLista(page)).toHaveText(['OLED Vision 55” 4K']);

    // Solo la consulta del snapshot falla; lo demás pasa sin tocar.
    let consultas = 0;
    await page.route('**/bff/admin/snapshot', (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      consultas++;
      return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"UNAVAILABLE"}' });
    });
    await panel(page).getByRole('textbox', { name: 'Nombre' }).fill('soundbar');
    await buscar(page);
    expect(consultas).toBe(1);

    const aviso = page.getByRole('alert').filter({ hasText: 'No pudimos consultar los productos actuales' });
    await expect(aviso).toHaveText(
      'No pudimos consultar los productos actuales. La lista muestra la última búsqueda; inténtalo de nuevo.',
    );
    // Junto al panel: debajo de él y encima de la lista.
    const cajaAviso = await caja(aviso);
    expect(cajaAviso.top).toBeGreaterThanOrEqual((await caja(panel(page))).bottom);
    expect(cajaAviso.bottom).toBeLessThanOrEqual((await caja(lista(page))).top);
    // Filtros escritos y resultados de la última búsqueda, sin cambios; la URL sigue con la búsqueda anterior.
    await expect(panel(page).getByRole('textbox', { name: 'Nombre' })).toHaveValue('soundbar');
    await expect(page).toHaveURL(/\/productos\?nombre=oled$/);
    await expect(nombresEnLista(page)).toHaveText(['OLED Vision 55” 4K']);

    // Reintento con el BFF de vuelta: busca, quita el aviso y aplica los filtros.
    await page.unroute('**/bff/admin/snapshot');
    await buscar(page);
    await expect(aviso).toHaveCount(0);
    await expect(page).toHaveURL(/\/productos\?nombre=soundbar$/);
    await expect(nombresEnLista(page)).toHaveText(['Soundbar Cinema 500']);
    expect(await leerProductos()).toEqual(originales);
  });

  test('TEST-21 · si el BFF rechaza el guardado, el registro conserva lo escrito y avisa junto al botón', async ({
    page,
  }) => {
    const productos = await leerProductos();
    const categorias = await leerCategorias();
    const marcas = await leerMarcas();
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);

    // Solo el guardado del snapshot falla con un 400; la consulta pasa sin tocar.
    await page.route('**/bff/admin/snapshot', (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: MOTIVO_RECHAZO } }),
      });
    });

    for (const [ruta, formulario, guardar] of [
      ['/productos/p-004', 'Editar producto', 'Guardar producto'],
      ['/categorias/cat-tv-oled', 'Editar categoría', 'Guardar'],
      ['/marcas/b-nova', 'Editar marca', 'Guardar'],
    ] as const) {
      await page.goto(ruta);
      const registro = page.getByRole('form', { name: formulario });
      const nombre = registro.getByRole('textbox', { name: 'Nombre', exact: true });
      await expect(nombre).not.toHaveValue('');
      await nombre.fill(`Nombre rechazado 008`);
      const boton = registro.getByRole('button', { name: guardar, exact: true });
      await boton.click();

      // Se queda en el registro con lo escrito y el error junto al botón, dentro del formulario.
      const error = registro.getByRole('alert');
      await expect(error, formulario).toHaveText(MOTIVO_RECHAZO);
      await expect(page).toHaveURL(new RegExp(`${ruta}$`));
      await expect(nombre).toHaveValue('Nombre rechazado 008');
      const cajaError = await caja(error);
      const cajaBoton = await caja(boton);
      expect(
        cajaBoton.top - cajaError.bottom,
        `${formulario}: el error justo encima del botón`,
      ).toBeGreaterThanOrEqual(0);
      expect(cajaBoton.top - cajaError.bottom, `${formulario}: el error justo encima del botón`).toBeLessThan(
        40,
      );
    }

    await page.unroute('**/bff/admin/snapshot');
    // Nada se guardó.
    expect(await leerProductos()).toEqual(productos);
    expect(await leerCategorias()).toEqual(categorias);
    expect(await leerMarcas()).toEqual(marcas);
  });
});
