import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  cerrarSesionAdmin,
  correoUnico,
  cuentasAdmin,
  desplegarGrupo,
  desplegarTodos,
  fechaDeEntrega,
  ingresarAlAdmin,
  menuAdmin,
  urls,
} from './apoyo/entorno';

/**
 * Menú lateral plegable del Admin (feature 003). TEST-04: en escritorio, cada grupo se pliega desde su título
 * (AC-01); al entrar solo está desplegado el grupo de la página actual y al navegar se despliega el de la nueva
 * (AC-02); el vendedor solo ve sus grupos (AC-03); teclado y `aria-controls` (AC-05); el plegado dura al
 * navegar y no al recargar ni al volver a entrar (AC-07); en móvil la tira queda igual (AC-13). TEST-07, del menú
 * y de los bloques del Resumen: sin animación con `prefers-reduced-motion` y entre 180 y 260 ms sin esa
 * preferencia (AC-06).
 */
const titulo = (page: Page, grupo: string) =>
  menuAdmin(page).getByRole('button', { name: grupo, exact: true });
const enlace = (page: Page, nombre: string) =>
  menuAdmin(page).getByRole('link', { name: nombre, exact: true });

/** Región que controla el título del grupo, por su `aria-controls`. */
async function regionDe(page: Page, grupo: string) {
  const id = await titulo(page, grupo).getAttribute('aria-controls');
  expect(id).toBeTruthy();
  return page.locator(`[id="${id}"]`);
}

/** Títulos de grupo visibles, en el orden del menú. */
async function titulosDeLosGrupos(page: Page, grupos: readonly string[]): Promise<void> {
  await expect(menuAdmin(page).getByRole('button')).toHaveText(grupos);
}

async function esperarGrupos(page: Page, abiertos: readonly string[], plegados: readonly string[]) {
  for (const grupo of abiertos) await expect(titulo(page, grupo)).toHaveAttribute('aria-expanded', 'true');
  for (const grupo of plegados) await expect(titulo(page, grupo)).toHaveAttribute('aria-expanded', 'false');
}

const GRUPOS_SUPERADMIN = ['General', 'Catálogo', 'Ventas', 'Tienda', 'Accesos'] as const;

