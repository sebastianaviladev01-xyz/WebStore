import { expect, test } from '@playwright/test';

import {
  MINIMO,
  TEMAS,
  activarTema,
  asentar,
  colorDelToken,
  crearTemaPropio,
  enRgb,
  exigir,
  medirOpcionSeleccionada,
  medirTexto,
  restablecerTemas,
} from './apoyo/contraste';
import { enlaceDelCarrito, urls } from './apoyo/entorno';

/**
 * Temas y contraste en la tienda (lote 03, ADR-0017 y ADR-0019).
 * - PBI-0084: en `/inicio-anterior`, el contador del carrusel y la categoría del menú con el puntero encima usan el
 *   color de los enlaces, no el principal: con A, B y C se leen a 4.5:1 o más.
 * - PBI-0060 y PBI-0061: con un tema propio oscuro, lo escrito en un campo, las opciones de una lista y el mensaje de
 *   error se leen.
 * - PBI-0062: con un principal muy claro sobre una base oscura, el texto del botón principal se lee.
 * - PBI-0189 (lote 14, ADR-0023): con A, B, C y un tema propio de ámbar, la oferta y el contador del carrito llevan el
 *   secundario con su texto (4.5:1) y su borde del acento, que se distingue del fondo (3:1).
 * Las medidas solo leen colores con `getComputedStyle`. Al terminar, B queda activo y los temas de prueba se borran.
 */
const PREFIJO = 'Lote03 Tienda';
const BASE_OSCURA = { background: '#111318', surface: '#1B1E25', contrast: '#F5F7FA' };
const OSCURO = { primary: '#3B82F6', secondary: '#F97316', ...BASE_OSCURA };
const PRINCIPAL_CLARO = { primary: '#FFFFBB', secondary: '#F97316', ...BASE_OSCURA };
/** Lote 08 (PBI-0085): un tema propio claro, para que no se pruebe solo con uno oscuro. */
const CLARO = {
  primary: '#1D4ED8',
  secondary: '#B45309',
  background: '#FFFFFF',
  surface: '#F3F4F6',
  contrast: '#111827',
};
/** Lote 14 (PBI-0189): un ámbar claro sobre la base de B, que sin borde apenas se distingue del blanco (1.79:1). */
const AMBAR = {
  primary: '#1D4ED8',
  secondary: '#FFB300',
  background: '#F3F5F8',
  surface: '#FFFFFF',
  contrast: '#0F172A',
};
const PROPIOS = [
  { nombre: 'oscuro', colores: OSCURO },
  { nombre: 'claro', colores: CLARO },
] as const;

