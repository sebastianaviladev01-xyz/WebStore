import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  MINIMO,
  TEMAS,
  activarTema,
  anotar,
  colorDelToken,
  exigir,
  fondoEfectivo,
  restablecerTemas,
} from './apoyo/contraste';
import { correoUnico } from './apoyo/entorno';
import { conservarElStock } from './apoyo/pedidos';

// Los pedidos que crea esta spec se cancelan al terminar: el stock queda como estaba (PBI-0207).
conservarElStock();

/**
 * Enlaces de la tienda con los temas (feature 005, D1). La regla `a { color: inherit; text-decoration: none; }`
 * va en la capa base, así que las utilidades de color y de subrayado de un enlace se aplican.
 * - TEST-08 (AC-01): a 375 px, con A, B y C, «Ver todos los productos» del cajón móvil tiene el texto de
 *   `--ws-on-primary` sobre `--ws-primary`, a 4.5:1 o más.
 * - TEST-09 (AC-02, AC-07): con B, los enlaces de «Enlaces afectados por D1» del plan, en reposo y al pasar el
 *   puntero, muestran el color y el subrayado que declaran (el 10, «Seguimiento de pedidos», solo estaba en
 *   `/inicio-anterior`, que se quitó en el lote 16, PBI-0193), y «Olvidé mi contraseña», que no declara nada,
 *   sigue con el color del texto que lo rodea y sin subrayado.
 * Las pruebas solo leen con `getComputedStyle` y localizan cada enlace por su rol y su nombre. Al terminar, B
 * queda activo.
 */

interface MedidaDeEnlace {
  /** Color del texto del enlace. */
  color: string;
  /** Fondo efectivo detrás del texto. */
  fondo: string;
  /** `text-decoration-line` del enlace. */
  subrayado: string;
  /** Color del elemento que contiene el enlace: el que hereda si no declara uno. */
  heredado: string;
}

/**
 * Espera a que terminen las animaciones y transiciones finitas del elemento, de lo que contiene y de sus
 * antecesores (el cajón que entra, un cambio de color al pasar el puntero). No usa `asentar`, que espera a todas
 * las del documento: en el inicio, el carrusel las repite sin fin o las reinicia cada pocos segundos.
 */
async function asentarEn(elemento: Locator): Promise<void> {
  await elemento.evaluate((raiz) => {
    const animaciones = raiz.getAnimations({ subtree: true });
    for (let nodo = raiz.parentElement; nodo; nodo = nodo.parentElement) {
      animaciones.push(...nodo.getAnimations());
    }
    return Promise.all(
      animaciones
        .filter((animacion) => animacion.effect?.getComputedTiming().endTime !== Infinity)
        .map((animacion) => animacion.finished.catch(() => undefined)),
    );
  });
}

/** Mide un enlace en reposo (el puntero lejos) o con el puntero encima, tras las transiciones. */
async function medirEnlace(enlace: Locator, { puntero = false } = {}): Promise<MedidaDeEnlace> {
  const page = enlace.page();
  await enlace.scrollIntoViewIfNeeded();
  if (puntero) await enlace.hover();
  else await page.mouse.move(0, 0);
  await asentarEn(enlace);
  // El texto de cada enlace de la tabla es hijo directo de la etiqueta `a`.
  const medida = await enlace.evaluate((a) => {
    const capas: string[] = [];
    for (let nodo: Element | null = a; nodo; nodo = nodo.parentElement) {
      capas.push(getComputedStyle(nodo).backgroundColor);
    }
    const estilo = getComputedStyle(a);
    return {
      color: estilo.color,
      subrayado: estilo.textDecorationLine,
      heredado: getComputedStyle(a.parentElement ?? a).color,
      capas,
    };
  });
  return {
    color: medida.color,
    fondo: fondoEfectivo(medida.capas),
    subrayado: medida.subrayado,
    heredado: medida.heredado,
  };
}

interface Esperado {
  /** Color esperado del texto; `'heredado'` es el del elemento que lo contiene. */
  color: string;
  subrayado: 'none' | 'underline';
}

/**
 * Compara una medida con lo que declara el enlace y exige 4.5:1. Las aserciones son blandas: si un enlace falla,
 * la prueba sigue y el informe lista todos los que no muestran su utilidad.
 */
function comprobar(nombre: string, medida: MedidaDeEnlace, esperado: Esperado): void {
  const color = esperado.color === 'heredado' ? medida.heredado : esperado.color;
  const relacion = anotar('b', nombre, medida.color, medida.fondo, MINIMO.texto);
  expect.soft(medida.color, `${nombre}: color`).toBe(color);
  expect.soft(medida.subrayado, `${nombre}: subrayado`).toBe(esperado.subrayado);
  expect.soft(relacion, `${nombre}: contraste`).toBeGreaterThanOrEqual(MINIMO.texto);
}

