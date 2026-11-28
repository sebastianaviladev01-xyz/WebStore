import { expect, test, type Page } from '@playwright/test';

/**
 * Lote 52 (ADR-0037; decisiones de Sebastián Avila del 2026-11-27, «Lotes 50 a 56»): PBI-0278, el orden del catálogo
 * de la tienda, y PBI-0282, la foto ampliada de la ficha del producto. Datos del seed del BFF de prueba.
 */
const nombres = (page: Page) =>
  page.getByRole('main').getByRole('article').getByRole('heading', { level: 3 }).allTextContents();
const ordenarPor = (page: Page) => page.getByRole('combobox', { name: 'Ordenar por' });

async function elegir(page: Page, filtro: string, opcion: string): Promise<void> {
  await page.getByRole('combobox', { name: filtro }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);
}

/** Los seis productos del seed en el orden en que los da el BFF: el de «Relevancia». */
const RELEVANCIA = [
  'OLED Vision 55” 4K',
  'Lavadora SmartWash 18 kg',
  'Refrigeradora FreshMax 420 L',
  'Soundbar Cinema 500',
  'Monitor UltraWide 34”',
  'Microondas EasyCook 30 L',
];

test.describe('PBI-0278: ordenar el catálogo', () => {
  test('ordena por precio y por nombre, lo guarda en la dirección y lo combina con los filtros', async ({
    page,
  }) => {
    await page.goto('/catalogo');
    await expect(ordenarPor(page)).toHaveText('Relevancia');
    await expect.poll(() => nombres(page)).toEqual(RELEVANCIA);

    await elegir(page, 'Ordenar por', 'Precio: mayor a menor');
    await expect(page).toHaveURL(/[?&]orden=precio-desc(&|$)/);
    await expect
      .poll(() => nombres(page))
      .toEqual([
        'OLED Vision 55” 4K',
        'Refrigeradora FreshMax 420 L',
        'Lavadora SmartWash 18 kg',
        'Monitor UltraWide 34”',
        'Soundbar Cinema 500',
        'Microondas EasyCook 30 L',
      ]);
    // El orden no es un filtro: el conteo no cambia y no aparece «Limpiar filtros».
    await expect(page.getByText('6 productos', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Limpiar filtros' })).toHaveCount(0);

    await elegir(page, 'Ordenar por', 'Precio: menor a mayor');
    await expect(page).toHaveURL(/[?&]orden=precio-asc(&|$)/);
    await expect
      .poll(() => nombres(page))
      .toEqual([
        'Microondas EasyCook 30 L',
        'Soundbar Cinema 500',
        'Monitor UltraWide 34”',
        'Lavadora SmartWash 18 kg',
        'Refrigeradora FreshMax 420 L',
        'OLED Vision 55” 4K',
      ]);

    await elegir(page, 'Ordenar por', 'Nombre: A–Z');
    await expect
      .poll(() => nombres(page))
      .toEqual([
        'Lavadora SmartWash 18 kg',
        'Microondas EasyCook 30 L',
        'Monitor UltraWide 34”',
        'OLED Vision 55” 4K',
        'Refrigeradora FreshMax 420 L',
        'Soundbar Cinema 500',
      ]);

    await elegir(page, 'Ordenar por', 'Nombre: Z–A');
    await expect(page).toHaveURL(/[?&]orden=nombre-desc(&|$)/);
    await expect
      .poll(() => nombres(page))
      .toEqual([
        'Soundbar Cinema 500',
        'Refrigeradora FreshMax 420 L',
        'OLED Vision 55” 4K',
        'Monitor UltraWide 34”',
        'Microondas EasyCook 30 L',
        'Lavadora SmartWash 18 kg',
      ]);

    // Un filtro conserva el orden, y el orden conserva el filtro.
    await elegir(page, 'Categoría', 'TV y audio');
    await expect(page).toHaveURL(/categoria=cat-tv/);
    await expect(page).toHaveURL(/orden=nombre-desc/);
    await expect.poll(() => nombres(page)).toEqual(['Soundbar Cinema 500', 'OLED Vision 55” 4K']);
    await elegir(page, 'Ordenar por', 'Precio: menor a mayor');
    await expect(page).toHaveURL(/categoria=cat-tv/);
    await expect.poll(() => nombres(page)).toEqual(['Soundbar Cinema 500', 'OLED Vision 55” 4K']);
    await page.getByRole('textbox', { name: 'Precio mínimo (S/)' }).fill('1000');
    await page.getByRole('textbox', { name: 'Precio mínimo (S/)' }).press('Enter');
    await expect(page).toHaveURL(/precioMin=1000/);
    await expect(page).toHaveURL(/orden=precio-asc/);
    await expect.poll(() => nombres(page)).toEqual(['OLED Vision 55” 4K']);

    // «Limpiar filtros» quita los filtros y deja el orden.
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page).toHaveURL(/\/catalogo\?orden=precio-asc$/);
    await expect.poll(() => nombres(page)).toHaveLength(6);
    await expect(ordenarPor(page)).toHaveText('Precio: menor a mayor');

    // Volver a «Relevancia» quita el parámetro de la dirección.
    await elegir(page, 'Ordenar por', 'Relevancia');
    await expect(page).toHaveURL(/\/catalogo$/);
    await expect.poll(() => nombres(page)).toEqual(RELEVANCIA);
  });

  test('un orden desconocido en la dirección se lee como «Relevancia»; uno válido se abre ya ordenado', async ({
    page,
  }) => {
    await page.goto('/catalogo?orden=lo-mas-barato');
    await expect(ordenarPor(page)).toHaveText('Relevancia');
    await expect.poll(() => nombres(page)).toEqual(RELEVANCIA);

    await page.goto('/catalogo?buscar=o&orden=nombre-asc');
    await expect(ordenarPor(page)).toHaveText('Nombre: A–Z');
    const lista = await nombres(page);
    expect(lista).toEqual([...lista].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })));
    expect(lista.length).toBeGreaterThan(1);
  });

  test('a 375 px el orden se ve con su etiqueta, en su propia fila y sin desbordar la página', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/catalogo');
    const control = ordenarPor(page);
    await expect(control).toBeVisible();
    await expect(page.getByText('Ordenar por', { exact: true }).filter({ visible: true })).toBeVisible();
    const caja = await control.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.x).toBeGreaterThanOrEqual(0);
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(375);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho).toBeLessThanOrEqual(375);

    await elegir(page, 'Ordenar por', 'Precio: mayor a menor');
    await expect.poll(async () => (await nombres(page))[0]).toBe('OLED Vision 55” 4K');
  });
});

