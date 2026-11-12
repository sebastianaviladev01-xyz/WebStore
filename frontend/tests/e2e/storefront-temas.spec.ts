import { expect, request as nuevoRequest, test, type Page, type Route } from '@playwright/test';

import { cuentasAdmin, urls } from './apoyo/entorno';

/**
 * Temas en la tienda (feature 002). TEST-22 (AC-18): la hoja `/bff/appearance/theme.css` bloquea el primer
 * pintado, así que la tienda sale ya con el tema activo y sin parpadeo; si la hoja no llega, se ve con B, el de
 * `tokens.css`. El tema se activa por la API del Admin y la prueba deja B activo al terminar.
 */
const HOJA_DEL_TEMA = '/bff/appearance/theme.css';
const FONDO = { b: 'rgb(243, 245, 248)', c: 'rgb(242, 243, 245)' } as const;

async function activarTema(themeId: string): Promise<void> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const sesion = await api.post('/bff/admin/sessions', {
      data: { email: cuentasAdmin.superadmin.email, password: cuentasAdmin.superadmin.password },
    });
    expect(sesion.ok()).toBe(true);
    const headers = { authorization: `Bearer ${(await sesion.json()).token}` };
    const temas = await api.get('/bff/admin/themes', { headers });
    const { revision } = await temas.json();
    const activado = await api.put('/bff/admin/active-theme', { headers, data: { revision, themeId } });
    expect(activado.ok()).toBe(true);
  } finally {
    await api.dispose();
  }
}

/** Sin `/bff/appearance` (el JSON), Angular no aplica ningún tema: el color solo puede venir de la hoja. */
async function sinAparienciaJson(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === '/bff/appearance',
    (route) => route.abort(),
  );
}

async function colores(page: Page) {
  return page.evaluate((hoja) => {
    const raiz = getComputedStyle(document.documentElement);
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null;
    const recurso = performance
      .getEntriesByType('resource')
      .find((entrada) => entrada.name.endsWith(hoja)) as PerformanceResourceTiming | undefined;
    return {
      fondo: getComputedStyle(document.body).backgroundColor,
      primario: raiz.getPropertyValue('--ws-primary').trim().toUpperCase(),
      fcp,
      finDeLaHoja: recurso?.responseEnd ?? null,
    };
  }, HOJA_DEL_TEMA);
}

test.describe('tema activo en la primera carga', () => {
  test.beforeAll(() => activarTema('c'));
  test.afterAll(() => activarTema('b'));

  test('con theme.css retrasada, el primer pintado espera a la hoja y sale con C', async ({ page }) => {
    await sinAparienciaJson(page);
    await page.route(
      (url) => url.pathname === HOJA_DEL_TEMA,
      async (route: Route) => {
        await new Promise((resolver) => setTimeout(resolver, 800));
        await route.continue();
      },
    );

    await page.goto('/');
    await expect(page.locator('ws-root')).not.toBeEmpty();
    await expect.poll(async () => (await colores(page)).fcp).not.toBeNull();

    const medida = await colores(page);
    expect(medida.finDeLaHoja).not.toBeNull();
    expect(medida.fcp!).toBeGreaterThan(medida.finDeLaHoja!);
    expect(medida.fondo).toBe(FONDO.c);
    expect(medida.primario).toBe('#F2B705');
  });

  test('si theme.css no llega, la tienda se ve con B', async ({ page }) => {
    await sinAparienciaJson(page);
    await page.route(
      (url) => url.pathname === HOJA_DEL_TEMA,
      (route) => route.abort(),
    );

    await page.goto('/');
    await expect(page.locator('ws-root')).not.toBeEmpty();
    await expect.poll(async () => (await colores(page)).fcp).not.toBeNull();

    const medida = await colores(page);
    expect(medida.fondo).toBe(FONDO.b);
    expect(medida.primario).toBe('#1D4ED8');
  });
});