/** Abre el cajón móvil de la tienda y espera a que termine su animación. */
async function abrirCajon(page: Page): Promise<Locator> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
  const cajon = page.getByRole('dialog', { name: 'Menú de navegación' });
  await expect(cajon).toBeVisible();
  await asentarEn(cajon);
  return cajon;
}

/** Compra como invitado el producto del carrito y abre el detalle del pedido. */
async function comprarComoInvitado(page: Page): Promise<void> {
  await page.getByRole('main').getByRole('link', { name: 'Confirmar pedido' }).click();
  await expect(page).toHaveURL('/checkout');
  await page.getByRole('textbox', { name: 'Nombres y apellidos' }).fill('Invitada Enlaces');
  await page.getByRole('textbox', { name: 'Correo' }).fill(correoUnico('enlaces'));
  await page.getByRole('textbox', { name: 'Teléfono' }).fill('987654321');
  await page.getByRole('textbox', { name: 'DNI / documento' }).fill('45678912');
  await page.getByRole('combobox', { name: 'Distrito destino' }).click();
  await page.getByRole('option', { name: 'Miraflores', exact: true }).click();
  await page.getByRole('textbox', { name: 'Dirección' }).fill('Av. Larco 123');
  await page.getByRole('radio', { name: 'Yape / Plin' }).check();
  await page.getByRole('checkbox', { name: 'Acepto los términos y condiciones' }).check();
  const finalizar = page.getByRole('button', { name: 'Finalizar compra' });
  await expect(finalizar).toBeEnabled();
  await finalizar.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Gracias por tu compra' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver pedido' }).click();
  await expect(page).toHaveTitle('WebStore | Detalle de pedido');
}