test.describe('PBI-0282: ampliar la foto de la ficha', () => {
  const vista = (page: Page) => page.getByRole('dialog', { name: 'OLED Vision 55” 4K' });

  test('abre la foto grande con la galería, se recorre con botones y flechas, y Esc devuelve el foco', async ({
    page,
  }) => {
    await page.goto('/catalogo/oled-vision-55-4k');
    const foto = page.getByRole('button', { name: 'Ampliar foto 1 de 2: OLED Vision 55” 4K' });
    await expect(foto).toBeVisible();
    await expect(foto).toHaveCSS('cursor', 'zoom-in');

    await foto.click();
    await expect(vista(page)).toBeVisible();
    await expect(vista(page).getByText('Foto 1 de 2')).toBeVisible();
    // La foto grande de la ficha, no la miniatura de 480 px.
    const imagen = vista(page).getByRole('img', { name: 'OLED Vision 55” 4K, foto 1 de 2' });
    await expect(imagen).toHaveAttribute('src', /tv-studio\.jpg/);
    await expect(imagen).not.toHaveAttribute('src', /-480\./);

    await page.keyboard.press('ArrowRight');
    await expect(vista(page).getByText('Foto 2 de 2')).toBeVisible();
    await expect(vista(page).getByRole('img', { name: 'OLED Vision 55” 4K, foto 2 de 2' })).toBeVisible();
    // Al final da la vuelta.
    await vista(page).getByRole('button', { name: 'Foto siguiente' }).click();
    await expect(vista(page).getByText('Foto 1 de 2')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(vista(page).getByText('Foto 2 de 2')).toBeVisible();
    await vista(page).getByRole('button', { name: 'Foto anterior' }).click();
    await expect(vista(page).getByText('Foto 1 de 2')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(vista(page).getByText('Foto 2 de 2')).toBeVisible();

    // Esc cierra; la ficha queda en la foto que se veía y el foco vuelve a la foto.
    await page.keyboard.press('Escape');
    await expect(vista(page)).toHaveCount(0);
    const fotoDos = page.getByRole('button', { name: 'Ampliar foto 2 de 2: OLED Vision 55” 4K' });
    await expect(fotoDos).toBeFocused();
    await expect(page.getByRole('button', { name: 'Ver foto 2 de 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Con el teclado: Enter la abre en la misma foto y el botón visible «Cerrar foto ampliada» la cierra.
    await page.keyboard.press('Enter');
    await expect(vista(page).getByText('Foto 2 de 2')).toBeVisible();
    await vista(page).getByRole('button', { name: 'Cerrar foto ampliada' }).click();
    await expect(vista(page)).toHaveCount(0);
    await expect(fotoDos).toBeFocused();
  });

  test('con una sola foto no hay anterior ni siguiente', async ({ page }) => {
    await page.goto('/catalogo/lavadora-smartwash-18-kg');
    await page.getByRole('button', { name: 'Ampliar foto: Lavadora SmartWash 18 kg' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Lavadora SmartWash 18 kg' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('img', { name: 'Lavadora SmartWash 18 kg' })).toBeVisible();
    await expect(dialogo.getByRole('button', { name: /^Foto (anterior|siguiente)$/ })).toHaveCount(0);
    await expect(dialogo.getByText(/^Foto \d de \d$/)).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    await expect(dialogo.getByRole('img', { name: 'Lavadora SmartWash 18 kg' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialogo).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ampliar foto: Lavadora SmartWash 18 kg' })).toBeFocused();
  });

  test('a 375 px la vista ampliada ocupa toda la pantalla', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/catalogo/oled-vision-55-4k');
    await page.getByRole('button', { name: /^Ampliar foto 1 de 2/ }).click();
    await expect(vista(page)).toBeVisible();
    await expect
      .poll(async () => {
        const caja = await vista(page).boundingBox();
        return (
          caja && [Math.round(caja.x), Math.round(caja.y), Math.round(caja.width), Math.round(caja.height)]
        );
      })
      .toEqual([0, 0, 375, 812]);
    await expect(vista(page).getByRole('button', { name: 'Cerrar foto ampliada' })).toBeVisible();
    await expect(vista(page).getByRole('button', { name: 'Foto siguiente' })).toBeVisible();
    await vista(page).getByRole('button', { name: 'Foto siguiente' }).click();
    await expect(vista(page).getByText('Foto 2 de 2')).toBeVisible();
  });
});
