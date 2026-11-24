import { expect, test, type Locator, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 21 (ADR-0025): mantenimientos del backoffice, provisional hasta que Daniel confirme la regla.
 *
 * - PBI-0211: un registro de más de tres campos se crea y se edita en su propia interfaz (Usuarios y Banners, como
 *   «Nuevo producto»); uno de hasta tres, en una ventana emergente (Marcas, Clientes y Tarifas de envío). Ningún
 *   formulario de registro va al costado de la lista. La ventana tiene título, atrapa el foco y cierra con Escape.
 * - PBI-0213: las tarjetas de los roles muestran nombre y descripción, sin el conteo de usuarios.
 * - PBI-0216: en Tarifas de envío el distrito se elige de una lista; varios al crear y uno al editar.
 * - PBI-0217: Tarifas de envío ya no tiene ajuste porcentual.
 *
 * Solo lee datos: las altas y ediciones que llegan al BFF están en `admin-borrados-y-tarifas`, `admin-permisos`,
 * `admin-guardado-y-datos` y `admin-catalogo-filtros`.
 */

/** Las ventanas de registro: dónde se abren, con qué botón y su título. */
const VENTANAS = [
  { ruta: '/marcas', agregar: 'Agregar marca', titulo: 'Nueva marca', editar: 'Editar marca Nova' },
  {
    ruta: '/clientes',
    agregar: 'Agregar cliente',
    titulo: 'Nuevo cliente',
    editar: 'Editar cliente Cliente Demo',
  },
  {
    ruta: '/envios',
    agregar: 'Agregar tarifa',
    titulo: 'Precio para uno o varios distritos',
    editar: 'Editar tarifa de Lima Centro a Breña',
  },
] as const;

/** Nombre accesible del elemento que tiene el foco. */
const nombreDelFoco = (page: Page) =>
  page.evaluate(() => {
    const foco = document.activeElement as HTMLElement | null;
    return foco?.getAttribute('aria-label') ?? foco?.textContent?.trim() ?? '';
  });

/** `true` si el foco está dentro de la ventana. */
const focoDentro = (ventana: Locator) => ventana.evaluate((nodo) => nodo.contains(document.activeElement));

test.describe('PBI-0211: ventana de registro en Marcas, Clientes y Tarifas de envío', () => {
  for (const { ruta, agregar, titulo, editar } of VENTANAS) {
    test(`${ruta}: sin formulario junto a la lista; la ventana tiene título, atrapa el foco y cierra con Escape`, async ({
      page,
    }) => {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto(ruta);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Solo el panel de búsqueda es un formulario; el registro no se ve hasta abrir la ventana.
      await expect(page.getByRole('form')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await page.getByRole('button', { name: agregar }).click();
      const ventana = page.getByRole('dialog', { name: titulo });
      await expect(ventana).toBeVisible();
      await expect(ventana).toHaveAttribute('aria-modal', 'true');
      await expect(ventana.getByRole('form', { name: titulo })).toBeVisible();
      expect(await focoDentro(ventana), 'el foco entra en la ventana').toBe(true);
      // Diez Tab no sacan el foco de la ventana.
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        expect(await focoDentro(ventana), `Tab ${i + 1}: el foco sigue en la ventana`).toBe(true);
      }
      await page.keyboard.press('Escape');
      await expect(ventana).toBeHidden();
      expect(await nombreDelFoco(page)).toContain('Agregar');

      // «Editar» abre la misma ventana con el registro y le devuelve el foco al cerrarla.
      await page.getByRole('button', { name: editar }).click();
      const edicion = page.getByRole('dialog', { name: /^Editar/ });
      await expect(edicion).toBeVisible();
      await edicion.getByRole('button', { name: 'Cancelar' }).click();
      await expect(edicion).toBeHidden();
      expect(await nombreDelFoco(page)).toBe(editar);
    });
  }

  test.describe('a 375 px', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    for (const { ruta, agregar, titulo } of VENTANAS) {
      test(`${ruta}: la ventana cabe en la pantalla, sin desplazamiento horizontal`, async ({ page }) => {
        await ingresarAlAdmin(page, cuentasAdmin.superadmin);
        await page.goto(ruta);
        await page.getByRole('button', { name: agregar }).click();
        const ventana = page.getByRole('dialog', { name: titulo });
        await expect(ventana).toBeVisible();
        const caja = (await ventana.boundingBox())!;
        expect(caja.x).toBeGreaterThanOrEqual(0);
        expect(caja.x + caja.width).toBeLessThanOrEqual(375);
        const desborde = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(desborde).toBe(0);
        await expect(ventana.getByRole('button', { name: /^Guardar/ })).toBeInViewport();
      });
    }
  });
});