test.describe('Menú lateral en escritorio', () => {
  test('al entrar por /login solo está desplegado «General»', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);

    await titulosDeLosGrupos(page, GRUPOS_SUPERADMIN);
    await esperarGrupos(page, ['General'], ['Catálogo', 'Ventas', 'Tienda', 'Accesos']);
    await expect(enlace(page, 'Resumen')).toBeVisible();
    for (const oculto of ['Productos', 'Pedidos', 'Banners', 'Usuarios y roles']) {
      await expect(enlace(page, oculto)).toBeHidden();
    }
  });

  test('plegar y desplegar «Catálogo» oculta y muestra sus cuatro enlaces en orden', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.admin);
    const catalogo = titulo(page, 'Catálogo');
    const region = await regionDe(page, 'Catálogo');
    await expect(region).toHaveCount(1);
    const enlaces = ['Productos', 'Inventario', 'Categorías', 'Marcas'];

    await desplegarGrupo(page, 'Catálogo');
    await expect(region.getByRole('link')).toHaveText(enlaces);

    await catalogo.click();
    await expect(catalogo).toHaveAttribute('aria-expanded', 'false');
    await expect(catalogo).toBeVisible();
    for (const nombre of enlaces) await expect(enlace(page, nombre)).toBeHidden();

    await catalogo.click();
    await expect(catalogo).toHaveAttribute('aria-expanded', 'true');
    await expect(region.getByRole('link')).toHaveText(enlaces);
  });

  test('llegar a /pedidos desde «Ver» del Resumen despliega «Ventas» y conserva los demás', async ({
    page,
  }) => {
    // El BFF de las e2e arranca sin pedidos: la prueba crea el suyo para tener un «Ver» en el Resumen.
    const respuesta = await page.request.post(`${urls.bff}/bff/checkout/orders`, {
      data: {
        customer: {
          fullName: 'Menú lateral E2E',
          email: correoUnico('menu-lateral'),
          phone: '987654321',
          document: '45678912',
        },
        shipping: {
          addressLine: 'Av. Larco 456',
          district: 'Miraflores',
          province: 'Lima',
          department: 'Lima',
        },
        items: [{ productId: 'p-004', quantity: 1 }],
        paymentMethod: 'yape-plin',
        deliveryDate: fechaDeEntrega(),
        termsAccepted: true,
      },
    });
    expect(respuesta.ok()).toBeTruthy();
    const pedido = ((await respuesta.json()) as { id: string }).id;

    await ingresarAlAdmin(page, cuentasAdmin.admin);
    await desplegarGrupo(page, 'Tienda');
    // Desde el lote 07 (PBI-0013) el administrador también tiene «Accesos» (Usuarios).
    await esperarGrupos(page, ['General', 'Tienda'], ['Catálogo', 'Ventas', 'Accesos']);

    const ultimos = page.getByRole('main').getByRole('region', { name: 'Últimos pedidos' });
    await ultimos.getByRole('link', { name: `Ver el pedido ${pedido}` }).click();
    await expect(page).toHaveURL(`/pedidos?pedido=${encodeURIComponent(pedido)}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeVisible();

    await esperarGrupos(page, ['General', 'Ventas', 'Tienda'], ['Catálogo', 'Accesos']);
    await expect(enlace(page, 'Pedidos')).toBeVisible();
    await expect(enlace(page, 'Pedidos')).toHaveClass(/bg-primary-soft/);
  });

  test('entrar directo a /pedidos despliega solo «Ventas»', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/pedidos');
    await expect(page.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeVisible();

    await esperarGrupos(page, ['Ventas'], ['General', 'Catálogo', 'Tienda', 'Accesos']);
    await expect(enlace(page, 'Pedidos')).toHaveClass(/bg-primary-soft/);
  });

  test('con teclado, Intro y Espacio pliegan y despliegan y el foco sigue en el título', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const catalogo = titulo(page, 'Catálogo');
    const region = await regionDe(page, 'Catálogo');
    await expect(region).toHaveCount(1);

    // Tab desde el principio de la página hasta el título del grupo.
    await page.locator('body').focus();
    for (let pulsaciones = 0; pulsaciones < 20; pulsaciones += 1) {
      if (await catalogo.evaluate((nodo) => nodo === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(catalogo).toBeFocused();
    expect(await catalogo.evaluate((nodo) => nodo.matches(':focus-visible'))).toBe(true);

    await page.keyboard.press('Enter');
    await expect(catalogo).toHaveAttribute('aria-expanded', 'true');
    await expect(catalogo).toBeFocused();
    await expect(enlace(page, 'Productos')).toBeVisible();

    await page.keyboard.press('Space');
    await expect(catalogo).toHaveAttribute('aria-expanded', 'false');
    await expect(catalogo).toBeFocused();
    await expect(enlace(page, 'Productos')).toBeHidden();
  });

  test('el vendedor ve General y Catálogo, plegables y sin grupos vacíos (PBI-0013)', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.vendedor);
    await titulosDeLosGrupos(page, ['General', 'Catálogo']);
    await esperarGrupos(page, ['General'], ['Catálogo']);

    await desplegarTodos(page);
    const esperado = {
      General: ['Resumen'],
      Catálogo: ['Productos'],
    };
    for (const [grupo, enlaces] of Object.entries(esperado)) {
      await expect((await regionDe(page, grupo)).getByRole('link')).toHaveText(enlaces);
      await titulo(page, grupo).click();
      await expect(titulo(page, grupo)).toHaveAttribute('aria-expanded', 'false');
    }
    await expect(menuAdmin(page).getByRole('link')).toHaveCount(0);
  });

  test('un grupo plegado sigue plegado al navegar y todo vuelve al inicio al recargar y al volver a entrar', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await titulo(page, 'General').click();
    await desplegarGrupo(page, 'Catálogo');
    await desplegarGrupo(page, 'Tienda');
    await esperarGrupos(page, ['Catálogo', 'Tienda'], ['General', 'Ventas', 'Accesos']);

    // Navegar sin recargar: «General» sigue plegado aunque fuera el grupo de la página de entrada.
    await enlace(page, 'Productos').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
    await esperarGrupos(page, ['Catálogo', 'Tienda'], ['General', 'Ventas', 'Accesos']);

    // Al recargar, solo el grupo de la página actual.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Productos' })).toBeVisible();
    await esperarGrupos(page, ['Catálogo'], ['General', 'Ventas', 'Tienda', 'Accesos']);

    // Al volver a iniciar sesión, solo «General».
    await desplegarGrupo(page, 'Tienda');
    await cerrarSesionAdmin(page);
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await esperarGrupos(page, ['General'], ['Catálogo', 'Ventas', 'Tienda', 'Accesos']);
  });
});

test.describe('Menú lateral en móvil (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  // Lote 07b (PBI-0044): la tira horizontal pasa a un panel lateral que se abre con la hamburguesa.
  test('el panel lateral tiene los 13 enlaces, sin títulos de grupo plegables ni desborde horizontal', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.getByRole('button', { name: 'Abrir el menú' }).click();

    await expect(menuAdmin(page).getByRole('button')).toHaveCount(0);
    const enlaces = menuAdmin(page).getByRole('link');
    await expect(enlaces).toHaveCount(13);
    for (const nodo of await enlaces.all()) await expect(nodo).toBeVisible();

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);
  });
});

test.describe('Animación del plegado (AC-06)', () => {
  /** Duración de la primera transición de una región (la de `grid-template-rows`), en milisegundos. */
  const duracionDe = async (region: Locator) => {
    const valor = await region.evaluate((nodo) =>
      getComputedStyle(nodo).transitionDuration.split(',')[0]!.trim(),
    );
    return valor.endsWith('ms') ? Number.parseFloat(valor) : Number.parseFloat(valor) * 1000;
  };
  const duracion = async (page: Page) => duracionDe(await regionDe(page, 'Catálogo'));

  /** Botón de «Pedidos por distrito» en el Resumen y duración de su región (TEST-07, parte del Resumen). */
  const distritos = (page: Page) =>
    page
      .getByRole('main')
      .getByRole('heading', { level: 2, name: 'Pedidos por distrito' })
      .getByRole('button', { name: 'Pedidos por distrito' });
  const duracionDelBloque = async (page: Page) => {
    const id = await distritos(page).getAttribute('aria-controls');
    expect(id).toBe('bloque-distritos');
    return duracionDe(page.locator(`[id="${id}"]`));
  };

  test('con movimiento reducido el cambio es inmediato', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    expect(await duracion(page)).toBe(0);
    await titulo(page, 'Catálogo').click();
    expect(await duracion(page)).toBe(0);
  });

  test('sin esa preferencia, la animación dura entre 180 y 260 ms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const plegado = await duracion(page);
    expect(plegado).toBeGreaterThanOrEqual(180);
    expect(plegado).toBeLessThanOrEqual(260);
    await titulo(page, 'Catálogo').click();
    const desplegado = await duracion(page);
    expect(desplegado).toBeGreaterThanOrEqual(180);
    expect(desplegado).toBeLessThanOrEqual(260);
  });

  test('con movimiento reducido, los bloques del Resumen tampoco se animan', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    expect(await duracionDelBloque(page)).toBe(0);
    await distritos(page).click();
    await expect(distritos(page)).toHaveAttribute('aria-expanded', 'false');
    expect(await duracionDelBloque(page)).toBe(0);
  });

  test('sin esa preferencia, los bloques del Resumen se animan entre 180 y 260 ms', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const desplegado = await duracionDelBloque(page);
    expect(desplegado).toBeGreaterThanOrEqual(180);
    expect(desplegado).toBeLessThanOrEqual(260);
    await distritos(page).click();
    await expect(distritos(page)).toHaveAttribute('aria-expanded', 'false');
    const plegado = await duracionDelBloque(page);
    expect(plegado).toBeGreaterThanOrEqual(180);
    expect(plegado).toBeLessThanOrEqual(260);
  });
});
