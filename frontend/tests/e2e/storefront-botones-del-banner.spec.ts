import { expect, test, type Locator, type Page } from '@playwright/test';

import { enviarCambios, leerSnapshot } from './apoyo/catalogo';
import {
  MINIMO,
  TEMAS,
  activarTema,
  colorDelToken,
  exigir,
  fondoDe,
  mismoColor,
  restablecerTemas,
} from './apoyo/contraste';

/**
 * Lote 46 (ADR-0033), PBI-0266: cada botón del banner sale con el estilo elegido al registrarlo, uno de los cuatro del
 * tema, con las mismas medidas que los de siempre:
 * - «Contraste» (`contrast`): relleno `--ws-ink` y texto `--ws-surface`;
 * - «Con borde» (`outline`): sin relleno, con el borde y el texto en `--ws-on-primary-soft` en el carrusel (sobre su
 *   tinte o su velo) y en `--ws-link` en las promociones (sobre la superficie);
 * - «Principal» y «Secundario» siguen como en el lote 12.
 * Los colores se miden con `getComputedStyle`, sin clases. Cambia «bn-1» (carrusel) y «bn-4» (promoción) por la API del
 * Admin y los deja como estaban.
 */

interface Medida {
  color: string;
  fondo: string;
  borde: string;
  alto: number;
}

async function medir(enlace: Locator): Promise<Medida> {
  await expect(enlace).toBeVisible();
  const estilo = await enlace.evaluate((elemento) => {
    const calculado = getComputedStyle(elemento);
    return {
      color: calculado.color,
      fondo: calculado.backgroundColor,
      borde: calculado.borderTopColor,
      alto: elemento.getBoundingClientRect().height,
    };
  });
  return estilo;
}

const transparente = (color: string) => /rgba\(0, 0, 0, 0\)|transparent/.test(color);

async function comprobarToken(page: Page, medido: string, token: string, que: string): Promise<void> {
  const esperado = await colorDelToken(page, token);
  expect(mismoColor(medido, esperado), `${que} (${medido}) es ${token} (${esperado})`).toBe(true);
}

test.describe('PBI-0266: el estilo de cada botón del banner', () => {
  test.beforeEach(() => restablecerTemas());
  test.afterAll(() => restablecerTemas());

  for (const tema of TEMAS) {
    test(`con ${tema.toUpperCase()}, «Contraste» y «Con borde» llevan los colores del tema y se leen`, async ({
      page,
    }) => {
      const { banners } = await leerSnapshot();
      const hero = banners.find((banner) => banner.id === 'bn-1')!;
      const promocion = banners.find((banner) => banner.id === 'bn-4')!;
      try {
        await enviarCambios({
          banners: {
            upsert: [
              { id: 'bn-1', ctaStyle: 'contrast', secondaryCtaStyle: 'outline' },
              {
                id: 'bn-4',
                ctaStyle: 'outline',
                secondaryCta: 'Ver ofertas',
                secondaryCtaUrl: '/catalogo',
                secondaryCtaStyle: 'contrast',
              },
            ],
          },
        });
        await activarTema(tema);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/');

        // Carrusel: el primero con «Contraste» y el segundo con «Con borde».
        const carrusel = page.getByRole('region', { name: 'Promociones principales' });
        const contraste = await medir(carrusel.getByRole('link', { name: hero.cta, exact: true }));
        await comprobarToken(page, contraste.fondo, '--ws-ink', 'el relleno de «Contraste»');
        await comprobarToken(page, contraste.color, '--ws-surface', 'el texto de «Contraste»');
        exigir(tema, '«Contraste» en el carrusel', contraste.color, contraste.fondo, MINIMO.texto);

        const enlaceConBorde = carrusel.getByRole('link', { name: 'Ver todos los productos', exact: true });
        const conBorde = await medir(enlaceConBorde);
        expect(transparente(conBorde.fondo), `«Con borde» no tiene relleno (${conBorde.fondo})`).toBe(true);
        await comprobarToken(
          page,
          conBorde.color,
          '--ws-on-primary-soft',
          'el texto de «Con borde» en el carrusel',
        );
        await comprobarToken(
          page,
          conBorde.borde,
          '--ws-on-primary-soft',
          'el borde de «Con borde» en el carrusel',
        );
        const fondoDelCarrusel = await fondoDe(enlaceConBorde);
        exigir(tema, '«Con borde» en el carrusel', conBorde.color, fondoDelCarrusel, MINIMO.texto);
        // Mismas medidas que los botones de siempre (46 px de alto).
        expect(contraste.alto).toBeCloseTo(46, 0);
        expect(conBorde.alto).toBeCloseTo(46, 0);

        // Promoción: el primero con «Con borde» sobre la superficie y el segundo con «Contraste».
        const tarjeta = page.getByRole('article').filter({ hasText: 'Amplía tus posibilidades.' });
        const enlacePromocion = tarjeta.getByRole('link', { name: promocion.cta, exact: true });
        const bordePromocion = await medir(enlacePromocion);
        expect(transparente(bordePromocion.fondo)).toBe(true);
        await comprobarToken(
          page,
          bordePromocion.color,
          '--ws-link',
          'el texto de «Con borde» en la promoción',
        );
        await comprobarToken(
          page,
          bordePromocion.borde,
          '--ws-link',
          'el borde de «Con borde» en la promoción',
        );
        exigir(
          tema,
          '«Con borde» en la promoción',
          bordePromocion.color,
          await fondoDe(enlacePromocion),
          MINIMO.texto,
        );
        const contrastePromocion = await medir(
          tarjeta.getByRole('link', { name: 'Ver ofertas', exact: true }),
        );
        await comprobarToken(
          page,
          contrastePromocion.fondo,
          '--ws-ink',
          'el relleno de «Contraste» en la promoción',
        );
        exigir(
          tema,
          '«Contraste» en la promoción',
          contrastePromocion.color,
          contrastePromocion.fondo,
          MINIMO.texto,
        );

        // La otra promoción, sin estilos, sigue con el principal.
        const otra = page.getByRole('article').filter({ hasText: 'Una rutina más simple.' });
        const principal = await medir(otra.getByRole('link', { name: 'Ver electrohogar', exact: true }));
        await comprobarToken(page, principal.fondo, '--ws-primary', 'el relleno del botón sin estilo');
        expect(bordePromocion.alto).toBeCloseTo(principal.alto, 0);
      } finally {
        await enviarCambios({
          banners: {
            upsert: [
              { id: 'bn-1', ctaStyle: 'primary', secondaryCtaStyle: 'accent' },
              {
                id: 'bn-4',
                ctaStyle: 'primary',
                secondaryCta: '',
                secondaryCtaUrl: '',
                secondaryCtaStyle: 'accent',
              },
            ],
          },
        });
      }
    });
  }
});
