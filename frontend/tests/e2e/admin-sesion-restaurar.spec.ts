import { expect, request as nuevoRequest, test, type Page, type Route } from '@playwright/test';

import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Lote 40 (ADR-0032), PBI-0257: al recargar el backoffice, la sesión se restaura con el token de `sessionStorage`.
 * Solo una sesión que ya no vale (`401`) borra el token y lleva al acceso como antes. Si el BFF no responde o falla,
 * el token se conserva, el acceso avisa de que no pudo comprobar la sesión y ofrece «Reintentar»; mientras tanto no
 * se entra a ninguna página del panel.
 */
const SESSION_KEY = 'webstore-admin-session-v1';
const tokenGuardado = (page: Page) => page.evaluate((clave) => sessionStorage.getItem(clave), SESSION_KEY);
const avisoSinComprobar = (page: Page) =>
  page.getByRole('alert').filter({ hasText: 'No pudimos comprobar tu sesión' });

for (const { motivo, fallar } of [
  {
    motivo: 'un 503',
    fallar: (route: Route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"UNAVAILABLE"}' }),
  },
  {
    motivo: 'un fallo de red',
    fallar: (route: Route) => route.abort('failed'),
  },
]) {
  test(`PBI-0257: con ${motivo} al comprobar la sesión, el token se conserva y «Reintentar» entra a la página`, async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/productos');
    await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
    const token = await tokenGuardado(page);
    expect(token).not.toBeNull();

    let caido = true;
    let consultas = 0;
    await page.route('**/bff/admin/sessions/current', (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      consultas++;
      return caido ? fallar(route) : route.fallback();
    });
    await page.reload();

    // No entra al panel sin usuario: el acceso avisa y ofrece reintentar, con el token intacto.
    await expect(page).toHaveURL(/\/login$/);
    await expect(avisoSinComprobar(page)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Administración' })).toHaveCount(0);
    expect(await tokenGuardado(page)).toBe(token);
    expect(consultas).toBe(1);

    // Si el reintento vuelve a fallar, sigue igual.
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect.poll(() => consultas).toBe(2);
    await expect(avisoSinComprobar(page)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenGuardado(page)).toBe(token);

    // Con el BFF de vuelta, entra a la página que se recargó, con la misma sesión.
    caido = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page).toHaveURL(/\/productos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
    await expect(page.getByRole('banner')).toContainText(cuentasAdmin.superadmin.nombre);
    expect(await tokenGuardado(page)).toBe(token);
  });
}

test('PBI-0257: con un 401 al comprobar la sesión, el token se borra y va al acceso, como antes', async ({
  page,
}) => {
  await ingresarAlAdmin(page, cuentasAdmin.superadmin);
  await page.goto('/productos');
  await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
  // La sesión se cierra en el BFF (como si venciera) sin que el navegador se entere.
  const token = await tokenGuardado(page);
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    expect(
      (
        await api.delete('/bff/admin/sessions/current', { headers: { authorization: `Bearer ${token}` } })
      ).status(),
    ).toBe(204);
  } finally {
    await api.dispose();
  }

  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Acceso administrativo' })).toBeVisible();
  await expect(avisoSinComprobar(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
  expect(await tokenGuardado(page)).toBeNull();
});
