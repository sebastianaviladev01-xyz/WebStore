import { expect, test, type Locator, type Page } from '@playwright/test';

import { cantidadEnCarrito, enlaceDelCarrito, urls } from './apoyo/entorno';
import { COOKIE_VISTA_PREVIA, PRIMARIO, primario } from './apoyo/modo-demo';

/**
 * Carrito: confirmación al agregar, cambio de cantidad, totales con valor de venta e IGV explícitos, persistencia
 * al recargar y eliminación. Feature 004 (D1): el diálogo ofrece solo «Seguir comprando» y «Ver carrito», el
 * principal (TEST-09), y el enlace del resumen que lleva al checkout dice «Confirmar pedido» (TEST-10).
 */
function fila(page: Page, nombre: string) {
  return page.getByRole('main').getByRole('article').filter({ hasText: nombre });
}

function resumen(page: Page, concepto: string) {
  // Cada concepto del resumen y su monto comparten un contenedor.
  return page.getByRole('main').getByText(concepto, { exact: true }).locator('..');
}

/** `--ws-primary` del tema activo, resuelto a `rgb(...)` como lo devuelve `getComputedStyle`. */
function fondoPrincipal(page: Page): Promise<string> {
  return page.evaluate(() => {
    const muestra = document.createElement('div');
    muestra.style.background = 'var(--ws-primary)';
    document.body.appendChild(muestra);
    const color = getComputedStyle(muestra).backgroundColor;
    muestra.remove();
    return color;
  });
}

const fondo = (control: Locator) => control.evaluate((el) => getComputedStyle(el).backgroundColor);

/** AC-01: «Producto agregado» con solo dos botones, en este orden, y «Ver carrito» con el fondo del principal. */
async function esperarDialogoDeDosBotones(page: Page): Promise<Locator> {
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByRole('heading', { name: 'Producto agregado' })).toBeVisible();
  await expect(dialogo.getByRole('button')).toHaveText(['Seguir comprando', 'Ver carrito']);
  await expect(dialogo.getByRole('button', { name: 'Finalizar compra' })).toHaveCount(0);

  const principal = await fondoPrincipal(page);
  expect(await fondo(dialogo.getByRole('button', { name: 'Ver carrito' }))).toBe(principal);
  expect(await fondo(dialogo.getByRole('button', { name: 'Seguir comprando' }))).not.toBe(principal);
  return dialogo;
}

test('agregar desde el catálogo, cambiar la cantidad y ver los totales con IGV', async ({ page }) => {
  await page.goto('/catalogo');
  await fila(page, 'Soundbar Cinema 500').getByRole('button', { name: 'Agregar al carrito' }).click();

  const dialogo = await esperarDialogoDeDosBotones(page);
  await dialogo.getByRole('button', { name: 'Ver carrito' }).click();

  await expect(page).toHaveURL('/carrito');
  await expect(fila(page, 'Soundbar Cinema 500')).toBeVisible();
  await expect(resumen(page, 'Subtotal con IGV')).toContainText('S/ 699.00');

  await page.getByRole('button', { name: 'Aumentar cantidad de Soundbar Cinema 500' }).click();
  await expect(fila(page, 'Soundbar Cinema 500')).toContainText('S/ 1,398.00');
  // 1398 / 1.18 = 1184.75 de valor de venta y 213.25 de IGV.
  await expect(resumen(page, 'Valor de venta')).toContainText('S/ 1,184.75');
  await expect(resumen(page, 'IGV (18%)')).toContainText('S/ 213.25');
  await expect(resumen(page, 'Subtotal con IGV')).toContainText('S/ 1,398.00');
  await expect(resumen(page, 'Envío')).toContainText('Se calcula al elegir el distrito');

  await page.reload();
  await expect(fila(page, 'Soundbar Cinema 500')).toContainText('S/ 1,398.00');

  await page.getByRole('button', { name: 'Reducir cantidad de Soundbar Cinema 500' }).click();
  await expect(resumen(page, 'Subtotal con IGV')).toContainText('S/ 699.00');

  await fila(page, 'Soundbar Cinema 500').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu carrito está vacío' })).toBeVisible();
});