test.describe('Enlaces de la tienda con los temas', () => {
  test.beforeEach(() => restablecerTemas());
  test.afterAll(() => restablecerTemas());

  for (const tema of TEMAS) {
    test(`TEST-08: con ${tema.toUpperCase()}, «Ver todos los productos» del cajón móvil tiene el texto del principal a 4.5:1 o más`, async ({
      page,
    }) => {
      await activarTema(tema);
      await page.setViewportSize({ width: 375, height: 812 });
      const cajon = await abrirCajon(page);

      const { color, fondo } = await medirEnlace(
        cajon.getByRole('link', { name: 'Ver todos los productos' }),
      );
      exigir(tema, '«Ver todos los productos» del cajón móvil', color, fondo, MINIMO.texto);
      expect(color, 'el texto es --ws-on-primary').toBe(await colorDelToken(page, '--ws-on-primary'));
      expect(fondo, 'sobre --ws-primary').toBe(await colorDelToken(page, '--ws-primary'));
    });
  }

  test('TEST-09: con B, los diez enlaces muestran el color y el subrayado que declaran', async ({ page }) => {
    await page.goto('/');
    const token = {
      link: await colorDelToken(page, '--ws-link'),
      muted: await colorDelToken(page, '--ws-muted'),
      ink: await colorDelToken(page, '--ws-ink'),
      onPrimary: await colorDelToken(page, '--ws-on-primary'),
      footerHeading: await colorDelToken(page, '--ws-footer-heading'),
    };
    const heredado = 'heredado';

    // 7. Correo del pie: hereda el texto del pie; al pasar el puntero, el color de sus títulos.
    const correo = page.getByRole('contentinfo').getByRole('link', { name: /@/ });
    comprobar('7 · correo del pie', await medirEnlace(correo), { color: heredado, subrayado: 'none' });
    comprobar('7 · correo del pie, con el puntero', await medirEnlace(correo, { puntero: true }), {
      color: token.footerHeading,
      subrayado: 'none',
    });

    // 9. «Ayuda» de la franja superior (desde 640 px): subrayado solo al pasar el puntero.
    const ayuda = page.getByRole('link', { name: 'Ayuda', exact: true });
    comprobar('9 · «Ayuda»', await medirEnlace(ayuda), { color: heredado, subrayado: 'none' });
    comprobar('9 · «Ayuda», con el puntero', await medirEnlace(ayuda, { puntero: true }), {
      color: heredado,
      subrayado: 'underline',
    });

    // 4. «Crear cuenta», y el control: «Olvidé mi contraseña» no declara nada y sigue heredando.
    await page.goto('/cuenta/login');
    const crear = page.getByRole('main').getByRole('link', { name: 'Crear cuenta' });
    comprobar('4 · «Crear cuenta»', await medirEnlace(crear), { color: token.link, subrayado: 'none' });
    comprobar('4 · «Crear cuenta», con el puntero', await medirEnlace(crear, { puntero: true }), {
      color: token.link,
      subrayado: 'none',
    });
    const olvide = page.getByRole('main').getByRole('link', { name: 'Olvidé mi contraseña' });
    comprobar('control · «Olvidé mi contraseña»', await medirEnlace(olvide), {
      color: heredado,
      subrayado: 'none',
    });
    comprobar(
      'control · «Olvidé mi contraseña», con el puntero',
      await medirEnlace(olvide, { puntero: true }),
      { color: heredado, subrayado: 'none' },
    );

    // 8. «Inicia sesión» de /pedidos sin sesión: subrayado siempre, con el color del párrafo.
    await page.goto('/pedidos');
    const inicia = page.getByRole('main').getByRole('link', { name: 'Inicia sesión', exact: true });
    comprobar('8 · «Inicia sesión» de /pedidos', await medirEnlace(inicia), {
      color: heredado,
      subrayado: 'underline',
    });
    comprobar(
      '8 · «Inicia sesión» de /pedidos, con el puntero',
      await medirEnlace(inicia, { puntero: true }),
      {
        color: heredado,
        subrayado: 'underline',
      },
    );

    // 6. Nombre del producto en el carrito: hereda; al pasar el puntero, el color del enlace. El otro enlace al
    // producto es su foto, sin texto.
    await page.goto('/catalogo/soundbar-cinema-500');
    await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Ver carrito' }).click();
    await expect(page).toHaveURL('/carrito');
    const producto = page
      .getByRole('main')
      .getByRole('link', { name: 'Soundbar Cinema 500' })
      .filter({ hasText: 'Soundbar Cinema 500' });
    comprobar('6 · nombre del producto en el carrito', await medirEnlace(producto), {
      color: heredado,
      subrayado: 'none',
    });
    comprobar(
      '6 · nombre del producto en el carrito, con el puntero',
      await medirEnlace(producto, { puntero: true }),
      { color: token.link, subrayado: 'none' },
    );

    // 5. «Mis pedidos», la vuelta del detalle de un pedido: secundario; al pasar el puntero, la tinta.
    await comprarComoInvitado(page);
    const misPedidos = page.getByRole('main').getByRole('link', { name: 'Mis pedidos' });
    comprobar('5 · «Mis pedidos» del detalle', await medirEnlace(misPedidos), {
      color: token.muted,
      subrayado: 'none',
    });
    comprobar(
      '5 · «Mis pedidos» del detalle, con el puntero',
      await medirEnlace(misPedidos, { puntero: true }),
      {
        color: token.ink,
        subrayado: 'none',
      },
    );

    // 1 a 3. El cajón móvil a 375 px, con la primera categoría desplegada.
    await page.setViewportSize({ width: 375, height: 812 });
    const cajon = await abrirCajon(page);
    const verTodos = cajon.getByRole('link', { name: 'Ver todos los productos' });
    for (const puntero of [false, true]) {
      const sufijo = puntero ? ', con el puntero' : '';
      const medida = await medirEnlace(verTodos, { puntero });
      comprobar(`1 · «Ver todos los productos»${sufijo}`, medida, {
        color: token.onPrimary,
        subrayado: 'none',
      });
    }

    const categoria = cajon.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('group').first();
    await categoria.locator('summary').click();
    await asentarEn(categoria);
    const verCategoria = categoria.getByRole('link', { name: 'Ver toda la categoría' });
    comprobar('2 · «Ver toda la categoría»', await medirEnlace(verCategoria), {
      color: token.link,
      subrayado: 'none',
    });
    comprobar(
      '2 · «Ver toda la categoría», con el puntero',
      await medirEnlace(verCategoria, { puntero: true }),
      {
        color: token.link,
        subrayado: 'none',
      },
    );

    const subcategoria = categoria.getByRole('link').filter({ hasNotText: 'Ver toda la categoría' }).first();
    await expect(subcategoria, 'la primera categoría tiene subcategorías').toBeVisible();
    comprobar('3 · subcategoría del cajón', await medirEnlace(subcategoria), {
      color: token.muted,
      subrayado: 'none',
    });
    comprobar(
      '3 · subcategoría del cajón, con el puntero',
      await medirEnlace(subcategoria, { puntero: true }),
      {
        color: token.muted,
        subrayado: 'none',
      },
    );
  });
});
