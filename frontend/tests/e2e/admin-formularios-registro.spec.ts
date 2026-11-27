import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  cambiarProductos,
  leerCategorias,
  leerProductos,
  leerSnapshot,
  retirarCategorias,
} from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';
import { cargarImagenPrincipal } from './apoyo/fotos';

/**
 * Páginas de registro del backoffice como los formularios del SGC (lote 44, ADR-0033, PBI-0268; decidido por Sebastián
 * Avila el 2026-11-26, sin esperar a Daniel).
 *
 * - Una tarjeta con el título, su descripción y «Regresar», que vuelve al listado con sus filtros.
 * - Una fila de cabecera con «Estado» (en los registros que lo tienen), «Usuario» (la sesión) y «Fecha» (la fecha y la
 *   hora actuales de Lima, «dd/mm/aaaa hh:mm»).
 * - Secciones con título; las características del producto son una tabla con «Agregar fila» y una papelera por fila.
 * - El contador de caracteres bajo los campos con tope.
 * - Al pie, «Cancelar», «Guardar y continuar» (solo al crear: guarda y abre el registro en «Editar») y «Guardar».
 *
 * Las pruebas que crean registros los quitan al terminar, por la API del Admin.
 */

/** 15:04 UTC del 2026-11-26 son las 10:04 en Lima. */
const AHORA = new Date('2026-11-26T15:04:00Z');
const FECHA_EN_LIMA = '26/11/2026 10:04';

/** La fila de cabecera de un registro: «Estado», «Usuario» y «Fecha». */
const cabecera = (formulario: Locator) => formulario.getByRole('group', { name: 'Datos del registro' });

