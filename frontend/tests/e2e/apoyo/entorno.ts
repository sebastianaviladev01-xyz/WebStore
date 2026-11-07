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

/** Correo único por ejecución para no chocar con registros de otra prueba. */
export function correoUnico(prefijo: string): string {
  return `${prefijo}-${Date.now()}@example.com`;
}
