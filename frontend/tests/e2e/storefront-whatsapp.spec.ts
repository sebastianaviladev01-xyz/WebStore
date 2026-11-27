import { expect, request as nuevoRequest, test, type Locator, type Page } from '@playwright/test';

import { enviarCambios } from './apoyo/catalogo';
import { activarTema, fondoDe, relacionDeContraste, restablecerTemas, TEMAS } from './apoyo/contraste';
import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';

/**
 * Lote 49 (ADR-0035), PBI-0241: el acceso a WhatsApp de la tienda, decidido por Sebastián Avila el 2026-11-27.
 * - Sin número no hay botón (la semilla no trae ninguno).
 * - El Admin guarda el número y el mensaje en Contenido › WhatsApp; la tienda muestra el botón con el `href` exacto de
 *   `wa.me`, en otra pestaña y con `rel="noopener noreferrer"`. Un número sin código de país muestra el error.
 * - No aparece en el checkout, queda por debajo del menú lateral y no tapa ningún control a 375 ni a 1440 px.
 * - Se lee con A, B y C: el ícono contra el círculo y el círculo contra el fondo, al menos 3:1 (WCAG 1.4.11).
 * El número se siembra por la API del Admin y se quita al terminar cada prueba.
 */

const NUMERO = '51987654321';
const MENSAJE = 'Hola, tengo una consulta sobre un producto';
const HREF = `https://wa.me/${NUMERO}?text=${encodeURIComponent(MENSAJE)}`;

const botonWhatsapp = (page: Page) => page.getByRole('link', { name: /^Escríbenos por WhatsApp/ });

const conWhatsapp = (numero = NUMERO, mensaje = MENSAJE) =>
  enviarCambios({ config: { whatsappNumber: numero, whatsappMessage: mensaje } });
const sinWhatsapp = () => enviarCambios({ config: { whatsappNumber: '', whatsappMessage: '' } });

interface ProductoPublico {
  id: string;
  slug: string;
  stock: number;
}

async function productoConStock(): Promise<ProductoPublico> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const productos = (await (await api.get('/bff/catalog/products')).json()) as ProductoPublico[];
    return productos.find((producto) => producto.stock > 0)!;
  } finally {
    await api.dispose();
  }
}

/** Cruce, en píxeles cuadrados, entre la caja de `control` y la del botón (0 si no se tocan o no se ven). */
async function cruce(control: Locator, boton: Locator): Promise<number> {
  const a = await control.boundingBox();
  const b = await boton.boundingBox();
  if (!a || !b || a.width === 0 || a.height === 0) return 0;
  const ancho = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const alto = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return ancho > 0 && alto > 0 ? Math.round(ancho * alto) : 0;
}

/** El control vive en un elemento fijo o pegado (la cabecera, la barra de compra de la ficha): no se aparta al desplazarse. */
const esFijo = (control: Locator) =>
  control.evaluate((el) => {
    for (let nodo: Element | null = el; nodo; nodo = nodo.parentElement) {
      const posicion = getComputedStyle(nodo).position;
      if (posicion === 'fixed' || posicion === 'sticky') return true;
    }
    return false;
  });

/**
 * El botón de WhatsApp no tapa ningún control:
 * - arriba de la página, ninguno de los que no se apartan al desplazarse (los fijos o pegados, como la barra de compra de
 *   la ficha a 375 px);
 * - al final de la página, ninguno: es donde terminan las páginas cortas y lo último que se alcanza.
 * A media página, lo que está en el flujo pasa por debajo al desplazarse, como con cualquier botón flotante, y se aparta
 * con un desplazamiento; un campo a todo el ancho del celular siempre se puede tocar fuera del círculo.
 */
