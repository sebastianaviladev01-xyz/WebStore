import { expect, test, type Page } from '@playwright/test';

import {
  agregarCategorias,
  agregarProductos,
  cambiarMarcas,
  enviarCambios,
  leerCategorias,
  leerMarcas,
  leerProductos,
  leerSnapshot,
  productoDePrueba,
  retirarCategorias,
  retirarProductos,
} from './apoyo/catalogo';
import { correoUnico, cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 08 (ADR-0017), PBI-0133: lo que faltaba de los recorridos de altas, ediciones y borrados del Admin, que es
 * donde están los defectos de guardado. Las altas y ediciones de productos, categorías, marcas, clientes y usuarios
 * ya las cubren `admin-catalogo-filtros`, `admin-guardado-y-datos` y `admin-permisos`; aquí van los borrados que
 * llegan hasta el BFF (producto, marca, categoría y usuario) y el ciclo completo de una tarifa de envío. Cada prueba
 * deja los datos como estaban en un `finally`: las suites van en serie y comparten el estado del BFF.
 */

/** Acepta el `confirm()` de la página y comprueba qué pregunta hizo. */
function aceptarConfirmacion(page: Page, pregunta: string): void {
  page.once('dialog', (dialogo) => {
    expect(dialogo.message()).toBe(pregunta);
    void dialogo.accept();
  });
}

test.describe('Borrados que llegan al BFF', () => {
  test('eliminar un producto lo quita de la lista y del BFF', async ({ page }) => {
    const nombre = 'Producto borrable 08';
    const ids = ['e2e-08-borrable'];
    try {
      await agregarProductos([productoDePrueba({ id: ids[0], sku: 'E2E-08-BORRABLE', name: nombre })]);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/productos?nombre=borrable%2008');
      const eliminar = page.getByRole('button', { name: `Eliminar producto ${nombre}` });
      await expect(eliminar).toBeVisible();
      aceptarConfirmacion(page, '¿Eliminar producto?');
      await eliminar.click();
      await expect(eliminar).toHaveCount(0);
      expect((await leerProductos()).some((producto) => producto.id === ids[0])).toBe(false);
    } finally {
      await retirarProductos(ids);
    }
  });

  test('cancelar la confirmación no elimina el producto', async ({ page }) => {
    const nombre = 'Producto que se queda 08';
    const ids = ['e2e-08-se-queda'];
    try {
      await agregarProductos([productoDePrueba({ id: ids[0], sku: 'E2E-08-SE-QUEDA', name: nombre })]);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/productos?nombre=se%20queda%2008');
      const eliminar = page.getByRole('button', { name: `Eliminar producto ${nombre}` });
      page.once('dialog', (dialogo) => void dialogo.dismiss());
      await eliminar.click();
      await expect(eliminar).toBeVisible();
      expect((await leerProductos()).some((producto) => producto.id === ids[0])).toBe(true);
    } finally {
      await retirarProductos(ids);
    }
  });

  test('eliminar una marca sin productos la quita de la lista y del BFF', async ({ page }) => {
    const originales = await leerMarcas();
    const nombre = 'Marca borrable 08';
    try {
      await cambiarMarcas((actuales) => [...actuales, { id: 'b-e2e-08', name: nombre, active: true }]);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/marcas');
      const eliminar = page.getByRole('button', { name: `Eliminar marca ${nombre}` });
      await expect(eliminar).toBeVisible();
      aceptarConfirmacion(page, '¿Eliminar marca?');
      await eliminar.click();
      await expect(eliminar).toHaveCount(0);
      expect((await leerMarcas()).some((marca) => marca.id === 'b-e2e-08')).toBe(false);
    } finally {
      await cambiarMarcas(() => originales);
    }
  });

  test('eliminar una categoría sin productos la quita de la lista y del BFF', async ({ page }) => {
    const nombre = 'Categoría borrable 08';
    try {
      await agregarCategorias([{ id: 'e2e-08-categoria', name: nombre }]);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/categorias');
      const eliminar = page.getByRole('button', { name: `Eliminar categoría ${nombre}` });
      await expect(eliminar).toBeVisible();
      aceptarConfirmacion(page, '¿Eliminar categoría?');
      await eliminar.click();
      await expect(eliminar).toHaveCount(0);
      expect((await leerCategorias()).some((categoria) => categoria.id === 'e2e-08-categoria')).toBe(false);
    } finally {
      await retirarCategorias(['e2e-08-categoria']);
    }
  });

  test('el superadministrador crea un usuario, lo edita y lo elimina', async ({ page }) => {
    const antes = (await leerSnapshot()).users;
    const correo = correoUnico('vendedor-lote08');
    const lista = page.getByRole('region', { name: 'Usuarios administrativos' });
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      // Lote 21 (PBI-0211): el usuario se registra en su propia interfaz y se vuelve a la lista al guardar.
      await page.goto('/usuarios/nuevo');
      await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Vendedor del lote 08');
      await page.getByRole('textbox', { name: 'Correo', exact: true }).fill(correo);
      await page.getByLabel('Contraseña temporal').fill('Temporal1234');
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(lista).toContainText('Vendedor del lote 08');

      await lista.getByRole('link', { name: 'Editar usuario Vendedor del lote 08' }).click();
      await expect(page).toHaveURL(/\/usuarios\/[^/]+$/);
      await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Vendedor renombrado 08');
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(lista).toContainText('Vendedor renombrado 08');
      await expect(lista).not.toContainText('Vendedor del lote 08');
      expect((await leerSnapshot()).users.find((usuario) => usuario.email === correo)).toMatchObject({
        name: 'Vendedor renombrado 08',
      });

      const eliminar = lista.getByRole('button', { name: 'Eliminar usuario Vendedor renombrado 08' });
      aceptarConfirmacion(page, '¿Eliminar usuario?');
      await eliminar.click();
      await expect(eliminar).toHaveCount(0);
      expect((await leerSnapshot()).users.some((usuario) => usuario.email === correo)).toBe(false);
    } finally {
      const nuevos = (await leerSnapshot()).users.filter(
        (usuario) => !antes.some((otro) => otro.id === usuario.id),
      );
      if (nuevos.length) await enviarCambios({ users: { remove: nuevos.map((usuario) => usuario.id) } });
    }
  });
});