/** Elige una opción de un `mat-select` o del selector de categoría con búsqueda. */
async function elegir(page: Page, zona: Locator, campo: string, opcion: string): Promise<void> {
  await zona.getByRole('combobox', { name: campo }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
}

test.describe('PBI-0268: páginas de registro como los formularios del SGC', () => {
  test('la tarjeta tiene título, descripción, «Regresar» con los filtros y la fila de cabecera', async ({
    page,
  }) => {
    await page.clock.setFixedTime(AHORA);
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/productos?nombre=tv&pagina=1');
    await page.getByRole('link', { name: 'Agregar producto', exact: true }).click();
    await expect(page).toHaveURL(/\/productos\/nuevo\?nombre=tv&pagina=1$/);

    const formulario = page.getByRole('form', { name: 'Nuevo producto' });
    await expect(formulario).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Nuevo producto' })).toBeVisible();
    // Sin el enlace de texto de antes encima del título.
    await expect(page.getByRole('link', { name: /^Volver a / })).toHaveCount(0);

    // Cabecera: estado en píldora (Activo por omisión), la persona de la sesión y la fecha de Lima.
    const datos = cabecera(formulario);
    const estado = datos.getByRole('combobox', { name: 'Estado', exact: true });
    await expect(estado).toHaveValue('activo');
    await expect(estado.getByRole('option')).toHaveText(['Activo', 'Inactivo']);
    await expect(datos).toContainText('Usuario');
    await expect(datos).toContainText(cuentasAdmin.superadmin.nombre);
    await expect(datos).toContainText('Fecha');
    await expect(datos).toContainText(FECHA_EN_LIMA);

    // Secciones con título.
    for (const seccion of ['Datos generales', 'Precio y stock', 'Imágenes', 'Características'])
      await expect(formulario.getByRole('heading', { level: 2, name: seccion, exact: true })).toBeVisible();

    // Al crear, el pie tiene los tres botones, en este orden de izquierda a derecha.
    const cancelar = formulario.getByRole('link', { name: 'Cancelar', exact: true });
    const continuar = formulario.getByRole('button', { name: 'Guardar y continuar', exact: true });
    const guardar = formulario.getByRole('button', { name: 'Guardar', exact: true });
    const [cajaCancelar, cajaContinuar, cajaGuardar] = await Promise.all(
      [cancelar, continuar, guardar].map((boton) => boton.boundingBox()),
    );
    expect(cajaCancelar!.x).toBeLessThan(cajaContinuar!.x);
    expect(cajaContinuar!.x).toBeLessThan(cajaGuardar!.x);

    // «Regresar» vuelve al listado con sus filtros y su página.
    await page.getByRole('link', { name: 'Regresar', exact: true }).click();
    await expect(page).toHaveURL(/\/productos\?nombre=tv&pagina=1$/);
  });

  test('en el celular, el pie va a todo el ancho con «Guardar» arriba y el tabulador en el orden de escritorio', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/productos/nuevo');
    const formulario = page.getByRole('form', { name: 'Nuevo producto' });
    const cancelar = formulario.getByRole('link', { name: 'Cancelar', exact: true });
    const continuar = formulario.getByRole('button', { name: 'Guardar y continuar', exact: true });
    const guardar = formulario.getByRole('button', { name: 'Guardar', exact: true });
    await expect(guardar).toBeVisible();
    const [cajaCancelar, cajaContinuar, cajaGuardar] = await Promise.all(
      [cancelar, continuar, guardar].map(async (boton) => (await boton.boundingBox())!),
    );
    // Los tres con el mismo ancho y el mismo borde izquierdo, uno debajo del otro: «Guardar» arriba.
    for (const caja of [cajaContinuar, cajaCancelar]) {
      expect(Math.abs(caja.width - cajaGuardar.width)).toBeLessThan(1);
      expect(Math.abs(caja.x - cajaGuardar.x)).toBeLessThan(1);
    }
    expect(cajaGuardar.y + cajaGuardar.height).toBeLessThanOrEqual(cajaContinuar.y);
    expect(cajaContinuar.y + cajaContinuar.height).toBeLessThanOrEqual(cajaCancelar.y);
    // A todo el ancho de la tarjeta (sin el padding): más de la mitad de la ventana.
    expect(cajaGuardar.width).toBeGreaterThan(375 / 2);

    // El tabulador sigue el orden de escritorio: «Cancelar», «Guardar y continuar» y «Guardar».
    await cancelar.focus();
    await page.keyboard.press('Tab');
    await expect(continuar).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(guardar).toBeFocused();
  });

  test('las características son una tabla con «Agregar fila» y una papelera por fila', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const producto = (await leerProductos()).find((item) => item.id === 'p-004');
    if (!producto) throw new Error('Falta «Soundbar Cinema 500» (p-004) en el seed');

    // Al editar, una fila por característica guardada.
    await page.goto('/productos/p-004');
    const edicion = page.getByRole('form', { name: 'Editar producto' });
    const tabla = edicion.getByRole('table', { name: 'Características' });
    await expect(tabla).toBeVisible();
    for (const [i, caracteristica] of producto.highlights.entries())
      await expect(tabla.getByRole('textbox', { name: `Característica ${i + 1}`, exact: true })).toHaveValue(
        caracteristica,
      );
    await expect(tabla.getByRole('textbox')).toHaveCount(producto.highlights.length);
    // Al editar, solo «Cancelar» y «Guardar».
    await expect(edicion.getByRole('button', { name: 'Guardar y continuar' })).toHaveCount(0);
    await expect(edicion.getByRole('button', { name: 'Guardar', exact: true })).toBeVisible();
    await expect(edicion.getByRole('link', { name: 'Cancelar', exact: true })).toBeVisible();

    // Al crear, una fila vacía; «Agregar fila» suma otra y lleva el foco a ella.
    await page.goto('/productos/nuevo');
    const nuevo = page.getByRole('form', { name: 'Nuevo producto' });
    const filas = nuevo.getByRole('table', { name: 'Características' });
    await expect(filas.getByRole('textbox')).toHaveCount(1);
    await filas.getByRole('textbox', { name: 'Característica 1', exact: true }).fill('Primera');
    await nuevo.getByRole('button', { name: 'Agregar fila', exact: true }).click();
    const segunda = filas.getByRole('textbox', { name: 'Característica 2', exact: true });
    await expect(segunda).toBeFocused();
    await segunda.fill('Segunda');

    // La papelera quita su fila; las demás se renumeran.
    await filas.getByRole('button', { name: 'Quitar la característica 1', exact: true }).click();
    await expect(filas.getByRole('textbox')).toHaveCount(1);
    await expect(filas.getByRole('textbox', { name: 'Característica 1', exact: true })).toHaveValue(
      'Segunda',
    );

    // Sin ninguna característica escrita, el formulario lo dice y no se envía.
    await filas.getByRole('button', { name: 'Quitar la característica 1', exact: true }).click();
    await expect(filas.getByRole('textbox')).toHaveCount(1);
    await expect(filas.getByRole('textbox', { name: 'Característica 1', exact: true })).toHaveValue('');
    await nuevo.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(nuevo.getByText('Escribe al menos una característica.')).toBeVisible();
    await expect(page).toHaveURL(/\/productos\/nuevo$/);
  });

  test('«Guardar y continuar» guarda el producto y abre su «Editar», con las características en orden', async ({
    page,
  }) => {
    const originales = await leerProductos();
    const nombre = 'Producto del lote 44';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/productos?nombre=lote');
      await page.getByRole('link', { name: 'Agregar producto', exact: true }).click();
      const formulario = page.getByRole('form', { name: 'Nuevo producto' });
      await formulario.getByRole('textbox', { name: 'Nombre', exact: true }).fill(nombre);
      await formulario.getByRole('textbox', { name: 'SKU', exact: true }).fill('E2E-LOTE-44');
      await formulario.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Para el lote 44.');
      await cargarImagenPrincipal(formulario);
      const filas = formulario.getByRole('table', { name: 'Características' });
      await filas.getByRole('textbox', { name: 'Característica 1', exact: true }).fill(' Silencioso ');
      await formulario.getByRole('button', { name: 'Agregar fila', exact: true }).click();
      await filas.getByRole('textbox', { name: 'Característica 2', exact: true }).fill('Bajo consumo');
      // Una fila vacía al final no se guarda.
      await formulario.getByRole('button', { name: 'Agregar fila', exact: true }).click();
      await formulario.getByRole('spinbutton', { name: 'Precio', exact: true }).fill('150');
      await elegir(page, formulario, 'Categoría', 'Electrohogar');
      await elegir(page, formulario, 'Marca', 'Zenith');
      await formulario.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('Inactivo');
      await formulario.getByRole('button', { name: 'Guardar y continuar', exact: true }).click();

      // Abre el registro creado en «Editar», conservando los filtros del listado.
      await expect(page).toHaveURL(/\/productos\/(?!nuevo)[^/?]+\?nombre=lote$/);
      const edicion = page.getByRole('form', { name: 'Editar producto' });
      await expect(edicion.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue(nombre);
      await expect(edicion.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue('inactivo');
      await expect(edicion.getByRole('table', { name: 'Características' }).getByRole('textbox')).toHaveCount(
        2,
      );
      await expect(edicion.getByRole('button', { name: 'Guardar y continuar' })).toHaveCount(0);

      const creado = (await leerProductos()).find((item) => item.sku === 'E2E-LOTE-44');
      expect(creado).toMatchObject({
        name: nombre,
        active: false,
        highlights: ['Silencioso', 'Bajo consumo'],
      });
      expect(page.url()).toContain(`/productos/${creado!.id}?`);

      // «Guardar» vuelve al listado con sus filtros.
      await edicion.getByRole('textbox', { name: 'Nombre', exact: true }).fill(`${nombre} editado`);
      await edicion.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/productos\?nombre=lote$/);
      expect((await leerProductos()).find((item) => item.id === creado!.id)?.name).toBe(`${nombre} editado`);
    } finally {
      await cambiarProductos(() => originales);
    }
  });

  test('«Guardar» de un producto nuevo vuelve al listado con sus filtros y `nuevo` con el id creado', async ({
    page,
  }) => {
    // Lote 44 (PBI-0265 y PBI-0268): el listado del lote 43 lee `nuevo` para saltar a la página del registro creado.
    const originales = await leerProductos();
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/productos?nombre=lote');
      await page.getByRole('link', { name: 'Agregar producto', exact: true }).click();
      const formulario = page.getByRole('form', { name: 'Nuevo producto' });
      await formulario
        .getByRole('textbox', { name: 'Nombre', exact: true })
        .fill('Producto nuevo del lote 44');
      await formulario.getByRole('textbox', { name: 'SKU', exact: true }).fill('E2E-LOTE-44-NUEVO');
      await formulario.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Para el lote 44.');
      await cargarImagenPrincipal(formulario);
      await formulario.getByRole('textbox', { name: 'Característica 1', exact: true }).fill('Ligero');
      await formulario.getByRole('spinbutton', { name: 'Precio', exact: true }).fill('80');
      await elegir(page, formulario, 'Categoría', 'Electrohogar');
      await elegir(page, formulario, 'Marca', 'Zenith');
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();

      await expect(page).toHaveURL(/\/productos\?nombre=lote&nuevo=[^&]+$/);
      const creado = (await leerProductos()).find((item) => item.sku === 'E2E-LOTE-44-NUEVO');
      expect(creado).toBeDefined();
      expect(new URL(page.url()).searchParams.get('nuevo')).toBe(creado!.id);

      // Al editar, «Guardar» vuelve sin `nuevo`.
      await page.goto(`/productos/${creado!.id}?nombre=lote`);
      const edicion = page.getByRole('form', { name: 'Editar producto' });
      await expect(edicion.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue(
        'Producto nuevo del lote 44',
      );
      await edicion.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page).toHaveURL(/\/productos\?nombre=lote$/);
    } finally {
      await cambiarProductos(() => originales);
    }
  });

  test('«Guardar y continuar» de una categoría abre su «Editar»; la categoría no tiene estado', async ({
    page,
  }) => {
    const antes = new Set((await leerCategorias()).map((categoria) => categoria.id));
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/categorias/nueva');
      const formulario = page.getByRole('form', { name: 'Nueva categoría' });
      await expect(cabecera(formulario).getByRole('combobox', { name: 'Estado' })).toHaveCount(0);
      await expect(cabecera(formulario)).toContainText(cuentasAdmin.superadmin.nombre);
      await formulario.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Categoría del lote 44');
      await formulario.getByRole('button', { name: 'Guardar y continuar', exact: true }).click();
      await expect(page).toHaveURL(/\/categorias\/(?!nueva)[^/?]+$/);
      await expect(
        page
          .getByRole('form', { name: 'Editar categoría' })
          .getByRole('textbox', { name: 'Nombre', exact: true }),
      ).toHaveValue('Categoría del lote 44');
    } finally {
      const nuevas = (await leerCategorias()).filter((categoria) => !antes.has(categoria.id));
      await retirarCategorias(nuevas.map((categoria) => categoria.id));
    }
  });

  test('el usuario y el banner tienen su estado en la cabecera y el banner cuenta los caracteres', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/usuarios/nuevo');
    const usuario = page.getByRole('form', { name: 'Nuevo usuario' });
    await expect(cabecera(usuario).getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue(
      'activo',
    );
    await expect(usuario.getByRole('checkbox', { name: 'Activo' })).toHaveCount(0);
    await expect(usuario.getByRole('button', { name: 'Guardar y continuar', exact: true })).toBeVisible();

    const banner = (await leerSnapshot()).banners[0];
    await page.goto(`/banners/${banner.id}`);
    const edicion = page.getByRole('form', { name: 'Editar banner' });
    await expect(cabecera(edicion).getByRole('combobox', { name: 'Estado', exact: true })).toBeVisible();
    const texto = edicion.getByRole('textbox', { name: 'Primer botón: lo que dice', exact: true });
    await texto.fill('Ver ofertas');
    await expect(texto).toHaveAccessibleDescription(/11\/40/);
    await texto.fill('');
    await expect(texto).toHaveAccessibleDescription(/0\/40/);
    for (const seccion of ['Datos generales', 'Botones', 'Imágenes', 'Vigencia'])
      await expect(edicion.getByRole('heading', { level: 2, name: seccion, exact: true })).toBeVisible();
  });
});