async function sinNadaBajoWhatsapp(page: Page, nombre: string): Promise<void> {
  const boton = botonWhatsapp(page);
  await expect(boton, nombre).toBeVisible();
  await page.waitForLoadState('networkidle');
  for (const posicion of ['arriba', 'al final'] as const) {
    await page.evaluate((donde) => {
      const maximo = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: donde === 'arriba' ? 0 : maximo, behavior: 'instant' });
    }, posicion);
    // El botón sube sobre la barra fija de la ficha en el cuadro siguiente al desplazamiento.
    await page.evaluate(
      () => new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo))),
    );
    let medidos = 0;
    for (const rol of ['button', 'link', 'textbox', 'checkbox', 'combobox', 'spinbutton'] as const) {
      for (const control of await page.getByRole(rol).all()) {
        if (!(await control.isVisible())) continue;
        const etiqueta = (await control.getAttribute('aria-label')) ?? (await control.innerText()).trim();
        if (/^Escríbenos por WhatsApp/.test(etiqueta)) continue;
        if (posicion === 'arriba' && !(await esFijo(control))) continue;
        expect(
          await cruce(control, boton),
          `${nombre}, ${posicion}: ${rol} «${etiqueta}» bajo WhatsApp`,
        ).toBe(0);
        medidos++;
      }
    }
    expect(medidos, `${nombre}, ${posicion}: la página tiene controles`).toBeGreaterThan(0);
  }
}

