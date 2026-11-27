import { expect, test, type Locator, type Page } from '@playwright/test';

import { enviarCambios, leerSnapshot } from './apoyo/catalogo';
import { colorDelToken, mismoColor } from './apoyo/contraste';
import { cuentasAdmin, ingresarAlAdmin } from './apoyo/entorno';

/**
 * Lote 46 (ADR-0033), PBI-0266: en la sección «Botones» del registro del banner, cada botón («Primer botón» y «Segundo
 * botón») elige su estilo en «Estilo», entre los cuatro del tema, con una muestra de cada uno. Por omisión, el primero
 * es «Principal» y el segundo «Secundario». Lo elegido se guarda en el BFF y se conserva al volver a abrir el banner.
 * Cambia «bn-1» y lo deja como estaba.
 */

const ESTILOS = ['Principal', 'Secundario', 'Contraste', 'Con borde'];

async function elegir(page: Page, zona: Locator, campo: string, opcion: string): Promise<void> {
  await zona.getByRole('combobox', { name: campo }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
}

test('PBI-0266: cada botón del banner elige su estilo entre los cuatro del tema y se conserva al guardar', async ({
  page,
}) => {
  try {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/banners/bn-1');
    const formulario = page.getByRole('form', { name: 'Editar banner' });
    const primero = formulario.getByRole('combobox', { name: 'Primer botón: estilo' });
    const segundo = formulario.getByRole('combobox', { name: 'Segundo botón: estilo' });
    // Un banner guardado antes del lote, sin estilos: los de siempre.
    await expect(primero).toHaveText('Principal');
    await expect(segundo).toHaveText('Secundario');
    await expect(segundo).toHaveAccessibleDescription(/Si no lo cambias, «Secundario»/);
    // Los textos de los botones se nombran por su orden.
    await expect(formulario.getByRole('textbox', { name: 'Primer botón: lo que dice' })).toHaveValue(
      'Descubrir TV y audio',
    );
    await expect(formulario.getByRole('textbox', { name: 'Botón principal: lo que dice' })).toHaveCount(0);

    // La lista tiene los cuatro estilos, sin color libre, y cada uno con su muestra en los colores del tema.
    await primero.click();
    // Las de la lista abierta: el «Estado» de la cabecera es un `<select>` nativo con sus propias opciones.
    const lista = page.getByRole('listbox', { name: 'Primer botón: estilo' });
    await expect(lista.getByRole('option')).toHaveText(ESTILOS);
    const muestras = {
      Principal: '--ws-primary',
      Secundario: '--ws-accent',
      Contraste: '--ws-ink',
    } as const;
    for (const [nombre, token] of Object.entries(muestras)) {
      const fondo = await lista
        .getByRole('option', { name: nombre, exact: true })
        .locator('[aria-hidden="true"]')
        .first()
        .evaluate((muestra) => getComputedStyle(muestra).backgroundColor);
      const esperado = await colorDelToken(page, token);
      expect(mismoColor(fondo, esperado), `la muestra de «${nombre}» (${fondo}) es ${token}`).toBe(true);
    }
    await page.keyboard.press('Escape');

    await elegir(page, formulario, 'Primer botón: estilo', 'Con borde');
    await elegir(page, formulario, 'Segundo botón: estilo', 'Contraste');
    await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page).toHaveURL(/\/banners$/);

    const guardado = (await leerSnapshot()).banners.find((banner) => banner.id === 'bn-1') as unknown as {
      ctaStyle: string;
      secondaryCtaStyle: string;
    };
    expect(guardado).toMatchObject({ ctaStyle: 'outline', secondaryCtaStyle: 'contrast' });

    await page.goto('/banners/bn-1');
    await expect(primero).toHaveText('Con borde');
    await expect(segundo).toHaveText('Contraste');
  } finally {
    await enviarCambios({
      banners: { upsert: [{ id: 'bn-1', ctaStyle: 'primary', secondaryCtaStyle: 'accent' }] },
    });
  }
});
