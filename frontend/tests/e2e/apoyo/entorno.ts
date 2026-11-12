import { expect, type Page } from '@playwright/test';

/**
 * Puertos de los servidores que levanta `playwright.config.ts` para las pruebas e2e. Son distintos de los de
 * desarrollo (BFF 3000, Storefront 4200, Admin 4300) para no interferir con ellos. Si cambia el del BFF,
 * cambia también el destino de `proxy.e2e.conf.json`.
 */
export const puertos = { bff: 3400, storefront: 4400, admin: 4500 } as const;

export const urls = {
  bff: `http://localhost:${puertos.bff}`,
  storefront: `http://localhost:${puertos.storefront}`,
  admin: `http://localhost:${puertos.admin}`,
} as const;

/** Cuentas del Admin sembradas por el BFF de prueba (README), solo para uso local. */
export const cuentasAdmin = {
  superadmin: { email: 'owner@webstore.demo', password: 'WebStore#2026', nombre: 'Superadministrador Demo' },
  admin: { email: 'admin@webstore.demo', password: 'Admin#2026' },
  vendedor: { email: 'catalogo@webstore.demo', password: 'Catalogo#2026' },
} as const;

/** Inicia sesión en el Admin. `base` permite usarlo desde una prueba del Storefront. */
export async function ingresarAlAdmin(
  page: Page,
  cuenta: { email: string; password: string },
  base = '',
): Promise<void> {
  await page.goto(`${base}/login`);
  await page.getByRole('textbox', { name: 'Correo' }).fill(cuenta.email);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(cuenta.password);
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Resumen' })).toBeVisible();
}

/** Menú lateral del Admin. */
export const menuAdmin = (page: Page) => page.getByRole('navigation', { name: 'Administración' });

/**
 * Despliega un grupo del menú lateral del Admin si está plegado (feature 003). Los enlaces de un grupo
 * plegado no son visibles: sin esto, un clic falla y un `toHaveCount(0)` pasaría siempre. En móvil no hay
 * títulos de grupo y no hace nada.
 */
export async function desplegarGrupo(page: Page, nombre: string): Promise<void> {
  const titulo = menuAdmin(page).getByRole('button', { name: nombre, exact: true });
  if (!(await titulo.isVisible())) return;
  if ((await titulo.getAttribute('aria-expanded')) === 'false') await titulo.click();
  await expect(titulo).toHaveAttribute('aria-expanded', 'true');
}

/** Despliega todos los grupos del menú lateral del Admin: antes de comprobar que un enlace no está. */
export async function desplegarTodos(page: Page): Promise<void> {
  const titulos = menuAdmin(page).getByRole('button');
  await expect(titulos.first()).toBeAttached();
  for (const titulo of await titulos.all()) {
    if (!(await titulo.isVisible())) continue;
    if ((await titulo.getAttribute('aria-expanded')) === 'false') await titulo.click();
    await expect(titulo).toHaveAttribute('aria-expanded', 'true');
  }
}

/** Botón del menú de usuario de la cabecera del Admin (feature 003): iniciales, nombre y rol. */
export const botonMenuUsuario = (page: Page) => page.locator('ws-admin-menu-usuario').getByRole('button');

/** Abre el menú de usuario del Admin con un clic y devuelve su panel. */
export async function abrirMenuUsuario(page: Page) {
  await botonMenuUsuario(page).click();
  const panel = page.getByRole('menu', { name: 'Cuenta' });
  await expect(panel).toBeVisible();
  return panel;
}

/** Cierra la sesión del Admin desde el menú de usuario y espera el acceso administrativo. */
export async function cerrarSesionAdmin(page: Page): Promise<void> {
  const panel = await abrirMenuUsuario(page);
  await panel.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Acceso administrativo' })).toBeVisible();
}

/** Correo único por ejecución para no chocar con registros de otra prueba. */
export function correoUnico(prefijo: string): string {
  return `${prefijo}-${Date.now()}@example.com`;
}
