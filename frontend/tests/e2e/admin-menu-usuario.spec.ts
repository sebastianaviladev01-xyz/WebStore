import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Menú de usuario del Admin y página Perfil (feature 003, TEST-06). Perfil es de solo lectura y muestra los
 * datos de la sesión (D5): ninguna petición al BFF al llegar desde otra página. Hasta ⚠ TASK-06 no hay menú
 * de usuario, así que se llega a `/perfil` por URL sin recargar la aplicación.
 */
const perfiles = [
  {
    rol: 'superadmin',
    cuenta: cuentasAdmin.superadmin,
    nombre: 'Superadministrador Demo',
    etiqueta: 'Superadministrador',
    descripcion: 'Acceso total, incluida la gestión de usuarios y roles.',
  },
  {
    rol: 'admin',
    cuenta: cuentasAdmin.admin,
    nombre: 'Administración Demo',
    etiqueta: 'Administrador',
    descripcion: 'Opera toda la tienda: catálogo, contenido, envíos, pedidos y reclamaciones.',
  },
  {
    rol: 'vendedor',
    cuenta: cuentasAdmin.vendedor,
    nombre: 'Vendedor Demo',
    etiqueta: 'Vendedor',
    descripcion: 'Mantiene fichas e inventario y actualiza el estado de los pedidos.',
  },
] as const;

/** Navega dentro de la aplicación, como un `routerLink`: el router atiende `popstate` sin recargar. */
async function irSinRecargar(page: Page, ruta: string): Promise<void> {
  await page.evaluate((destino) => {
    history.pushState(null, '', destino);
    dispatchEvent(new PopStateEvent('popstate', { state: null }));
  }, ruta);
}

for (const { rol, cuenta, nombre, etiqueta, descripcion } of perfiles) {
  test(`el ${rol} abre su perfil de solo lectura sin pedir datos al BFF`, async ({ page }) => {
    await ingresarAlAdmin(page, cuenta);

    const peticionesAlBff: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/bff/')) peticionesAlBff.push(request.url());
    });
    await irSinRecargar(page, '/perfil');

    await expect(page).toHaveTitle('WebStore Admin | Perfil');
    const principal = page.getByRole('main');
    await expect(principal.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible();
    await expect(principal).toContainText(nombre);
    await expect(principal).toContainText(cuenta.email);
    await expect(principal).toContainText(etiqueta);
    await expect(principal).toContainText(descripcion);

    // Solo lectura: ni campos ni botones (tampoco «Guardar»).
    await expect(principal.getByRole('textbox')).toHaveCount(0);
    await expect(principal.getByRole('button')).toHaveCount(0);

    // El chunk de la página ya cargó y se pintó: lo que se haya pedido al BFF, ya está pedido.
    await page.waitForLoadState('networkidle');
    expect(peticionesAlBff).toEqual([]);
  });
}

test('sin sesión, el perfil lleva al acceso administrativo', async ({ page }) => {
  await page.goto('/perfil');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle('WebStore Admin | Acceso');
  await expect(page.getByRole('heading', { level: 1, name: 'Acceso administrativo' })).toBeVisible();
});
