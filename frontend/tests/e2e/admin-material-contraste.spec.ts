import { expect, test } from '@playwright/test';

import {
  MINIMO,
  TEMAS,
  activarTema,
  exigir,
  medirCasilla,
  medirEtiquetaEnfocada,
  medirOpcionSeleccionada,
  medirTexto,
  restablecerTemas,
} from './apoyo/contraste';
import { abrirMenuUsuario, cuentasAdmin } from './apoyo/entorno';
import { menuDeTemas, tuerca } from './apoyo/modo-demo';

/**
 * Componentes de Material del Admin con los temas (feature 005). TEST-12 (AC-06): con A, B y C, cada texto o
 * marca que Material pinta con el principal, o sobre él, llega a su mínimo (4.5:1 el texto y 3:1 una marca): la
 * casilla marcada, la etiqueta enfocada de un campo, la opción seleccionada de una lista desplegable, el menú de
 * usuario y el selector de tema del modo demo (en la tienda hasta el lote 14, PBI-0188). Cada medida queda en las anotaciones de la prueba. Al terminar, B queda activo.
 */
test.describe('Componentes de Material del Admin con los temas', () => {
  test.beforeEach(() => restablecerTemas());
  test.afterAll(() => restablecerTemas());

  for (const tema of TEMAS) {
    test(`TEST-12: con ${tema.toUpperCase()}, los componentes de Material del Admin llegan a su mínimo`, async ({
      page,
    }) => {
      await activarTema(tema);

      // Etiqueta enfocada de un campo: el texto del principal de Material (el enlace) sobre el campo.
      await page.goto('/login');
      const correo = page.getByRole('textbox', { name: 'Correo' });
      const etiqueta = await medirEtiquetaEnfocada(correo);
      exigir(tema, 'etiqueta enfocada del campo «Correo»', etiqueta.color, etiqueta.fondo, MINIMO.texto);

      await correo.fill(cuentasAdmin.superadmin.email);
      await page.getByRole('textbox', { name: 'Contraseña' }).fill(cuentasAdmin.superadmin.password);
      await page.getByRole('button', { name: 'Ingresar al panel' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();

      // Menú de usuario: el texto de una opción sobre el panel.
      const menu = await abrirMenuUsuario(page);
      const opcionDelMenu = await medirTexto(menu.getByRole('menuitem', { name: 'Perfil' }));
      exigir(tema, 'menú de usuario, «Perfil»', opcionDelMenu.color, opcionDelMenu.fondo, MINIMO.texto);
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();

      // Selector de tema del modo demo: el texto de una opción sobre el panel.
      await tuerca(page).click();
      const temas = menuDeTemas(page);
      await expect(temas).toBeVisible();
      const temaDelMenu = await medirTexto(temas.getByRole('menuitemradio', { name: /^Azul cobalto/ }));
      exigir(tema, 'selector de tema, «Azul cobalto»', temaDelMenu.color, temaDelMenu.fondo, MINIMO.texto);
      await page.keyboard.press('Escape');
      await expect(temas).toBeHidden();

      // Casilla marcada: la marca sobre el relleno y el relleno sobre la tarjeta.
      await page.goto('/contenido');
      const casilla = page.getByRole('checkbox', { name: 'Página Contacto' });
      await expect(casilla).toBeChecked();
      const medida = await medirCasilla(casilla);
      exigir(tema, 'casilla marcada, marca sobre el relleno', medida.marca, medida.relleno, MINIMO.marca);
      exigir(tema, 'casilla marcada, relleno sobre la tarjeta', medida.relleno, medida.tarjeta, MINIMO.marca);

      // Lista desplegable abierta: el texto y la marca de la opción seleccionada sobre su fondo.
      await page.goto('/banners');
      await page.getByRole('combobox', { name: 'Ubicación' }).click();
      const seleccionada = page.getByRole('option', { selected: true });
      await expect(seleccionada).toBeVisible();
      const opcion = await medirOpcionSeleccionada(seleccionada);
      exigir(
        tema,
        'lista desplegable, texto de la opción seleccionada',
        opcion.texto,
        opcion.fondo,
        MINIMO.texto,
      );
      exigir(
        tema,
        'lista desplegable, marca de la opción seleccionada',
        opcion.marca,
        opcion.fondo,
        MINIMO.marca,
      );
    });
  }
});
