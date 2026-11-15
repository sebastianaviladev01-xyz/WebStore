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

/**
 * Temas y contraste en la tienda (lote 03, ADR-0017 y ADR-0019).
 * - PBI-0084: en `/inicio-anterior`, el contador del carrusel y la categoría del menú con el puntero encima usan el
 *   color de los enlaces, no el principal: con A, B y C se leen a 4.5:1 o más.
 * - PBI-0060 y PBI-0061: con un tema propio oscuro, lo escrito en un campo, las opciones de una lista y el mensaje de
 *   error se leen.
 * - PBI-0062: con un principal muy claro sobre una base oscura, el texto del botón principal se lee.
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

  test('PBI-0062: con un principal muy claro sobre una base oscura, el texto del botón principal se lee', async ({
    page,
  }) => {
    await activarTema(await crearTemaPropio(`${PREFIJO} principal claro`, PRINCIPAL_CLARO));
    await page.goto('/cuenta/login');
    const boton = await medirTexto(page.getByRole('button', { name: 'Ingresar', exact: true }));
    exigir('principal claro', 'botón «Ingresar»', boton.color, boton.fondo, MINIMO.texto);
  });
});