test.describe('PBI-0241: acceso a WhatsApp de la tienda', () => {
  test.afterEach(() => sinWhatsapp());

  test('sin número no hay botón', async ({ page }) => {
    await sinWhatsapp();
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Ir al inicio' })).toBeVisible();
    await expect(botonWhatsapp(page)).toHaveCount(0);
  });

  test('el Admin guarda número y mensaje, y la tienda abre wa.me en otra pestaña', async ({ page }) => {
    await sinWhatsapp();
    await ingresarAlAdmin(page, cuentasAdmin.superadmin, urls.admin);
    await page.goto(`${urls.admin}/contenido`);
    const seccion = page.getByRole('group', { name: 'WhatsApp' });
    await expect(seccion.getByRole('link', { name: /Probar/ })).toHaveCount(0);
    await seccion.getByRole('textbox', { name: 'Número de WhatsApp' }).fill('+51 987 654 321');
    await seccion.getByRole('textbox', { name: 'Mensaje inicial' }).fill(`  ${MENSAJE}  `);
    // «Probar» abre el mismo enlace que tendrá la tienda.
    const probar = seccion.getByRole('link', { name: /Probar/ });
    await expect(probar).toHaveAttribute('href', HREF);
    await expect(probar).toHaveAttribute('target', '_blank');
    await expect(probar).toHaveAttribute('rel', 'noopener noreferrer');
    await page.getByRole('button', { name: 'Guardar configuración' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Configuración publicada en la tienda.' }),
    ).toBeVisible();
    // El BFF guarda solo los dígitos: al recargar, el campo los muestra.
    await page.reload();
    await expect(
      page.getByRole('group', { name: 'WhatsApp' }).getByRole('textbox', { name: 'Número de WhatsApp' }),
    ).toHaveValue(NUMERO);

    await page.goto('/');
    const boton = botonWhatsapp(page);
    await expect(boton).toHaveAccessibleName('Escríbenos por WhatsApp (se abre en otra pestaña)');
    await expect(boton).toHaveAttribute('href', HREF);
    await expect(boton).toHaveAttribute('target', '_blank');
    await expect(boton).toHaveAttribute('rel', 'noopener noreferrer');
    // Abajo a la derecha, a 24 px de los bordes en el escritorio, y con 56 px de lado.
    const caja = (await boton.boundingBox())!;
    const ventana = page.viewportSize()!;
    expect(Math.round(caja.width)).toBe(56);
    expect(Math.round(caja.height)).toBe(56);
    expect(Math.round(ventana.width - (caja.x + caja.width))).toBe(24);
    expect(Math.round(ventana.height - (caja.y + caja.height))).toBe(24);
    // Con el teclado, el foco lleva el anillo del tema.
    await boton.focus();
    const anillo = await boton.evaluate((el) => {
      const estilo = getComputedStyle(el);
      return { estilo: estilo.outlineStyle, ancho: estilo.outlineWidth };
    });
    expect(anillo.estilo).toBe('solid');
    expect(anillo.ancho).toBe('2px');
  });

  test('sin mensaje, el enlace es solo el número', async ({ page }) => {
    await conWhatsapp(NUMERO, '');
    await page.goto('/');
    await expect(botonWhatsapp(page)).toHaveAttribute('href', `https://wa.me/${NUMERO}`);
  });

  test('un número sin código de país muestra el error y no se guarda', async ({ page }) => {
    await sinWhatsapp();
    await ingresarAlAdmin(page, cuentasAdmin.superadmin, urls.admin);
    await page.goto(`${urls.admin}/contenido`);
    const seccion = page.getByRole('group', { name: 'WhatsApp' });
    const numero = seccion.getByRole('textbox', { name: 'Número de WhatsApp' });
    await numero.fill('987 654 321');
    await numero.blur();
    await expect(seccion.getByText('Falta el código de país: escribe el 51 delante')).toBeVisible();
    await expect(seccion.getByRole('link', { name: /Probar/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Guardar configuración' }).click();
    await expect(numero).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Configuración publicada en la tienda.')).toHaveCount(0);
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Ir al inicio' })).toBeVisible();
    await expect(botonWhatsapp(page)).toHaveCount(0);
  });

  test('no aparece en el checkout, y vuelve al salir de él', async ({ page }) => {
    await conWhatsapp();
    const producto = await productoConStock();
    await page.addInitScript((id) => {
      window.localStorage.setItem('webstore-cart-v1', JSON.stringify([{ productId: id, quantity: 1 }]));
    }, producto.id);
    await page.goto('/carrito');
    await expect(botonWhatsapp(page)).toBeVisible();
    await page.goto('/checkout');
    await expect(page.getByRole('button', { name: /Finalizar compra/ })).toBeVisible();
    await expect(botonWhatsapp(page)).toHaveCount(0);
    await page.goBack();
    await expect(botonWhatsapp(page)).toBeVisible();
  });

  test('a 375 px queda por debajo del menú lateral y de su fondo', async ({ page }) => {
    await conWhatsapp();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const boton = botonWhatsapp(page);
    await expect(boton).toBeVisible();
    await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const caja = (await boton.boundingBox())!;
    const encima = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x!, y!)?.closest('.ws-whatsapp') !== null,
      [caja.x + caja.width / 2, caja.y + caja.height / 2],
    );
    expect(encima, 'el botón no se ve sobre el menú ni su fondo').toBe(false);
  });

  for (const ancho of [
    { width: 375, height: 812 },
    { width: 1440, height: 900 },
  ])
    test(`a ${ancho.width} px no tapa ningún control, tampoco la barra de compra de la ficha`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await conWhatsapp();
      const producto = await productoConStock();
      await page.setViewportSize(ancho);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const ruta of [
        '/',
        '/catalogo',
        `/catalogo/${producto.slug}`,
        '/carrito',
        '/comparar',
        '/pedidos',
        '/info/contacto',
        '/libro-reclamaciones',
        '/cuenta/login',
      ]) {
        await page.goto(ruta);
        await sinNadaBajoWhatsapp(page, `${ruta} a ${ancho.width} px`);
      }
    });

  test.describe('contraste con los temas', () => {
    test.afterAll(() => restablecerTemas());

    for (const tema of TEMAS)
      test(`con ${tema.toUpperCase()}, el ícono y el círculo se distinguen (3:1)`, async ({ page }) => {
        await conWhatsapp();
        await activarTema(tema);
        await page.goto('/');
        const boton = botonWhatsapp(page);
        await expect(boton).toBeVisible();
        const { circulo, icono } = await boton.evaluate((el) => ({
          circulo: getComputedStyle(el).backgroundColor,
          icono: getComputedStyle(el.querySelector('svg')!).color,
        }));
        const fondo = await fondoDe(page.locator('body'));
        const lienzo = await fondoDe(page.getByRole('main'));
        expect(
          relacionDeContraste(icono, circulo),
          `ícono contra el círculo (${icono} / ${circulo})`,
        ).toBeGreaterThanOrEqual(3);
        for (const [nombre, color] of [
          ['el fondo de la página', fondo],
          ['el lienzo de la tienda', lienzo],
        ] as const)
          expect(
            relacionDeContraste(circulo, color),
            `círculo contra ${nombre} con ${tema.toUpperCase()} (${circulo} / ${color})`,
          ).toBeGreaterThanOrEqual(3);
      });
  });
});