test.describe('Temas y contraste en la tienda', () => {
  test.beforeEach(() => restablecerTemas(PREFIJO));
  test.afterAll(() => restablecerTemas(PREFIJO));

  for (const tema of TEMAS) {
    test(`PBI-0084: con ${tema.toUpperCase()}, el contador del carrusel y la categoría activa de /inicio-anterior se leen`, async ({
      page,
    }) => {
      await activarTema(tema);
      await page.goto('/inicio-anterior');
      const enlace = await colorDelToken(page, '--ws-link');

      const contador = await medirTexto(page.getByText(/^\s*1 \/ \d+\s*$/));
      expect(enRgb(contador.color), 'el contador usa el color de los enlaces').toBe(enlace);
      exigir(tema, 'contador del carrusel «1 / N»', contador.color, contador.fondo, MINIMO.texto);

      const categoria = page
        .getByRole('navigation', { name: 'Categorías principales' })
        .getByRole('button', { name: 'TV y audio', exact: true });
      await categoria.hover();
      await asentar(page);
      const conPuntero = await medirTexto(categoria);
      expect(enRgb(conPuntero.color), 'la categoría con el puntero encima usa el color de los enlaces').toBe(
        enlace,
      );
      exigir(tema, 'categoría «TV y audio» con el puntero', conPuntero.color, conPuntero.fondo, MINIMO.texto);
    });
  }

  for (const { nombre, colores } of PROPIOS) {
    test(`PBI-0060, PBI-0061 y PBI-0085: con un tema propio ${nombre}, los campos, las listas y el error se leen`, async ({
      page,
    }) => {
      await activarTema(await crearTemaPropio(`${PREFIJO} ${nombre}`, colores));

      await page.route('**/bff/account-sessions', (ruta) =>
        ruta.request().method() === 'POST'
          ? ruta.fulfill({
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({
                message: 'Correo o contraseña incorrectos.',
                error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' },
              }),
            })
          : ruta.fallback(),
      );
      await page.goto('/cuenta/login');
      const correo = page.getByRole('textbox', { name: 'Correo' });
      await correo.fill('cliente@webstore.demo');
      const escrito = await medirTexto(correo);
      exigir(nombre, 'texto escrito en el campo «Correo»', escrito.color, escrito.fondo, MINIMO.texto);

      await page.getByLabel('Contraseña').fill('Incorrecta#2026');
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      const error = page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos.' });
      await expect(error).toBeVisible();
      const aviso = await medirTexto(error);
      exigir(nombre, 'mensaje de error sobre su recuadro', aviso.color, aviso.fondo, MINIMO.texto);

      await page.goto('/catalogo');
      await page.getByRole('combobox', { name: 'Categoría' }).click();
      const seleccionada = page.getByRole('option', { selected: true });
      await expect(seleccionada).toBeVisible();
      // Material solo pinta los colores de la opción seleccionada cuando no es la activa: se baja una con el teclado.
      await page.keyboard.press('ArrowDown');
      const opcion = await medirOpcionSeleccionada(seleccionada);
      exigir(nombre, 'opción seleccionada, texto', opcion.texto, opcion.fondo, MINIMO.texto);
      const panel = await medirTexto(page.getByRole('option', { selected: false }).last());
      exigir(nombre, 'opción sin seleccionar, texto sobre el panel', panel.color, panel.fondo, MINIMO.texto);
    });
  }

  for (const tema of [...TEMAS, 'ámbar'] as const) {
    test(`PBI-0189: con ${tema === 'ámbar' ? 'un tema propio de ámbar' : tema.toUpperCase()}, la oferta y el contador del carrito se ven y se leen`, async ({
      page,
      request,
    }) => {
      await activarTema(tema === 'ámbar' ? await crearTemaPropio(`${PREFIJO} ámbar`, AMBAR) : tema);
      const productos: { id: string; stock: number }[] = await (
        await request.get(`${urls.bff}/bff/catalog/products`)
      ).json();
      const conStock = productos.find((producto) => producto.stock > 0)!;
      await page.addInitScript(
        (id) => localStorage.setItem('webstore-cart-v1', JSON.stringify([{ productId: id, quantity: 1 }])),
        conStock.id,
      );
      // El seed no trae insignias: la oferta se añade a la respuesta del catálogo solo en esta prueba.
      await page.route('**/bff/catalog/products', async (ruta) => {
        const respuesta = await ruta.fetch();
        const lista: { id: string }[] = await respuesta.json();
        await ruta.fulfill({
          response: respuesta,
          json: lista.map((producto) =>
            producto.id === conStock.id ? { ...producto, badge: 'Oferta' } : producto,
          ),
        });
      });
      await page.goto('/catalogo');
      const nombre = tema === 'ámbar' ? 'ámbar' : tema;

      const oferta = page.getByText('Oferta', { exact: true });
      await expect(oferta).toBeVisible();
      const textoOferta = await medirTexto(oferta);
      exigir(
        nombre,
        'texto de la oferta sobre el secundario',
        textoOferta.color,
        textoOferta.fondo,
        MINIMO.texto,
      );
      expect(enRgb(textoOferta.fondo)).toBe(await colorDelToken(page, '--ws-accent'));

      const contador = enlaceDelCarrito(page).getByText('1', { exact: true });
      await expect(contador).toBeVisible();
      const textoContador = await medirTexto(contador);
      exigir(
        nombre,
        'texto del contador del carrito',
        textoContador.color,
        textoContador.fondo,
        MINIMO.texto,
      );

      // El borde del acento contornea los dos y se distingue de la superficie y del lienzo de la tienda.
      const borde = await colorDelToken(page, '--ws-accent-line');
      for (const fondo of ['--ws-surface', '--ws-store-bg', '--ws-bg'])
        exigir(
          nombre,
          `borde del acento sobre ${fondo}`,
          borde,
          await colorDelToken(page, fondo),
          MINIMO.marca,
        );
      const bordeCrudo = await colorDelToken(page, '--ws-accent-line', { crudo: true });
      for (const elemento of [oferta, contador])
        expect(await elemento.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(bordeCrudo);
    });
  }

  test('PBI-0062: con un principal muy claro sobre una base oscura, el texto del botón principal se lee', async ({
    page,
  }) => {
    await activarTema(await crearTemaPropio(`${PREFIJO} principal claro`, PRINCIPAL_CLARO));
    await page.goto('/cuenta/login');
    const boton = await medirTexto(page.getByRole('button', { name: 'Ingresar', exact: true }));
    exigir('principal claro', 'botón «Ingresar»', boton.color, boton.fondo, MINIMO.texto);
  });
});
