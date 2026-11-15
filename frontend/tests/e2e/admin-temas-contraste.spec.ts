import { expect, test, type Page } from '@playwright/test';

import {
  MINIMO,
  TEMAS,
  activarTema,
  colorDelToken,
  crearTemaPropio,
  enRgb,
  exigir,
  medirOpcionSeleccionada,
  medirTexto,
  restablecerTemas,
} from './apoyo/contraste';
import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Temas y contraste en el Admin (lote 03, ADR-0017 y ADR-0019).
 * - PBI-0060: con un tema propio oscuro, lo escrito en un campo relleno y las opciones de una lista desplegable se
 *   leen: el relleno y el panel salen del tema, no del tema base de Material.
 * - PBI-0053: con A, B y C, la opción seleccionada de una lista desplegable lleva el fondo suave y el texto del
 *   principal del tema, se distingue del panel y su texto llega a 4.5:1.
 * - PBI-0061: con el tema oscuro, el mensaje de error se lee sobre su recuadro.
 * - PBI-0062: con un principal muy claro sobre una base oscura, el texto del botón principal se lee.
 * Las medidas solo leen colores con `getComputedStyle`. Al terminar, B queda activo y los temas de prueba se borran.
 */
const PREFIJO = 'Lote03 Admin';
const BASE_OSCURA = { background: '#111318', surface: '#1B1E25', contrast: '#F5F7FA' };
const OSCURO = { primary: '#3B82F6', secondary: '#F97316', ...BASE_OSCURA };
const PRINCIPAL_CLARO = { primary: '#FFFFBB', secondary: '#F97316', ...BASE_OSCURA };

/**
 * Abre «Ubicación» en Banners y baja una opción con el teclado: Material solo pinta los colores de la opción
 * seleccionada cuando no es la activa. Devuelve la seleccionada y la última, que no está seleccionada ni activa.
 */
async function abrirUbicacion(page: Page) {
  await page.goto('/banners');
  await page.getByRole('combobox', { name: 'Ubicación' }).click();
  const seleccionada = page.getByRole('option', { selected: true });
  await expect(seleccionada).toBeVisible();
  await page.keyboard.press('ArrowDown');
  return { seleccionada, otra: page.getByRole('option', { selected: false }).last() };
}

test.describe('Temas y contraste en el Admin', () => {
  test.beforeEach(() => restablecerTemas(PREFIJO));
  test.afterAll(() => restablecerTemas(PREFIJO));

  for (const tema of TEMAS) {
    test(`PBI-0053: con ${tema.toUpperCase()}, la opción seleccionada lleva los colores suaves del principal y se lee`, async ({
      page,
    }) => {
      await activarTema(tema);
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      const { seleccionada, otra } = await abrirUbicacion(page);
      const opcion = await medirOpcionSeleccionada(seleccionada);
      expect(enRgb(opcion.fondo), 'fondo de la opción seleccionada').toBe(
        await colorDelToken(page, '--ws-primary-soft'),
      );
      expect(enRgb(opcion.texto), 'texto de la opción seleccionada').toBe(
        await colorDelToken(page, '--ws-on-primary-soft'),
      );
      exigir(tema, 'opción seleccionada, texto', opcion.texto, opcion.fondo, MINIMO.texto);
      const panel = await medirTexto(otra);
      expect(panel.fondo, 'la opción seleccionada se distingue del panel').not.toBe(opcion.fondo);
      exigir(tema, 'opción sin seleccionar, texto sobre el panel', panel.color, panel.fondo, MINIMO.texto);
    });
  }

  test('PBI-0060 y PBI-0061: con un tema propio oscuro, los campos, las listas y el error se leen', async ({
    page,
  }) => {
    await activarTema(await crearTemaPropio(`${PREFIJO} oscuro`, OSCURO));

    await page.route('**/bff/admin/sessions', (ruta) =>
      ruta.request().method() === 'POST'
        ? ruta.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'Correo o contraseña incorrectos.',
              error: { code: 'INVALID_ADMIN_CREDENTIALS', message: 'Correo o contraseña incorrectos.' },
            }),
          })
        : ruta.fallback(),
    );
    await page.goto('/login');
    const correo = page.getByRole('textbox', { name: 'Correo' });
    await correo.fill(cuentasAdmin.superadmin.email);
    const escrito = await medirTexto(correo);
    exigir('oscuro', 'texto escrito en el campo «Correo»', escrito.color, escrito.fondo, MINIMO.texto);

    await page.getByRole('textbox', { name: 'Contraseña' }).fill('Incorrecta#2026');
    await page.getByRole('button', { name: 'Ingresar al panel' }).click();
    const error = page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos.' });
    await expect(error).toBeVisible();
    const aviso = await medirTexto(error);
    exigir('oscuro', 'mensaje de error sobre su recuadro', aviso.color, aviso.fondo, MINIMO.texto);
    await page.unroute('**/bff/admin/sessions');

    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    const { seleccionada, otra } = await abrirUbicacion(page);
    const panel = await medirTexto(otra);
    exigir('oscuro', 'opción sin seleccionar, texto sobre el panel', panel.color, panel.fondo, MINIMO.texto);
    const opcion = await medirOpcionSeleccionada(seleccionada);
    exigir('oscuro', 'opción seleccionada, texto', opcion.texto, opcion.fondo, MINIMO.texto);
  });

  test('PBI-0062: con un principal muy claro sobre una base oscura, el texto del botón principal se lee', async ({
    page,
  }) => {
    await activarTema(await crearTemaPropio(`${PREFIJO} principal claro`, PRINCIPAL_CLARO));
    await page.goto('/login');
    const boton = await medirTexto(page.getByRole('button', { name: 'Ingresar al panel' }));
    exigir('principal claro', 'botón «Ingresar al panel»', boton.color, boton.fondo, MINIMO.texto);
  });
});
