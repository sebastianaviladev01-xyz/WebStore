import { expect, test } from '@playwright/test';

import {
  MINIMO,
  TEMAS,
  activarTema,
  colorDelToken,
  exigir,
  mismoColor,
  restablecerTemas,
} from './apoyo/contraste';
import { enviarCambios, leerSnapshot } from './apoyo/catalogo';

/**
 * Lote 06 (ADR-0017), PBI-0128: el enlace de un banner puede ser externo (`https://…`). La tienda lo abre como un
 * enlace normal; antes pasaba por el router y quedaba como una ruta rota de la tienda. Cambia el banner «bn-4» por
 * la API del Admin y lo deja como estaba.
 * Lote 12 (ADR-0021):
 * - PBI-0174: un enlace externo `https://…` o `http://…` se abre en otra pestaña, con `rel="noopener noreferrer"`;
 *   `mailto:` y las rutas de la tienda siguen en la misma.
 * - PBI-0184 (confirmado por Sebastián Avila): cada banner lleva hasta dos botones, el principal con la paleta primaria
 *   (`--ws-primary` y `--ws-on-primary`) y el secundario con la secundaria (`--ws-accent` y `--ws-on-accent`), con el
 *   texto a 4.5:1 o más con A, B y C.
 */
test('PBI-0128 y PBI-0174: el enlace externo de un banner de promoción lleva a esa dirección en otra pestaña', async ({
  page,
}) => {
  const banner = (await leerSnapshot()).banners.find((item) => item.id === 'bn-4')!;
  try {
    await enviarCambios({ banners: { upsert: [{ id: 'bn-4', ctaUrl: 'https://example.com/monitores' }] } });
    await page.goto('/');
    const enlace = page.getByRole('link', { name: `${banner.cta} (se abre en otra pestaña)` });
    await expect(enlace).toHaveAttribute('href', 'https://example.com/monitores');
    await expect(enlace).toHaveAttribute('target', '_blank');
    await expect(enlace).toHaveAttribute('rel', 'noopener noreferrer');
  } finally {
    await enviarCambios({ banners: { upsert: [{ id: 'bn-4', ctaUrl: banner.ctaUrl }] } });
  }
});

test('PBI-0128 y PBI-0174: un enlace de la tienda sigue siendo una ruta de la tienda, en la misma pestaña', async ({
  page,
}) => {
  await page.goto('/');
  const enlace = page.getByRole('link', { name: 'Ver monitores', exact: true });
  await expect(enlace).toHaveAttribute('href', '/catalogo?categoria=cat-computing');
  await expect(enlace).not.toHaveAttribute('target', /.*/);
});

test('PBI-0184 y PBI-0174: el botón secundario de una promoción sale con su enlace; mailto sigue en la misma pestaña', async ({
  page,
}) => {
  try {
    await enviarCambios({
      banners: {
        upsert: [{ id: 'bn-4', secondaryCta: 'Escríbenos', secondaryCtaUrl: 'mailto:ventas@example.com' }],
      },
    });
    await page.goto('/');
    const tarjeta = page.getByRole('article').filter({ hasText: 'Amplía tus posibilidades.' });
    const principal = tarjeta.getByRole('link', { name: 'Ver monitores', exact: true });
    const secundario = tarjeta.getByRole('link', { name: 'Escríbenos', exact: true });
    await expect(secundario).toHaveAttribute('href', 'mailto:ventas@example.com');
    await expect(secundario).not.toHaveAttribute('target', /.*/);
    // El principal va primero.
    const [x1, x2] = [(await principal.boundingBox())!.x, (await secundario.boundingBox())!.x];
    expect(x1).toBeLessThan(x2);
  } finally {
    await enviarCambios({ banners: { upsert: [{ id: 'bn-4', secondaryCta: '', secondaryCtaUrl: '' }] } });
  }
  await page.reload();
  await expect(page.getByRole('link', { name: 'Escríbenos' })).toHaveCount(0);
});

test.describe('PBI-0184: los dos botones del banner principal con cada tema', () => {
  test.beforeEach(() => restablecerTemas());
  test.afterAll(() => restablecerTemas());

  for (const tema of TEMAS) {
    test(`con ${tema.toUpperCase()}, el principal lleva la paleta primaria y el secundario la secundaria`, async ({
      page,
    }) => {
      await activarTema(tema);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      const carrusel = page.getByRole('region', { name: 'Promociones principales' });
      const botones = {
        principal: {
          enlace: carrusel.getByRole('link', { name: 'Descubrir TV y audio' }),
          texto: '--ws-on-primary',
          fondo: '--ws-primary',
        },
        secundario: {
          enlace: carrusel.getByRole('link', { name: 'Ver todos los productos' }),
          texto: '--ws-on-accent',
          fondo: '--ws-accent',
        },
      };
      for (const [nombre, boton] of Object.entries(botones)) {
        await expect(boton.enlace).toBeVisible();
        // El botón es opaco: su fondo es el que está detrás del texto. Sin `asentar`: el carrusel anima sin fin.
        const { color, fondo } = await boton.enlace.evaluate((enlace) => {
          const estilo = getComputedStyle(enlace);
          return { color: estilo.color, fondo: estilo.backgroundColor };
        });
        exigir(tema, `botón ${nombre} del banner`, color, fondo, MINIMO.texto);
        const [texto, relleno] = [
          await colorDelToken(page, boton.texto),
          await colorDelToken(page, boton.fondo),
        ];
        expect(
          mismoColor(color, texto),
          `el texto del ${nombre} (${color}) es ${boton.texto} (${texto})`,
        ).toBe(true);
        expect(
          mismoColor(fondo, relleno),
          `el fondo del ${nombre} (${fondo}) es ${boton.fondo} (${relleno})`,
        ).toBe(true);
      }
    });
  }
});
