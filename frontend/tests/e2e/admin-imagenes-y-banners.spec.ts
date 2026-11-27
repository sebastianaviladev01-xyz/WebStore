import { expect, request as nuevoRequest, test, type Locator, type Page } from '@playwright/test';

import { enviarCambios, leerProductos, leerSnapshot, retirarProductos } from './apoyo/catalogo';
import { cuentasAdmin, ingresarAlAdmin, urls } from './apoyo/entorno';
import { cargarImagenPrincipal, pngDeColor } from './apoyo/fotos';

/**
 * Lote 24 (ADR-0025 y ADR-0026; provisional, por confirmar con Daniel).
 *
 * - PBI-0214: la imagen principal del producto y las del banner se cargan como archivo, no como URL. Con un solo
 *   archivo, el Admin genera la imagen de la ficha y la miniatura de los listados; el BFF las guarda y la tienda las
 *   pide por su dirección (`/bff/images/…`). Una imagen guardada antes (una ruta de `assets/`) se ve y se conserva
 *   hasta que se reemplace.
 * - PBI-0221: el registro del banner tiene nombres y ayudas claras; el tono de los controles del carrusel se calcula
 *   al cargar la imagen de escritorio y se puede corregir; la vigencia lleva fecha y hora de Lima.
 *
 * Los productos y banners que crea se retiran al terminar.
 */

const SKU = 'E2E-LOTE24-IMG';

async function elegir(page: Page, zona: Locator, campo: string, opcion: string): Promise<void> {
  await zona.getByRole('combobox', { name: campo }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
}

/** Pide una dirección pública del BFF y devuelve su estado y su tipo. */
async function pedirImagen(direccion: string): Promise<{ status: number; tipo: string }> {
  const api = await nuevoRequest.newContext({ baseURL: urls.bff });
  try {
    const respuesta = await api.get(direccion);
    return { status: respuesta.status(), tipo: respuesta.headers()['content-type'] ?? '' };
  } finally {
    await api.dispose();
  }
}

test.describe('PBI-0214: la imagen principal del producto se carga como archivo', () => {
  test('sin URL ni miniatura que escribir; se guardan la imagen y su miniatura y la tienda las pide al BFF', async ({
    page,
  }) => {
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/productos/nuevo');
      const formulario = page.getByRole('form', { name: 'Nuevo producto' });
      for (const campo of ['Imagen principal', 'Miniatura optimizada'])
        await expect(formulario.getByRole('textbox', { name: campo, exact: true })).toHaveCount(0);
      const grupo = formulario.getByRole('group', { name: 'Imagen principal' });
      await expect(grupo).toHaveAccessibleDescription(/una versión para la ficha y una miniatura/);

      // Sin imagen no se guarda, y se dice qué falta.
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(grupo.getByRole('alert')).toHaveText('Carga la imagen principal.');

      // Un archivo que no es una foto se rechaza sin tocar la imagen.
      await formulario
        .getByLabel('Cargar imagen', { exact: true })
        .setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('hola', 'utf8') });
      await expect(grupo.getByRole('alert')).toHaveText('Usa una foto PNG, JPG o WebP.');

      await cargarImagenPrincipal(formulario);
      const vista = formulario.getByRole('img', { name: 'Imagen principal actual' });
      await expect(vista).toHaveJSProperty('naturalWidth', 1448);
      await expect(formulario.getByLabel('Reemplazar imagen', { exact: true })).toHaveCount(1);

      await formulario.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Lavadora lote 24');
      await formulario.getByRole('textbox', { name: 'SKU', exact: true }).fill(SKU);
      await formulario.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Con foto cargada.');
      await formulario.getByRole('textbox', { name: 'Característica 1', exact: true }).fill('Carga frontal');
      await formulario.getByRole('spinbutton', { name: 'Precio', exact: true }).fill('999');
      await elegir(page, formulario, 'Categoría', 'Electrohogar');
      await elegir(page, formulario, 'Marca', 'Zenith');
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      // Lotes 43 y 44 (PBI-0265 y PBI-0268): tras crear, el listado recibe `nuevo`, salta a la página del registro
      // y lo quita de la URL.
      await expect(page).toHaveURL(/\/productos(\?pagina=\d+)?$/);

      const guardado = (await leerProductos()).find((producto) => producto.sku === SKU);
      expect(guardado?.imageUrl).toMatch(/^data:image\/(webp|jpeg);base64,/);
      expect(guardado?.thumbnailUrl).toMatch(/^data:image\/(webp|jpeg);base64,/);
      expect(guardado?.thumbnailUrl.length).toBeLessThan(guardado?.imageUrl.length ?? 0);

      const api = await nuevoRequest.newContext({ baseURL: urls.bff });
      try {
        const publicos = (await (await api.get('/bff/catalog/products')).json()) as {
          sku: string;
          imageUrl: string;
          thumbnailUrl: string;
        }[];
        const publico = publicos.find((producto) => producto.sku === SKU);
        expect(publico?.imageUrl).toMatch(/^\/bff\/images\/products\/[^/]+\/image\?v=/);
        expect(publico?.thumbnailUrl).toMatch(/^\/bff\/images\/products\/[^/]+\/thumbnail\?v=/);
        const miniatura = await pedirImagen(publico?.thumbnailUrl ?? '');
        expect(miniatura).toEqual({ status: 200, tipo: expect.stringMatching(/^image\/(webp|jpeg)$/) });
      } finally {
        await api.dispose();
      }
    } finally {
      const creado = (await leerProductos()).find((producto) => producto.sku === SKU);
      if (creado) await retirarProductos([creado.id]);
    }
  });

  test('al editar, la imagen guardada antes se ve y se conserva hasta reemplazarla', async ({ page }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/productos/p-001');
    const formulario = page.getByRole('form', { name: 'Editar producto' });
    const vista = formulario.getByRole('img', { name: 'Imagen principal actual' });
    await expect(vista).toHaveAttribute('src', 'assets/products/tv-studio.jpg');
    await expect(formulario.getByLabel('Reemplazar imagen', { exact: true })).toHaveCount(1);
  });
});

