import { expect, test } from '@playwright/test';

import {
  MINIMO,
  TEMAS,
  activarTema,
  colorDelToken,
  exigir,
  medirBotonDeOpcion,
  estaEntre,
  medirBotonConPuntero,
  medirEtiquetaEnfocada,
  medirOpcionSeleccionada,
  medirTexto,
  restablecerTemas,
} from './apoyo/contraste';
import { menuDeTemas, tuerca } from './apoyo/modo-demo';

/**
 * Componentes de Material de la tienda con los temas (feature 005). TEST-12 (AC-06): con A, B y C, cada texto o
 * marca que Material pinta con el principal, o sobre él, llega a su mínimo (4.5:1 el texto y 3:1 una marca): la
 * etiqueta del botón relleno del diálogo «Producto agregado» y su capa de estado, que sigue en `--ws-on-primary`
 * (pregunta 4 del plan), el botón de opción del checkout, la etiqueta enfocada de un campo, la opción
 * seleccionada de una lista desplegable y el selector de tema del modo demo. Cada medida queda en las
 * anotaciones de la prueba. Al terminar, B queda activo.
 */
test.describe('Componentes de Material de la tienda con los temas', () => {
  test.beforeEach(() => restablecerTemas());
  test.afterAll(() => restablecerTemas());

  for (const tema of TEMAS) {
    test(`TEST-12: con ${tema.toUpperCase()}, los componentes de Material de la tienda llegan a su mínimo`, async ({
      page,
    }) => {
      await activarTema(tema);

      // Botón relleno del diálogo: la etiqueta sobre el contenedor y la capa de estado con el puntero encima.
      await page.goto('/catalogo/soundbar-cinema-500');
      await page.getByRole('main').getByRole('button', { name: 'Agregar al carrito' }).click();
      const verCarrito = page.getByRole('dialog').getByRole('button', { name: 'Ver carrito' });
      await expect(verCarrito).toBeVisible();
      const etiqueta = await medirTexto(verCarrito);
      exigir(tema, 'botón relleno «Ver carrito», etiqueta', etiqueta.color, etiqueta.fondo, MINIMO.texto);

      // Con el puntero encima, la capa de estado (que Material pinta en --ws-on-primary) mezcla el relleno con él:
      // se mide el color del botón en reposo y con el puntero, no la capa.
      const { reposo, conPuntero } = await medirBotonConPuntero(verCarrito);
      expect(conPuntero, 'con el puntero encima, el relleno del botón cambia').not.toBe(reposo);
      expect(
        estaEntre(conPuntero, reposo, await colorDelToken(page, '--ws-on-primary')),
        'la capa de estado sigue en --ws-on-primary: el relleno se mezcla con él',
      ).toBe(true);
      exigir(
        tema,
        `botón relleno «Ver carrito» con el puntero (${reposo} pasa a ${conPuntero}), etiqueta`,
        etiqueta.color,
        conPuntero,
        MINIMO.texto,
      );

      await verCarrito.click();
      await expect(page).toHaveURL('/carrito');
      await page.getByRole('main').getByRole('link', { name: 'Confirmar pedido' }).click();
      await expect(page).toHaveURL('/checkout');

      // Etiqueta enfocada de un campo.
      const nombre = await medirEtiquetaEnfocada(page.getByRole('textbox', { name: 'Nombres y apellidos' }));
      exigir(
        tema,
        'etiqueta enfocada del campo «Nombres y apellidos»',
        nombre.color,
        nombre.fondo,
        MINIMO.texto,
      );

      // Lista desplegable abierta con una opción seleccionada.
      const distrito = page.getByRole('combobox', { name: 'Distrito destino' });
      await distrito.click();
      await page.getByRole('option', { name: 'Miraflores', exact: true }).click();
      await expect(page.getByRole('listbox')).toBeHidden();
      await distrito.click();
      const seleccionada = page.getByRole('option', { selected: true });
      await expect(seleccionada).toHaveText('Miraflores');
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
      await page.keyboard.press('Escape');
      await expect(page.getByRole('listbox')).toBeHidden();

      // Botón de opción del pago: el punto y el anillo sobre la superficie.
      const yape = page.getByRole('radio', { name: 'Yape / Plin' });
      await yape.check();
      const radio = await medirBotonDeOpcion(yape);
      exigir(tema, 'botón de opción «Yape / Plin», punto', radio.punto, radio.fondo, MINIMO.marca);
      exigir(tema, 'botón de opción «Yape / Plin», anillo', radio.anillo, radio.fondo, MINIMO.marca);

      // Selector de tema del modo demo: el texto de una opción sobre el panel.
      await tuerca(page).click();
      const menu = menuDeTemas(page);
      await expect(menu).toBeVisible();
      const temaDelMenu = await medirTexto(menu.getByRole('menuitemradio', { name: /^Azul cobalto/ }));
      exigir(tema, 'selector de tema, «Azul cobalto»', temaDelMenu.color, temaDelMenu.fondo, MINIMO.texto);
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
    });
  }
});
