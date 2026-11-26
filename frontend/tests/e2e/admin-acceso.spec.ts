import { expect, test, type Page } from '@playwright/test';

import {
  cerrarSesionAdmin,
  comprobarEnlacesDelMenu,
  cuentasAdmin,
  desplegarTodos,
  ingresarAlAdmin,
} from './apoyo/entorno';

/**
 * Acceso al Admin y roles fijos: el superadministrador entra y recorre cada módulo desde el menú; el vendedor
 * solo ve sus módulos y no llega a Usuarios ni escribiendo la URL.
 */
const modulos = [
  { enlace: 'Dashboard', titulo: 'WebStore Admin | Dashboard', encabezado: 'Dashboard de la tienda' },
  { enlace: 'Productos', titulo: 'WebStore Admin | Productos', encabezado: 'Productos' },
  { enlace: 'Inventario', titulo: 'WebStore Admin | Inventario', encabezado: 'Inventario' },
  { enlace: 'Categorías', titulo: 'WebStore Admin | Categorías', encabezado: 'Categorías' },
  { enlace: 'Marcas', titulo: 'WebStore Admin | Marcas', encabezado: 'Marcas' },
  { enlace: 'Pedidos', titulo: 'WebStore Admin | Pedidos', encabezado: 'Pedidos' },
  { enlace: 'Clientes', titulo: 'WebStore Admin | Clientes', encabezado: 'Clientes' },
  { enlace: 'Reclamaciones', titulo: 'WebStore Admin | Reclamaciones', encabezado: 'Reclamaciones' },
  { enlace: 'Banners', titulo: 'WebStore Admin | Banners', encabezado: 'Banners y campañas' },
  { enlace: 'Contenido', titulo: 'WebStore Admin | Contenido', encabezado: 'Contenido y configuración' },
  // Lote 17 (ADR-0021, PBI-0178 y PBI-0183): la primera fecha de entrega y los días no laborables.
  {
    enlace: 'Entregas y feriados',
    titulo: 'WebStore Admin | Entregas y feriados',
    encabezado: 'Entregas y feriados',
  },
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
  // Con los grupos plegados (feature 003) sus enlaces no se ven; el recorrido los conserva desplegados.
  await desplegarTodos(page);
  await comprobarEnlacesDelMenu(page, 'superadmin');

  for (const { enlace, titulo, encabezado } of modulos) {
    await menu(page).getByRole('link', { name: enlace, exact: true }).click();
    await expect(page).toHaveTitle(titulo);
    await expect(page.getByRole('heading', { level: 1, name: encabezado, exact: true })).toBeVisible();
  }

  await expect(page.getByRole('heading', { level: 2, name: 'Superadministrador' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Vendedor' })).toBeVisible();

  await cerrarSesionAdmin(page);
});

test('el vendedor ve el Dashboard, Productos, Inventario y Pedidos (PBI-0013, PBI-0170)', async ({
  page,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.vendedor);
  // Las ausencias se comprueban con todo desplegado: con un grupo plegado pasarían siempre.
  await desplegarTodos(page);

  await comprobarEnlacesDelMenu(page, 'vendedor');

  // PBI-0170 (lote 11, provisional): gestiona el inventario y ve los pedidos, sin cambiar su estado.
  await page.goto('/inventario');
  await expect(page.getByRole('heading', { level: 1, name: 'Inventario' })).toBeVisible();
  await page.goto('/pedidos');
  await expect(page.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeVisible();
  await expect(page.getByText('Cambiar estado')).toHaveCount(0);

  for (const ruta of ['/usuarios', '/usuarios/nuevo', '/clientes', '/contenido', '/categorias']) {
    await page.goto(ruta);
    await expect(page).toHaveTitle('WebStore Admin | Dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  }
  await page.goto('/productos/nuevo');
  await expect(page.getByRole('heading', { level: 1, name: 'Nuevo producto' })).toBeVisible();
});

test('el administrador gestiona Usuarios y no ve Contenido ni Temas (PBI-0013)', async ({ page }) => {
  await ingresarAlAdmin(page, cuentasAdmin.admin);
  await desplegarTodos(page);

  await expect(menu(page).getByRole('link', { name: 'Usuarios y roles', exact: true })).toBeVisible();
  for (const oculto of ['Contenido', 'Entregas y feriados', 'Temas']) {
    await expect(menu(page).getByRole('link', { name: oculto, exact: true })).toHaveCount(0);
  }
  for (const visible of [
    'Inventario',
    'Pedidos',
    'Clientes',
    'Reclamaciones',
    'Banners',
    'Tarifas de envío',
  ]) {
    await expect(menu(page).getByRole('link', { name: visible, exact: true })).toBeVisible();
  }
  await page.goto('/contenido');
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
});