test.describe('PBI-0214 y PBI-0221: el registro del banner', () => {
  test('las imágenes se cargan como archivo, el tono se calcula y la vigencia lleva fecha y hora de Lima', async ({
    page,
  }) => {
    const titulo = 'Banner del lote 24';
    try {
      await ingresarAlAdmin(page, cuentasAdmin.superadmin);
      await page.goto('/banners/nuevo');
      const formulario = page.getByRole('form', { name: 'Nuevo banner' });
      for (const campo of ['Imagen desktop', 'Imagen móvil (opcional)'])
        await expect(formulario.getByRole('textbox', { name: campo })).toHaveCount(0);
      await expect(formulario.getByRole('combobox', { name: 'Presentación de imagen' })).toHaveCount(0);
      await expect(formulario.getByRole('combobox', { name: 'Tono de la foto' })).toHaveCount(0);

      // Una foto oscura pide los controles oscuros, y la ayuda dice por qué.
      const tono = formulario.getByRole('combobox', { name: 'Controles del carrusel sobre la foto' });
      await formulario
        .getByLabel('Cargar imagen de escritorio', { exact: true })
        .setInputFiles(await pngDeColor(page, 2560, 1024, '#1f2937'));
      await expect(formulario.getByRole('img', { name: 'Imagen de escritorio, la actual' })).toBeVisible();
      await expect(tono).toHaveText('Oscuros, para fotos oscuras');
      await expect(tono).toHaveAccessibleDescription(
        /su esquina inferior derecha, donde van los controles, es oscura/,
      );
      // Una clara, los claros.
      await formulario
        .getByLabel('Reemplazar imagen de escritorio', { exact: true })
        .setInputFiles(await pngDeColor(page, 2560, 1024, '#f5f5f4'));
      await expect(tono).toHaveText('Claros, para fotos claras');
      // Y la persona lo puede corregir.
      await elegir(page, formulario, 'Controles del carrusel sobre la foto', 'Oscuros, para fotos oscuras');

      // La del celular es opcional y se puede quitar.
      await formulario
        .getByLabel('Cargar imagen del celular', { exact: true })
        .setInputFiles(await pngDeColor(page, 1100, 440, '#f5f5f4'));
      await expect(
        formulario.getByRole('img', { name: 'Imagen del celular (opcional), la actual' }),
      ).toBeVisible();
      await formulario.getByRole('button', { name: 'Quitar imagen del celular' }).click();
      await expect(
        formulario.getByRole('img', { name: 'Imagen del celular (opcional), la actual' }),
      ).toHaveCount(0);

      await expect(
        formulario.getByRole('combobox', { name: 'Cómo se ajusta la foto' }),
      ).toHaveAccessibleDescription(/puede recortar los bordes/);
      await formulario.getByRole('textbox', { name: 'Antetítulo' }).fill('Campaña');
      await formulario.getByRole('textbox', { name: 'Título', exact: true }).fill(titulo);
      await formulario.getByRole('textbox', { name: 'Descripción', exact: true }).fill('Con hora.');
      await expect(
        formulario.getByRole('textbox', { name: 'Primer botón: lo que dice' }),
      ).toHaveAccessibleDescription(/El texto que ve el comprador/);
      await formulario.getByRole('textbox', { name: 'Primer botón: lo que dice' }).fill('Ver');
      await formulario.getByRole('textbox', { name: 'Primer botón: adónde lleva' }).fill('/catalogo');
      // El tope de tres banners principales ya lo ocupan los de ejemplo: se guarda como promoción.
      await elegir(page, formulario, 'Ubicación', 'Promoción');
      await expect(formulario.getByLabel('Inicio')).toHaveAccessibleDescription('Fecha y hora de Lima.');
      await formulario.getByLabel('Inicio').fill('2030-12-10T09:30');
      await formulario.getByLabel('Fin').fill('2030-12-20T18:00');
      await formulario.getByRole('button', { name: 'Guardar', exact: true }).click();
      // Lotes 43 y 44 (PBI-0265 y PBI-0268): tras crear, el listado recibe `nuevo` con el id, salta a su página y lo
      // quita de la URL; la vigencia va en su columna y el estado, como insignia, en la suya.
      await expect(page).toHaveURL(/\/banners(\?(?!.*nuevo=)[^#]*)?$/);
      const fila = page
        .getByRole('region', { name: 'Lista de banners' })
        .getByRole('row')
        .filter({ hasText: '10/12/2030 09:30 → 20/12/2030 18:00' });
      await expect(fila).toBeVisible();
      await expect(fila.getByText('Activo', { exact: true })).toBeVisible();

      const guardado = (await leerSnapshot()).banners.find((banner) => banner.cta === 'Ver') as unknown as {
        id: string;
        imageUrl: string;
        mobileImageUrl: string;
        imageTone: string;
        startAt: string;
        endAt: string;
      };
      expect(guardado).toMatchObject({
        mobileImageUrl: '',
        imageTone: 'dark',
        startAt: '2030-12-10T09:30:00.000-05:00',
        endAt: '2030-12-20T18:00:59.999-05:00',
      });
      expect(guardado.imageUrl).toMatch(/^data:image\/(webp|jpeg);base64,/);
      const api = await nuevoRequest.newContext({ baseURL: urls.bff });
      try {
        const publicos = (await (await api.get('/bff/content/banners')).json()) as {
          id: string;
          imageUrl: string;
        }[];
        const publico = publicos.find((banner) => banner.id === guardado.id);
        expect(publico?.imageUrl).toMatch(/^\/bff\/images\/banners\/[^/]+\/image\?v=/);
        expect((await pedirImagen(publico?.imageUrl ?? '')).status).toBe(200);
      } finally {
        await api.dispose();
      }
    } finally {
      const creado = (await leerSnapshot()).banners.find((banner) => banner.cta === 'Ver');
      if (creado) await enviarCambios({ banners: { remove: [creado.id] } });
    }
  });

  test('al editar, las imágenes guardadas antes se ven y la vigencia se muestra en hora de Lima', async ({
    page,
  }) => {
    await ingresarAlAdmin(page, cuentasAdmin.superadmin);
    await page.goto('/banners');
    // Los banners de ejemplo van del 01/01/2026 00:00 al 31/12/2027 23:59 de Lima.
    await expect(
      page
        .getByRole('region', { name: 'Lista de banners' })
        .getByText(/01\/01\/2026 00:00 → 31\/12\/2027 23:59/)
        .first(),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Editar banner El cine, en tu sala.' }).click();
    const formulario = page.getByRole('form', { name: 'Editar banner' });
    await expect(formulario.getByRole('img', { name: 'Imagen de escritorio, la actual' })).toHaveAttribute(
      'src',
      'assets/brand/living-room-v4.webp',
    );
    await expect(
      formulario.getByRole('img', { name: 'Imagen del celular (opcional), la actual' }),
    ).toHaveAttribute('src', 'assets/brand/living-room-v4-mobile.webp');
    await expect(formulario.getByLabel('Inicio')).toHaveValue('2026-01-01T00:00');
    await expect(formulario.getByLabel('Fin')).toHaveValue('2027-12-31T23:59');
    await expect(formulario.getByRole('combobox', { name: 'Cómo se ajusta la foto' })).toHaveText(
      'Llena todo el espacio',
    );
  });
});