test.describe('Tarifas de envío: alta, edición y borrado', () => {
  test('crear una tarifa, cambiarle el precio y eliminarla queda guardado en el BFF', async ({ page }) => {
    const antes = (await leerSnapshot()).rates;
    // Lote 21 (ADR-0025): el distrito se elige de la lista (PBI-0216) en la ventana de registro (PBI-0211).
    const distrito = 'Pucusana';
    const lista = page.getByRole('region', { name: 'Tarifas registradas' });
    const tarifa = () =>
      leerSnapshot().then((snapshot) =>
        snapshot.rates.find((rate) => rate.origin === 'Origen E2E Ocho' && rate.destination === distrito),
      );
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/envios');
      await page.getByRole('button', { name: 'Agregar tarifa' }).click();
      const ventana = page.getByRole('dialog', { name: 'Precio para uno o varios distritos' });
      await ventana.getByRole('combobox', { name: 'Tienda de origen' }).fill('Origen E2E Ocho');
      await ventana.getByRole('combobox', { name: 'Distritos' }).click();
      await page.getByRole('option', { name: distrito, exact: true }).click();
      await page.keyboard.press('Escape');
      await ventana.getByRole('spinbutton', { name: 'Precio (S/)' }).fill('12.5');
      await ventana.getByRole('button', { name: 'Guardar 1 tarifa' }).click();
      await expect(ventana).toBeHidden();
      await expect.poll(tarifa).toMatchObject({ origin: 'Origen E2E Ocho', price: 12.5 });

      // La lista la muestra con su filtro de texto.
      const panel = page.getByRole('search', { name: 'Filtros de tarifas' });
      await panel.getByRole('textbox', { name: 'Buscar tarifa' }).fill('Origen E2E Ocho');
      await panel.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect(lista).toContainText(distrito);

      await lista.getByRole('button', { name: `Editar tarifa de Origen E2E Ocho a ${distrito}` }).click();
      const edicion = page.getByRole('dialog', { name: 'Editar tarifa' });
      await expect(edicion.getByRole('combobox', { name: 'Distrito', exact: true })).toHaveText(distrito);
      await edicion.getByRole('spinbutton', { name: 'Precio (S/)' }).fill('15');
      await edicion.getByRole('button', { name: 'Guardar tarifa' }).click();
      await expect(edicion).toBeHidden();
      await expect.poll(tarifa).toMatchObject({ price: 15 });

      const eliminar = lista.getByRole('button', {
        name: `Eliminar tarifa de Origen E2E Ocho a ${distrito}`,
      });
      aceptarConfirmacion(page, '¿Eliminar tarifa?');
      await eliminar.click();
      await expect(eliminar).toHaveCount(0);
      expect(await tarifa()).toBeUndefined();
    } finally {
      const nuevas = (await leerSnapshot()).rates.filter(
        (rate) => !antes.some((otra) => otra.id === rate.id),
      );
      if (nuevas.length) await enviarCambios({ rates: { remove: nuevas.map((rate) => rate.id) } });
    }
  });
});
