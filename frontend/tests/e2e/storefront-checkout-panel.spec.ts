import { expect, request as nuevoRequest, test, type Locator, type Page } from '@playwright/test';

import { cuentasAdmin, urls } from './apoyo/entorno';

/**
 * Panel y campos del checkout (feature 004, D4 y D5). TEST-12 (AC-08, AC-09, AC-10, AC-12): los tres pasos van
 * en un solo `.ws-checkout-panel` con el aspecto del resumen del pedido, a su izquierda en escritorio y encima en
 * móvil; los campos tienen contorno sin relleno, con el foco el contorno pasa a `--ws-focus-ring` y a 2 px, e
 * inválidos y tocados usan el color de error; el orden de Tab es el de siempre. Con A, B y C, los colores son los
 * del tema. TEST-13 (AC-09, AC-10): la etiqueta sube con la transición de Material (200 ms o menos) y, con
 * `prefers-reduced-motion`, sin transición. Las pruebas solo leen el contorno que dibuja Material
 * (`.mdc-notched-outline__leading`); los estilos lo fijan con sus tokens, nunca con esas clases (STD-04).
 */
const FICHA = '/catalogo/soundbar-cinema-500';
const PASOS = ['1. Datos del cliente', '2. Entrega', '3. Método de pago'];
const SIN_RELLENO = 'rgba(0, 0, 0, 0)';

async function activarTema(themeId: string): Promise<void> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const sesion = await api.post('/bff/admin/sessions', {
      data: { email: cuentasAdmin.superadmin.email, password: cuentasAdmin.superadmin.password },
    });
    expect(sesion.ok()).toBe(true);
    const headers = { authorization: `Bearer ${(await sesion.json()).token}` };
    const { revision } = await (await api.get('/bff/admin/themes', { headers })).json();
    const activado = await api.put('/bff/admin/active-theme', { headers, data: { revision, themeId } });
    expect(activado.ok()).toBe(true);
  } finally {
    await api.dispose();
  }
}

async function abrirCheckout(page: Page): Promise<void> {
  await page.goto(FICHA);
  await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Seguir comprando' }).click();
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { level: 1, name: 'Finalizar compra', exact: true })).toBeVisible();
}

/** Color calculado de un token del tema, en el formato de `getComputedStyle` (`rgb(…)`). */
function colorDelToken(page: Page, token: string): Promise<string> {
  return page.evaluate((nombre) => {
    const sonda = document.createElement('div');
    sonda.style.color = `var(${nombre})`;
    document.body.append(sonda);
    const color = getComputedStyle(sonda).color;
    sonda.remove();
    return color;
  }, token);
}

const campo = (page: Page, etiqueta: string): Locator =>
  page.locator('mat-form-field').filter({ has: page.locator('mat-label', { hasText: etiqueta }) });

function contorno(campoDelForm: Locator) {
  return campoDelForm.locator('.mdc-notched-outline__leading').evaluate((borde) => {
    const estilo = getComputedStyle(borde);
    const relleno = borde.closest('.mdc-text-field');
    return {
      color: estilo.borderTopColor,
      grosor: estilo.borderTopWidth,
      relleno: relleno ? getComputedStyle(relleno).backgroundColor : null,
    };
  });
}

/** Duración más larga de la transición de la etiqueta del campo, en milisegundos. */
function transicionDeLaEtiqueta(campoDelForm: Locator): Promise<number> {
  return campoDelForm.locator('mat-label').evaluate((etiqueta) => {
    const duraciones = getComputedStyle(etiqueta.closest('label') ?? etiqueta)
      .transitionDuration.split(',')
      .map((d) => (d.trim().endsWith('ms') ? parseFloat(d) : parseFloat(d) * 1000));
    return Math.max(...duraciones);
  });
}

async function revisarPanelYCampos(page: Page): Promise<void> {
  const panel = page.locator('.ws-checkout-panel');
  await expect(panel).toHaveCount(1);
  await expect(panel.getByRole('heading', { level: 2 })).toHaveText(PASOS);

  const [superficie, borde, bordeFuerte, foco, error] = await Promise.all(
    ['--ws-surface', '--ws-border', '--ws-border-strong', '--ws-focus-ring', '--ws-danger'].map((t) =>
      colorDelToken(page, t),
    ),
  );
  await expect(panel).toHaveCSS('background-color', superficie);
  await expect(panel).toHaveCSS('border-top-color', borde);
  await expect(panel).toHaveCSS('border-top-width', '1px');
  await expect(panel).toHaveCSS('border-top-left-radius', '14px');

  // En reposo: contorno fino de --ws-border-strong y sin relleno, en los diez campos.
  const campos = page.locator('.ws-checkout-panel mat-form-field');
  await expect(campos).toHaveCount(10);
  for (const unCampo of await campos.all()) {
    expect(await contorno(unCampo)).toEqual({ color: bordeFuerte, grosor: '1px', relleno: SIN_RELLENO });
  }

  // Con el foco por clic y por Tab: contorno de --ws-focus-ring y de 2 px. «Provincia» y «Departamento» vienen
  // rellenos y son válidos, así que al salir vuelven al contorno de reposo y no al de error.
  await page.getByRole('textbox', { name: 'Provincia' }).click();
  await expect.poll(() => contorno(campo(page, 'Provincia'))).toMatchObject({ color: foco, grosor: '2px' });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Departamento' })).toBeFocused();
  await expect
    .poll(() => contorno(campo(page, 'Departamento')))
    .toMatchObject({ color: foco, grosor: '2px' });
  // Con el ratón encima, Material pinta el contorno con el color del texto: se aparta para ver el reposo.
  await page.mouse.move(0, 0);
  await expect
    .poll(() => contorno(campo(page, 'Provincia')))
    .toMatchObject({ color: bordeFuerte, grosor: '1px' });

  // Inválido y tocado: contorno y mensaje en el color de error.
  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).focus();
  await page.keyboard.press('Tab');
  const nombres = campo(page, 'Nombres y apellidos');
  await expect(nombres.getByText('Ingresa al menos 3 caracteres.')).toBeVisible();
  await expect(nombres.locator('mat-error')).toHaveCSS('color', error);
  await expect.poll(async () => (await contorno(nombres)).color).toBe(error);
}