test('agregar desde la ficha con cantidad y seguir comprando', async ({ page }) => {
  await page.goto('/catalogo/oled-vision-55-4k');
  await page.getByRole('button', { name: 'Aumentar cantidad' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Seguir comprando' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('banner').getByRole('link', { name: 'Carrito' }).click();
  await expect(fila(page, 'OLED Vision 55” 4K')).toContainText('S/ 6,598.00');
});

test('TEST-09: en la ficha, «Seguir comprando» y Escape cierran el diálogo y «Ver carrito» lleva al carrito', async ({
  page,
}) => {
  const ficha = '/catalogo/soundbar-cinema-500';
  const agregar = page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' });
  const contador = enlaceDelCarrito(page);
  await page.goto(ficha);

  // «Seguir comprando»: se cierra, la página no cambia y el contador muestra el producto.
  await agregar.click();
  let dialogo = await esperarDialogoDeDosBotones(page);
  await dialogo.getByRole('button', { name: 'Seguir comprando' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(ficha);
  await expect(contador).toHaveText(cantidadEnCarrito(1));

  // Escape equivale a «Seguir comprando».
  await agregar.click();
  await esperarDialogoDeDosBotones(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(ficha);
  await expect(contador).toHaveText(cantidadEnCarrito(2));

  // «Ver carrito»: llega a /carrito con el producto y su cantidad.
  await agregar.click();
  dialogo = await esperarDialogoDeDosBotones(page);
  await dialogo.getByRole('button', { name: 'Ver carrito' }).click();
  await expect(page).toHaveURL('/carrito');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(fila(page, 'Soundbar Cinema 500')).toContainText('S/ 2,097.00');
  await expect(fila(page, 'Soundbar Cinema 500').locator('[aria-live="polite"]')).toHaveText('3');
});

test('TEST-09: a 375 px los dos botones del diálogo caben sin desborde', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/catalogo/soundbar-cinema-500');
  await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
  const dialogo = await esperarDialogoDeDosBotones(page);

  const caja = (await dialogo.boundingBox())!;
  expect(caja.x).toBeGreaterThanOrEqual(0);
  expect(caja.x + caja.width).toBeLessThanOrEqual(375);
  const seguir = (await dialogo.getByRole('button', { name: 'Seguir comprando' }).boundingBox())!;
  const ver = (await dialogo.getByRole('button', { name: 'Ver carrito' }).boundingBox())!;
  for (const boton of [seguir, ver]) {
    expect(boton.x).toBeGreaterThanOrEqual(caja.x);
    expect(boton.x + boton.width).toBeLessThanOrEqual(caja.x + caja.width);
  }
  // No se montan: «Ver carrito» va a la derecha de «Seguir comprando» o debajo.
  expect(ver.x >= seguir.x + seguir.width || ver.y >= seguir.y + seguir.height).toBe(true);
  // Ni el texto de los botones se corta ni la página se desborda.
  for (const nombre of ['Seguir comprando', 'Ver carrito']) {
    const boton = dialogo.getByRole('button', { name: nombre });
    expect(await boton.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('TEST-09: con C, «Ver carrito» lleva los colores del principal y se lee (AA)', async ({
  page,
  context,
}) => {
  // Vista previa de C solo en este navegador (modo demo): el tema activo del BFF sigue siendo B.
  await context.addCookies([{ name: COOKIE_VISTA_PREVIA, value: 'c', url: urls.storefront }]);
  await page.goto('/catalogo/soundbar-cinema-500');
  await expect.poll(() => primario(page)).toBe(PRIMARIO.c);
  await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
  const dialogo = await esperarDialogoDeDosBotones(page);

  // Con C, el enlace (`--ws-link`) y el texto sobre el principal (`--ws-on-primary`) son el mismo gris oscuro: el
  // botón relleno no puede tomar su fondo del enlace.
  const medida = await dialogo.getByRole('button', { name: 'Ver carrito' }).evaluate((el) => {
    const resolver = (valor: string) => {
      const muestra = document.createElement('div');
      muestra.style.color = valor;
      document.body.appendChild(muestra);
      const color = getComputedStyle(muestra).color;
      muestra.remove();
      return color;
    };
    const canales = (color: string) =>
      color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminancia = (color: string) => {
      const [r, g, b] = canales(color).map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const { color, backgroundColor } = getComputedStyle(el);
    const [clara, oscura] = [luminancia(color), luminancia(backgroundColor)].sort((a, b) => b - a);
    return {
      texto: color,
      fondo: backgroundColor,
      onPrimary: resolver('var(--ws-on-primary)'),
      primary: resolver('var(--ws-primary)'),
      contraste: (clara + 0.05) / (oscura + 0.05),
    };
  });
  expect(medida.fondo).toBe(medida.primary);
  expect(medida.texto).toBe(medida.onPrimary);
  expect(medida.contraste).toBeGreaterThanOrEqual(4.5);
});

test('TEST-10: el carrito lleva al checkout con «Confirmar pedido»', async ({ page }) => {
  await page.goto('/catalogo/soundbar-cinema-500');
  await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ver carrito' }).click();
  await expect(page).toHaveURL('/carrito');

  const main = page.getByRole('main');
  const confirmar = main.getByRole('link', { name: 'Confirmar pedido' });
  const seguir = main.getByRole('link', { name: 'Seguir comprando' });
  await expect(confirmar).toHaveAttribute('href', '/checkout');
  await expect(seguir).toBeVisible();
  // «Seguir comprando» sigue debajo del botón principal.
  expect((await seguir.boundingBox())!.y).toBeGreaterThan((await confirmar.boundingBox())!.y);
  await expect(main).not.toContainText('Continuar al checkout');
  await expect(main).not.toContainText('Finalizar compra');

  await confirmar.click();
  await expect(page).toHaveURL('/checkout');
});
