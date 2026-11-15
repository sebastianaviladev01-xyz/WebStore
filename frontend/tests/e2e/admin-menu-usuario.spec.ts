import { expect, test } from '@playwright/test';

import {
  abrirMenuUsuario,
  botonMenuUsuario,
  cerrarSesionAdmin,
  cuentasAdmin,
  ingresarAlAdmin,
} from './apoyo/entorno';

/**
 * Menú de usuario del Admin y página Perfil (feature 003, TEST-06). El botón de la cabecera muestra las
 * iniciales, el nombre y el rol en mayúsculas (AC-08); el panel, la cuenta, «Perfil» y «Cerrar sesión»
 * (AC-09, AC-10). Perfil es de solo lectura y muestra los datos de la sesión (AC-12, D5): ninguna petición al
 * BFF al llegar desde el menú.
 */
const perfiles = [
  {
    rol: 'superadmin',
    cuenta: cuentasAdmin.superadmin,
    nombre: 'Superadministrador Demo',
    iniciales: 'SD',
    etiqueta: 'Superadministrador',
    descripcion: 'Acceso total: configuración de la tienda, temas, contenido y todos los usuarios.',
  },
  {
    rol: 'admin',
    cuenta: cuentasAdmin.admin,
    nombre: 'Administración Demo',
    iniciales: 'AD',
    etiqueta: 'Administrador',
    descripcion: 'Opera la tienda y gestiona a los vendedores, sin temas ni contenido.',
  },
  {
    rol: 'vendedor',
    cuenta: cuentasAdmin.vendedor,
    nombre: 'Vendedor Demo',
    iniciales: 'VD',
    etiqueta: 'Vendedor',
    descripcion: 'Crea productos y modifica sus fichas, precios y stock.',
  },
] as const;

const SESSION_KEY = 'webstore-admin-session-v1';
/** Círculo de las iniciales: el primer elemento del botón. */
const iniciales = (page: Parameters<typeof botonMenuUsuario>[0]) =>
  botonMenuUsuario(page).locator('span').first();

for (const { rol, cuenta, nombre, iniciales: letras, etiqueta } of perfiles) {
  test(`el botón del ${rol} muestra sus iniciales, su nombre y su rol en mayúsculas`, async ({ page }) => {
    await ingresarAlAdmin(page, cuenta);
    const boton = botonMenuUsuario(page);

    await expect(iniciales(page)).toHaveText(letras);
    await expect(boton).toContainText(nombre, { useInnerText: true });
    // El rol se ve en mayúsculas con CSS; el texto sigue siendo la etiqueta de rol.rules.ts.
    await expect(boton).toContainText(etiqueta.toUpperCase(), { useInnerText: true });
    await expect(boton).toContainText(etiqueta);
    // Lote 06 (PBI-0070): las iniciales se ven, así que también integran el nombre accesible («SD Nombre Rol»),
    // para que quien usa control por voz pueda nombrar el botón por lo que ve (WCAG 2.5.3).
    await expect(boton).toHaveAccessibleName(new RegExp(`^${letras} ${nombre} ${etiqueta}$`, 'i'));
  });
}

test('el menú se abre con clic, muestra la cuenta y sus opciones en orden, y Escape devuelve el foco', async ({
  page,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const boton = botonMenuUsuario(page);
  await expect(boton).toHaveAttribute('aria-expanded', 'false');

  const panel = await abrirMenuUsuario(page);
  await expect(boton).toHaveAttribute('aria-expanded', 'true');

  // Bloque de la cuenta: nombre, correo y rol, enlazado al menú con aria-describedby.
  const cuenta = page.locator('#menu-usuario-cuenta');
  await expect(panel).toHaveAttribute('aria-describedby', 'menu-usuario-cuenta');
  await expect(cuenta).toContainText('Superadministrador Demo');
  await expect(cuenta).toContainText(cuentasAdmin.superadmin.email);
  await expect(cuenta).toContainText('Superadministrador');
  await expect(panel.getByRole('menuitem')).toHaveText(['Perfil', 'Cerrar sesión']);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(boton).toBeFocused();
  await expect(boton).toHaveAttribute('aria-expanded', 'false');
});

test('el menú se abre y se recorre con el teclado', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.admin);
  const boton = botonMenuUsuario(page);
  await boton.focus();

  await page.keyboard.press('Enter');
  const panel = page.getByRole('menu', { name: 'Cuenta' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('menuitem', { name: 'Perfil' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(panel.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(boton).toBeFocused();

  // Espacio también lo abre.
  await page.keyboard.press(' ');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(boton).toBeFocused();
});

test('fuera del menú la cabecera tiene «Actualizar», que recarga los datos, y no «Cerrar sesión»', async ({
  page,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  const cabecera = page.getByRole('banner');

  await expect(cabecera.getByRole('button', { name: 'Actualizar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Cerrar sesión' })).toHaveCount(0);
  // Ni el nombre ni el rol sueltos: solo dentro del botón del menú.
  await expect(cabecera.locator('strong')).toHaveCount(1);
  await expect(botonMenuUsuario(page).locator('strong')).toHaveText('Superadministrador Demo');

  // «Actualizar» vuelve a pedir el snapshot (D6).
  const recarga = page.waitForRequest(
    (request) => request.method() === 'GET' && new URL(request.url()).pathname === '/bff/admin/snapshot',
  );
  await cabecera.getByRole('button', { name: 'Actualizar' }).click();
  await recarga;
});

test('«Cerrar sesión» lleva al acceso y borra el token, también si el BFF falla', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  expect(await page.evaluate((clave) => sessionStorage.getItem(clave), SESSION_KEY)).not.toBeNull();

  let cierresAbortados = 0;
  await page.route('**/bff/admin/sessions/current', async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue();
    cierresAbortados += 1;
    await route.abort('failed');
  });

  await cerrarSesionAdmin(page);
  await expect(page).toHaveURL(/\/login$/);
  expect(cierresAbortados).toBe(1);
  expect(await page.evaluate((clave) => sessionStorage.getItem(clave), SESSION_KEY)).toBeNull();

  // Sin token, el panel vuelve a pedir el acceso.
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});

for (const { rol, cuenta, nombre, etiqueta, descripcion } of perfiles) {
  test(`el ${rol} abre su perfil de solo lectura desde el menú sin pedir datos al BFF`, async ({ page }) => {
    await ingresarAlAdmin(page, cuenta);

    const peticionesAlBff: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/bff/')) peticionesAlBff.push(request.url());
    });
    const panel = await abrirMenuUsuario(page);
    await panel.getByRole('menuitem', { name: 'Perfil' }).click();

    await expect(page).toHaveURL(/\/perfil$/);
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

test.describe('Menú de usuario en móvil (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('el botón muestra las iniciales, el panel cabe y la página no desborda', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const boton = botonMenuUsuario(page);

    await expect(boton).toBeVisible();
    await expect(iniciales(page)).toHaveText('SD');
    // Bajo sm: el nombre y el rol no se ven, pero siguen en el nombre accesible, que empieza por las iniciales que
    // sí se ven (PBI-0070, WCAG 2.5.3).
    await expect(boton.locator('strong').locator('..')).toHaveCSS('width', '1px');
    await expect(boton).toHaveAccessibleName(/^SD Superadministrador Demo Superadministrador$/i);

    const panel = await abrirMenuUsuario(page);
    const caja = await panel.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.x).toBeGreaterThanOrEqual(0);
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(375);
    expect(caja!.y + caja!.height).toBeLessThanOrEqual(812);
    await expect(panel.getByRole('menuitem')).toHaveText(['Perfil', 'Cerrar sesión']);

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);
  });
});