test.describe('PBI-0211: interfaz de registro propia en Usuarios y Banners', () => {
  test('Usuarios: «Editar» abre su interfaz con los datos y «Volver a usuarios» conserva los filtros', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/usuarios?texto=admin');
    await expect(page.getByRole('form')).toHaveCount(0);
    await page.getByRole('link', { name: 'Editar usuario Administración Demo' }).click();
    await expect(page).toHaveURL(/\/usuarios\/u-3\?texto=admin$/);
    const registro = page.getByRole('form', { name: 'Editar usuario' });
    await expect(registro.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue(
      'Administración Demo',
    );
    await expect(registro.getByRole('combobox', { name: 'Rol', exact: true })).toContainText('Administrador');
    // La contraseña temporal solo se pide al crear.
    await expect(registro.getByLabel('Contraseña temporal')).toHaveCount(0);
    await page.getByRole('link', { name: 'Volver a usuarios' }).click();
    await expect(page).toHaveURL(/\/usuarios\?texto=admin$/);
  });

  test('Usuarios: un usuario que no existe se dice, sin formulario', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/usuarios/no-existe');
    await expect(page.getByText('Este usuario ya no existe')).toBeVisible();
    await expect(page.getByRole('form')).toHaveCount(0);
  });

  test('Banners: «Agregar» y «Editar» abren su interfaz y «Cancelar» vuelve a la lista', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/banners');
    await expect(page.getByRole('form')).toHaveCount(0);
    await page.getByRole('link', { name: 'Editar banner El cine, en tu sala.' }).click();
    await expect(page).toHaveURL(/\/banners\/[^/?]+$/);
    const registro = page.getByRole('form', { name: 'Editar banner' });
    await expect(registro.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue(
      'El cine, en tu sala.',
    );
    await registro.getByRole('link', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/banners$/);
    await page.getByRole('link', { name: 'Agregar banner' }).click();
    await expect(page.getByRole('form', { name: 'Nuevo banner' })).toBeVisible();
  });
});

test('PBI-0213: las tarjetas de los roles dicen nombre y descripción, sin el conteo de usuarios', async ({
  page,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/usuarios');
  const tarjetas = page.getByRole('region', { name: 'Roles disponibles' }).getByRole('article');
  await expect(tarjetas).toHaveCount(3);
  for (const tarjeta of await tarjetas.all()) {
    await expect(tarjeta.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(tarjeta).not.toContainText(/\d+\s+usuarios?\b/);
  }
});

test.describe('PBI-0216 y PBI-0217: Tarifas de envío', () => {
  test('el distrito se elige de la lista (varios al crear, uno al editar) y no hay ajuste porcentual', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/envios');
    await expect(page.getByRole('heading', { name: 'Ajuste porcentual' })).toHaveCount(0);
    await expect(page.getByRole('spinbutton', { name: 'Porcentaje' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Agregar tarifa' }).click();
    const ventana = page.getByRole('dialog', { name: 'Precio para uno o varios distritos' });
    await expect(ventana.getByRole('textbox', { name: 'Distritos' })).toHaveCount(0);
    const distritos = ventana.getByRole('combobox', { name: 'Distritos' });
    await distritos.click();
    const lista = page.getByRole('listbox', { name: 'Distritos' });
    await expect(lista).toHaveAttribute('aria-multiselectable', 'true');
    // Los de Lima y el Callao, aunque no tengan tarifa todavía.
    for (const distrito of ['Ancón', 'Miraflores', 'Ventanilla'])
      await expect(lista.getByRole('option', { name: distrito, exact: true })).toBeVisible();
    await lista.getByRole('option', { name: 'Ancón', exact: true }).click();
    await lista.getByRole('option', { name: 'Ventanilla', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(ventana).toBeVisible();
    await expect(ventana.getByRole('button', { name: 'Guardar 2 tarifas' })).toBeVisible();
    await ventana.getByRole('button', { name: 'Cancelar' }).click();

    await page.getByRole('button', { name: 'Editar tarifa de Lima Centro a Breña' }).click();
    const edicion = page.getByRole('dialog', { name: 'Editar tarifa' });
    const distrito = edicion.getByRole('combobox', { name: 'Distrito', exact: true });
    await expect(distrito).toHaveText('Breña');
    await distrito.click();
    await expect(page.getByRole('listbox', { name: 'Distrito' })).not.toHaveAttribute(
      'aria-multiselectable',
      'true',
    );
  });

  test('sin distrito, la ventana no guarda y lo dice', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    let guardados = 0;
    page.on('request', (peticion) => {
      if (peticion.method() === 'PUT' && peticion.url().includes('/bff/admin/snapshot')) guardados++;
    });
    await page.goto('/envios');
    await page.getByRole('button', { name: 'Agregar tarifa' }).click();
    const ventana = page.getByRole('dialog', { name: 'Precio para uno o varios distritos' });
    await ventana.getByRole('combobox', { name: 'Tienda de origen' }).fill('Lima Centro');
    await ventana.getByRole('button', { name: 'Guardar 0 tarifas' }).click();
    await expect(ventana.getByText('Elige al menos un distrito.')).toBeVisible();
    await expect(ventana).toBeVisible();
    expect(guardados).toBe(0);
  });
});