test.describe('panel y campos del checkout con cada tema', () => {
  test.afterAll(async () => {
    await activarTema('b');
  });

  for (const tema of ['a', 'b', 'c'] as const) {
    test(`un solo panel junto al resumen y campos con contorno (${tema.toUpperCase()}, 1440 px)`, async ({
      page,
    }) => {
      await activarTema(tema);
      await abrirCheckout(page);
      await revisarPanelYCampos(page);

      const panel = page.locator('.ws-checkout-panel');
      await expect(panel).toHaveCSS('padding-top', '28px');
      await expect(panel).toHaveCSS('padding-left', '28px');
      const cajaPanel = (await panel.boundingBox())!;
      const cajaResumen = (await page.locator('.ws-order-summary').boundingBox())!;
      expect(cajaPanel.x + cajaPanel.width).toBeLessThanOrEqual(cajaResumen.x);
      expect(Math.abs(cajaPanel.y - cajaResumen.y)).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('en móvil', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('el panel va encima del resumen, con 22 px de relleno y sin desborde', async ({ page }) => {
    await abrirCheckout(page);
    await revisarPanelYCampos(page);

    const panel = page.locator('.ws-checkout-panel');
    await expect(panel).toHaveCSS('padding-top', '22px');
    await expect(panel).toHaveCSS('padding-left', '22px');
    const cajaPanel = (await panel.boundingBox())!;
    const cajaResumen = (await page.locator('.ws-order-summary').boundingBox())!;
    expect(cajaPanel.y + cajaPanel.height).toBeLessThanOrEqual(cajaResumen.y);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });
});

test('el Tab recorre los campos, el método de pago y los botones en el orden de siempre', async ({
  page,
}) => {
  await abrirCheckout(page);
  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).focus();

  const recorrido: string[] = [];
  for (let i = 0; i < 20 && recorrido.at(-1) !== 'Volver al carrito'; i++) {
    const actual = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return (
        el.getAttribute('formcontrolname') ??
        el.closest('mat-select')?.getAttribute('formcontrolname') ??
        (el.closest('mat-radio-button')
          ? `pago:${el.closest('mat-radio-button')!.getAttribute('value')}`
          : null) ??
        el.textContent?.trim() ??
        el.tagName
      );
    });
    if (recorrido.at(-1) !== actual) recorrido.push(actual);
    await page.keyboard.press('Tab');
  }
  // «Finalizar compra» está deshabilitado sin envío cotizado, así que el Tab lo salta.
  expect(recorrido).toEqual([
    'fullName',
    'email',
    'phone',
    'document',
    'district',
    'addressLine',
    'province',
    'department',
    'deliveryDate',
    'reference',
    'pago:card',
    'Volver al carrito',
  ]);
});

test.describe('transición de la etiqueta', () => {
  // Material activa las transiciones del campo 300 ms después de crearlo (`ngAfterViewInit`): antes, ningún
  // campo tiene transición. Por eso se espera a que aparezca y, con movimiento reducido, se deja pasar ese plazo.
  const ACTIVACION_DE_MATERIAL_MS = 300;

  test('sube al borde en 200 ms o menos', async ({ page }) => {
    await abrirCheckout(page);
    await page.getByRole('textbox', { name: 'Correo' }).focus();
    const correo = campo(page, 'Correo');
    await expect.poll(() => transicionDeLaEtiqueta(correo)).toBeGreaterThanOrEqual(1);
    expect(await transicionDeLaEtiqueta(correo)).toBeLessThanOrEqual(200);
  });

  test.describe('con movimiento reducido', () => {
    // Material decide al cargar si hay movimiento reducido: la preferencia se fija antes de abrir la página.
    test.use({ reducedMotion: 'reduce' });

    test('no hay transición', async ({ page }) => {
      await abrirCheckout(page);
      await page.getByRole('textbox', { name: 'Correo' }).focus();
      await page.waitForTimeout(ACTIVACION_DE_MATERIAL_MS + 200);
      // `styles.css` deja toda transición en 0.01 ms con movimiento reducido: a efectos prácticos, ninguna.
      expect(await transicionDeLaEtiqueta(campo(page, 'Correo'))).toBeLessThan(1);
    });
  });
});
