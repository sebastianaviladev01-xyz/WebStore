import { expect, test, type Page } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Acceso al Admin y roles fijos: el superadministrador entra y recorre cada módulo desde el menú; el vendedor
 * solo ve sus módulos y no llega a Usuarios ni escribiendo la URL.
 */
const modulos = [
  { enlace: 'Resumen', titulo: 'WebStore Admin | Resumen', encabezado: 'Resumen' },
  { enlace: 'Productos', titulo: 'WebStore Admin | Productos', encabezado: 'Productos' },
  { enlace: 'Inventario', titulo: 'WebStore Admin | Inventario', encabezado: 'Inventario' },
  { enlace: 'Categorías', titulo: 'WebStore Admin | Categorías', encabezado: 'Categorías' },
  { enlace: 'Marcas', titulo: 'WebStore Admin | Marcas', encabezado: 'Marcas' },
  { enlace: 'Pedidos', titulo: 'WebStore Admin | Pedidos', encabezado: 'Pedidos' },
  { enlace: 'Clientes', titulo: 'WebStore Admin | Clientes', encabezado: 'Clientes' },
  { enlace: 'Reclamaciones', titulo: 'WebStore Admin | Reclamaciones', encabezado: 'Reclamaciones' },
  { enlace: 'Banners', titulo: 'WebStore Admin | Banners', encabezado: 'Banners y campañas' },
  { enlace: 'Contenido', titulo: 'WebStore Admin | Contenido', encabezado: 'Contenido y configuración' },
  { enlace: 'Temas', titulo: 'WebStore Admin | Temas', encabezado: 'Temas' },
  { enlace: 'Tarifas de envío', titulo: 'WebStore Admin | Envíos', encabezado: 'Tarifas de envío' },
  { enlace: 'Usuarios y roles', titulo: 'WebStore Admin | Usuarios', encabezado: 'Usuarios y roles' },
];

const menu = (page: Page) => page.getByRole('navigation', { name: 'Administración' });

test('sin sesión, el panel lleva al acceso administrativo', async ({ page }) => {
  await page.goto('/productos');
  await expect(page).toHaveTitle('WebStore Admin | Acceso');
  await expect(page.getByRole('heading', { level: 1, name: 'Acceso administrativo' })).toBeVisible();
});

test('el acceso rechaza una contraseña incorrecta', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo' }).fill(cuentasAdmin.superadmin.email);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('Incorrecta#2026');
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Acceso administrativo' })).toBeVisible();
});

test('el superadministrador recorre todos los módulos del panel', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await expect(page.getByRole('banner')).toContainText(cuentasAdmin.superadmin.nombre);
  await expect(menu(page).getByRole('link')).toHaveCount(modulos.length);

  for (const { enlace, titulo, encabezado } of modulos) {
    await menu(page).getByRole('link', { name: enlace, exact: true }).click();
    await expect(page).toHaveTitle(titulo);
    await expect(page.getByRole('heading', { level: 1, name: encabezado, exact: true })).toBeVisible();
  }

  await expect(page.getByRole('heading', { level: 2, name: 'Superadministrador' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Vendedor' })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Acceso administrativo' })).toBeVisible();
});

test('el vendedor no ve Usuarios ni los módulos comerciales', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.vendedor);

  await expect(menu(page).getByRole('link', { name: 'Resumen' })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Inventario' })).toBeVisible();
  await expect(menu(page).getByRole('link', { name: 'Pedidos' })).toBeVisible();
  for (const oculto of ['Usuarios y roles', 'Tarifas de envío', 'Contenido', 'Banners']) {
    await expect(menu(page).getByRole('link', { name: oculto, exact: true })).toHaveCount(0);
  }

  await page.goto('/usuarios');
  await expect(page).toHaveTitle('WebStore Admin | Resumen');
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Usuarios y roles' })).toHaveCount(0);
});
