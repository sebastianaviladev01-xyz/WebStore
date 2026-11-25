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
 * - PBI-0084: la categoría del menú con el puntero encima se lee a 4.5:1 o más con A, B y C. El contador del carrusel
 *   que también medía solo existía en `/inicio-anterior`, que se quitó en el lote 16 (PBI-0193).
 * - PBI-0060 y PBI-0061: con un tema propio oscuro, lo escrito en un campo, las opciones de una lista y el mensaje de
 *   error se leen.
 * - PBI-0062: con un principal muy claro sobre una base oscura, el texto del botón principal se lee.
 * - PBI-0189 (lote 14, ADR-0023): con A, B, C y un tema propio de ámbar, la oferta y el contador del carrito llevan el
 *   secundario con su texto (4.5:1) y su borde del acento, que se distingue del fondo (3:1).
 * - PBI-0240 (lote 28, ADR-0028): con A, B y C, los botones secundarios se rellenan con el secundario, el fondo con el
 *   puntero encima o con el foco es el secundario suave y el contador lleva el secundario; C es negro y amarillo.
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
    test(`PBI-0084: con ${tema.toUpperCase()}, la categoría activa del menú se lee`, async ({ page }) => {
      await activarTema(tema);
      await page.goto('/');
      const enlace = await colorDelToken(page, '--ws-link');

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

  // Lote 28 (PBI-0240, ADR-0028). Daniel: «no veo ni un solo botón secundario», «El botón podría ser amarillo con icono
  // negro», «Los fonditos que tiene aquí podrían ser fondo amarillo cuando le haga foco». Con A, B y C: los botones
  // secundarios se rellenan con el secundario y su texto se lee; lo que tenía un fondo neutro con el puntero encima o
  // con el foco pasa al secundario suave, con el texto legible; el contador del carrito lleva el secundario.
  for (const tema of TEMAS) {
    test(`PBI-0240: con ${tema.toUpperCase()}, los botones secundarios, el fondo con el puntero encima y el contador llevan el secundario`, async ({
      page,
      request,
    }) => {
      await activarTema(tema);
      const productos: { id: string; name: string; stock: number }[] = await (
        await request.get(`${urls.bff}/bff/catalog/products`)
      ).json();
      const conStock = productos.find((producto) => producto.stock > 1)!;
      await page.addInitScript(
        (id) => localStorage.setItem('webstore-cart-v1', JSON.stringify([{ productId: id, quantity: 1 }])),
        conStock.id,
      );
      await page.goto('/carrito');
      const acento = await colorDelToken(page, '--ws-accent');
      const sobreAcento = await colorDelToken(page, '--ws-on-accent');
      const suave = await colorDelToken(page, '--ws-accent-soft');

      // El botón secundario del carrito: relleno del secundario y texto en su color de contraste.
      const seguir = page.getByRole('main').getByRole('link', { name: 'Seguir comprando' });
      const textoSeguir = await medirTexto(seguir);
      expect(enRgb(textoSeguir.fondo), 'relleno de «Seguir comprando»').toBe(acento);
      expect(enRgb(textoSeguir.color), 'texto de «Seguir comprando»').toBe(sobreAcento);
      exigir(tema, '«Seguir comprando»', textoSeguir.color, textoSeguir.fondo, MINIMO.texto);

      // El contador del carrito: fondo del secundario y número en su color de contraste.
      const contador = enlaceDelCarrito(page).getByText('1', { exact: true });
      const textoContador = await medirTexto(contador);
      expect(enRgb(textoContador.fondo), 'fondo del contador').toBe(acento);
      expect(enRgb(textoContador.color), 'número del contador').toBe(sobreAcento);

      // Con el puntero encima: la acción «Carrito» de la cabecera y el botón «+» de la cantidad.
      const carrito = enlaceDelCarrito(page);
      await carrito.hover();
      const conPuntero = await medirTexto(carrito);
      expect(enRgb(conPuntero.fondo), '«Carrito» con el puntero encima').toBe(suave);
      exigir(tema, '«Carrito» con el puntero encima', conPuntero.color, conPuntero.fondo, MINIMO.texto);

      const mas = page.getByRole('button', { name: `Aumentar cantidad de ${conStock.name}` });
      await mas.hover();
      const masConPuntero = await medirTexto(mas);
      expect(enRgb(masConPuntero.fondo), '«+» con el puntero encima').toBe(suave);
      exigir(tema, '«+» con el puntero encima', masConPuntero.color, masConPuntero.fondo, MINIMO.texto);

      // Con el foco del teclado, el mismo fondo.
      await page.mouse.move(0, 0);
      await mas.focus();
      expect(enRgb((await medirTexto(mas)).fondo), '«+» con el foco').toBe(suave);

      // Un menú de la tienda: la opción con el puntero encima.
      await page.goto('/catalogo');
      await page
        .getByRole('button', { name: `Más opciones para ${conStock.name}` })
        .first()
        .click();
      const verDetalle = page.getByRole('menuitem', { name: 'Ver detalle' });
      await verDetalle.hover();
      await asentar(page);
      const opcion = await medirTexto(verDetalle);
      expect(enRgb(opcion.fondo), '«Ver detalle» con el puntero encima').toBe(suave);
      exigir(tema, '«Ver detalle» con el puntero encima', opcion.color, opcion.fondo, MINIMO.texto);
    });
  }

  test('PBI-0240: en la ficha, la insignia «Oferta» lleva el secundario, como en la tarjeta del catálogo', async ({
    page,
    request,
  }) => {
    await activarTema('c');
    const productos: { id: string; slug: string }[] = await (
      await request.get(`${urls.bff}/bff/catalog/products`)
    ).json();
    const elegido = productos[0]!;
    await page.route('**/bff/catalog/products', async (ruta) => {
      const respuesta = await ruta.fetch();
      const lista: { id: string }[] = await respuesta.json();
      await ruta.fulfill({
        response: respuesta,
        json: lista.map((producto) =>
          producto.id === elegido.id ? { ...producto, badge: 'Oferta' } : producto,
        ),
      });
    });
    await page.goto(`/catalogo/${elegido.slug}`);
    const oferta = page.getByRole('main').getByText('Oferta', { exact: true });
    const texto = await medirTexto(oferta);
    expect(enRgb(texto.fondo), 'fondo de la oferta en la ficha').toBe(
      await colorDelToken(page, '--ws-accent'),
    );
    expect(enRgb(texto.color), 'texto de la oferta en la ficha').toBe(
      await colorDelToken(page, '--ws-on-accent'),
    );
    exigir('c', 'oferta de la ficha', texto.color, texto.fondo, MINIMO.texto);
  });

  test('PBI-0240: C lleva el negro de principal y el amarillo de secundario, con el número del carrito negro', async ({
    page,
  }) => {
    await activarTema('c');
    await page.goto('/');
    expect(await colorDelToken(page, '--ws-primary')).toBe('rgb(31, 35, 40)');
    expect(await colorDelToken(page, '--ws-on-primary')).toBe('rgb(255, 255, 255)');
    expect(await colorDelToken(page, '--ws-accent')).toBe('rgb(242, 183, 5)');
    expect(await colorDelToken(page, '--ws-on-accent')).toBe('rgb(31, 35, 40)');
  });

  test('PBI-0062: con un principal muy claro sobre una base oscura, el texto del botón principal se lee', async ({
    page,
  }) => {
    await activarTema(await crearTemaPropio(`${PREFIJO} principal claro`, PRINCIPAL_CLARO));
    await page.goto('/cuenta/login');
    const boton = await medirTexto(page.getByRole('button', { name: 'Ingresar', exact: true }));
    exigir('principal claro', 'botón «Ingresar»', boton.color, boton.fondo, MINIMO.texto);
  });
});
