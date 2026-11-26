import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';

import { botonMenuUsuario, urls } from './entorno';

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
 * Lote 35 (PBI-0249): en cada posición de desplazamiento (arriba, a la mitad y al final), ningún botón, enlace ni
 * campo de `main` queda bajo la tuerca. `nombre` dice qué página se midió; cada cruce se informa con el nombre del
 * control y la posición.
 */
export async function sinNadaBajoLaTuerca(page: Page, nombre: string): Promise<void> {
  await expect(tuerca(page), nombre).toBeVisible();
  await page.waitForLoadState('networkidle');
  const principal = page.getByRole('main');
  for (const posicion of ['arriba', 'a la mitad', 'al final'] as const) {
    await page.evaluate((donde) => {
      const maximo = document.documentElement.scrollHeight - window.innerHeight;
      const top = donde === 'arriba' ? 0 : donde === 'a la mitad' ? maximo / 2 : maximo;
      window.scrollTo({ top, behavior: 'instant' });
    }, posicion);
    let medidos = 0;
    for (const rol of ['button', 'link', 'textbox', 'checkbox', 'combobox'] as const) {
      for (const control of await principal.getByRole(rol).all()) {
        const etiqueta = (await control.getAttribute('aria-label')) ?? (await control.innerText()).trim();
        expect(
          await cruceConLaTuerca(page, control),
          `${nombre}, ${posicion}: ${rol} «${etiqueta}» bajo la tuerca`,
        ).toBe(0);
        medidos++;
      }
    }
    expect(medidos, `${nombre}: la página tiene controles`).toBeGreaterThan(0);
  }
}

/** La caja de un control que se ve. */
async function caja(control: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const c = await control.boundingBox();
  expect(c, 'el control se ve').not.toBeNull();
  return c!;
}

/**
 * Lote 35 (PBI-0249): en el panel, la tuerca vive en la barra superior (`banner`), a la izquierda de la campana, y
 * ninguno de sus ancestros es `position: fixed`. A este ancho, la tuerca, la campana y el menú de usuario van en la
 * misma línea, caben en la ventana y la página no se desplaza en horizontal.
 */
export async function tuercaEnLaBarra(page: Page, nombre: string): Promise<void> {
  const enLaBarra = page.getByRole('banner').getByRole('button', { name: 'Cambiar tema' });
  await expect(enLaBarra, `${nombre}: la tuerca está en la barra`).toBeVisible();
  expect(
    await enLaBarra.evaluate((el) => {
      for (let nodo: Element | null = el; nodo; nodo = nodo.parentElement) {
        if (getComputedStyle(nodo).position === 'fixed') return true;
      }
      return false;
    }),
    `${nombre}: la tuerca no flota`,
  ).toBe(false);

  const t = await caja(enLaBarra);
  const campana = await caja(page.getByRole('button', { name: /^Notificaciones/ }));
  const usuario = await caja(botonMenuUsuario(page));
  expect(t.x + t.width, `${nombre}: la tuerca queda a la izquierda de la campana`).toBeLessThanOrEqual(
    campana.x + 0.5,
  );
  const centro = (c: { y: number; height: number }) => c.y + c.height / 2;
  const texto = await caja(page.getByRole('banner').getByText('Backoffice de la tienda'));
  expect(
    Math.abs(centro(texto) - centro(t)),
    `${nombre}: el texto de la barra y la tuerca en la misma línea`,
  ).toBeLessThan(2);
  expect(Math.abs(centro(t) - centro(campana)), `${nombre}: tuerca y campana en la misma línea`).toBeLessThan(
    2,
  );
  expect(
    Math.abs(centro(usuario) - centro(campana)),
    `${nombre}: campana y usuario en la misma línea`,
  ).toBeLessThan(2);
  const ventana = page.viewportSize()!;
  expect(usuario.x + usuario.width, `${nombre}: la barra cabe en la ventana`).toBeLessThanOrEqual(
    ventana.width,
  );
  expect(t.x, `${nombre}: la tuerca no sale por la izquierda`).toBeGreaterThanOrEqual(0);
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde, `${nombre}: sin desplazamiento horizontal`).toBeLessThanOrEqual(0);
}

/**
 * Ningún punto de la caja de `control` (esquinas hacia dentro y centro) es la tuerca: la tuerca no queda sobre él. Sirve
 * para una capa que se abre por encima de la barra, como el panel del menú en pantallas estrechas.
 */
export async function sinTuercaSobre(page: Page, control: Locator, nombre: string): Promise<void> {
  await expect(control, nombre).toBeVisible();
  const c = await control.boundingBox();
  expect(c, nombre).not.toBeNull();
  const puntos = [0.1, 0.5, 0.9].flatMap((fx) =>
    [0.1, 0.5, 0.9].map((fy) => [c!.x + c!.width * fx, c!.y + c!.height * fy]),
  );
  const encima = await page.evaluate(
    (lista) =>
      lista.filter(([x, y]) => document.elementFromPoint(x, y)?.closest('ws-admin-selector-tema') !== null)
        .length,
    puntos,
  );
  expect(encima, `${nombre}: puntos cubiertos por la tuerca`).toBe(0);
}
