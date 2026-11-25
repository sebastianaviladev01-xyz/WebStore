import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';

import { urls } from './entorno';

/**
 * Apoyo de TEST-21 (feature 002, modo demo). Las e2e arrancan el BFF con `WEBSTORE_DEMO_MODE=true`, así que la
 * tuerca está en todas las pantallas del Admin (la tienda no la tiene desde el lote 14, PBI-0188); estas funciones la
 * manejan y miden lo que debe cumplir (AC-15, AC-16, AC-21).
 */
export const COOKIE_VISTA_PREVIA = 'ws_tema_vista_previa';
// Lote 28 (PBI-0240): C lleva el grafito de principal y el ámbar de secundario.
export const PRIMARIO = { b: '#1D4ED8', c: '#1F2328' } as const;
export const ANCHOS = [
  { ancho: 1440, alto: 900 },
  { ancho: 390, alto: 844 },
] as const;

export const tuerca = (page: Page): Locator => page.getByRole('button', { name: 'Cambiar tema' });
export const menuDeTemas = (page: Page): Locator => page.getByRole('menu', { name: 'Temas' });

/** Color principal que pinta la página en este momento. */
export function primario(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--ws-primary').trim().toUpperCase(),
  );
}

export async function vistaPrevia(context: BrowserContext): Promise<string | null> {
  const cookie = (await context.cookies()).find((c) => c.name === COOKIE_VISTA_PREVIA);
  return cookie?.value ?? null;
}

/** Marca la ventana: si la página se recarga, la marca desaparece. */
export async function marcarSinRecarga(page: Page): Promise<void> {
  await page.evaluate(() => Object.assign(window, { __wsSinRecarga: true }));
}

export function sigueSinRecargar(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { __wsSinRecarga?: boolean }).__wsSinRecarga === true);
}

/** Con el foco en la tuerca: Intro abre el menú y las flechas llegan a «Grafito y ámbar» (C), que se elige con Intro. */
export async function elegirCConTeclado(page: Page): Promise<void> {
  await tuerca(page).focus();
  await page.keyboard.press('Enter');
  await expect(menuDeTemas(page)).toBeVisible();
  await expect(page.getByRole('menuitemradio', { name: /^Violeta tienda/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitemradio', { name: /^Azul cobalto/ })).toBeFocused();
  await expect(page.getByRole('menuitemradio', { name: /^Azul cobalto/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitemradio', { name: /^Grafito y ámbar/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menuDeTemas(page)).toBeHidden();
  await expect(tuerca(page)).toBeFocused();
}

/** Abre el menú con el teclado, va a la última opción con Fin y vuelve al tema activo. */
export async function volverAlActivoConTeclado(page: Page): Promise<void> {
  await tuerca(page).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitemradio', { name: /^Grafito y ámbar/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Volver al tema activo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(menuDeTemas(page)).toBeHidden();
}

/** El tema activo guardado en el BFF: la tuerca nunca lo cambia. */
export async function temaActivoDelBff(page: Page): Promise<string> {
  const respuesta = await page.request.get(`${urls.bff}/bff/appearance`);
  return (await respuesta.json()).activeThemeId;
}

/** Sirve la respuesta real de `/bff/appearance` con `demoMode: false`. */
export async function sinModoDemo(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === '/bff/appearance',
    async (route) => {
      const respuesta = await route.fetch();
      await route.fulfill({ response: respuesta, json: { ...(await respuesta.json()), demoMode: false } });
    },
  );
}

/**
 * Coloca el control arriba, en el centro y abajo de la ventana (o lo más cerca que permita el scroll) y exige
 * que su caja no se cruce con la de la tuerca en ninguna de las tres posiciones.
 */
export async function sinCruceConLaTuerca(page: Page, control: Locator, nombre: string): Promise<void> {
  await expect(control, nombre).toBeVisible();
  await expect(tuerca(page)).toBeVisible();
  for (const block of ['start', 'center', 'end'] as const) {
    await control.evaluate((el, b) => el.scrollIntoView({ block: b, behavior: 'instant' }), block);
    const a = await control.boundingBox();
    const t = await tuerca(page).boundingBox();
    expect(a, nombre).not.toBeNull();
    expect(t).not.toBeNull();
    const ancho = Math.min(a!.x + a!.width, t!.x + t!.width) - Math.max(a!.x, t!.x);
    const alto = Math.min(a!.y + a!.height, t!.y + t!.height) - Math.max(a!.y, t!.y);
    const cruce = ancho > 0 && alto > 0 ? Math.round(ancho * alto) : 0;
    expect(cruce, `${nombre} (${block}) frente a la tuerca`).toBe(0);
  }
}

/** Cruce, en píxeles cuadrados, entre la caja de `control` y la de la tuerca (0 si no se tocan o no se ven). */
async function cruceConLaTuerca(page: Page, control: Locator): Promise<number> {
  const a = await control.boundingBox();
  const t = await tuerca(page).boundingBox();
  if (!a || !t) return 0;
  const ancho = Math.min(a.x + a.width, t.x + t.width) - Math.max(a.x, t.x);
  const alto = Math.min(a.y + a.height, t.y + t.height) - Math.max(a.y, t.y);
  return ancho > 0 && alto > 0 ? Math.round(ancho * alto) : 0;
}

/**
 * Lote 35 (PBI-0249): con la página desplazada hasta el final, ningún botón, enlace ni campo de `main` queda bajo la
 * tuerca. `nombre` dice qué página se midió; cada cruce se informa con el nombre del control.
 */
export async function sinNadaBajoLaTuercaAlFinal(page: Page, nombre: string): Promise<void> {
  await expect(tuerca(page), nombre).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() =>
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
  );
  const principal = page.getByRole('main');
  let medidos = 0;
  for (const rol of ['button', 'link', 'textbox', 'checkbox', 'combobox'] as const) {
    for (const control of await principal.getByRole(rol).all()) {
      const etiqueta = (await control.getAttribute('aria-label')) ?? (await control.innerText()).trim();
      expect(await cruceConLaTuerca(page, control), `${nombre}: ${rol} «${etiqueta}» bajo la tuerca`).toBe(0);
      medidos++;
    }
  }
  expect(medidos, `${nombre}: la página tiene controles`).toBeGreaterThan(0);
}
