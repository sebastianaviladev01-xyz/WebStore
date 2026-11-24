import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Espera a que todas las fotos de la página terminen de cargar y de pintarse, en lugar de una pausa fija (PBI-0078):
 * los avisos de `NgOptimizedImage` (NG02952, NG02953, NG02955) salen cuando la foto carga o se pinta.
 */
export async function esperarFotos(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForFunction(() => [...document.images].every((foto) => foto.complete));
  await page.evaluate(
    () => new Promise<void>((listo) => requestAnimationFrame(() => requestAnimationFrame(() => listo()))),
  );
}

/**
 * Cuántas de las fotos (`img`) de la zona que se ven al abrir la página no son prioritarias (`fetchpriority="high"`,
 * que pone `NgOptimizedImage` con `priority`). Cualquiera de ellas puede ser la más grande al pintar, y entonces
 * Angular avisa (NG02955, PBI-0159): lo que evita el aviso siempre es que no quede ninguna.
 */
export async function fotosVisiblesSinPrioridad(
  zona: Locator,
): Promise<{ visibles: number; sinPrioridad: number }> {
  return zona.evaluate((raiz) => {
    const alto = window.innerHeight;
    const vistas = [...raiz.querySelectorAll('img')].filter(
      (foto) => foto.getBoundingClientRect().top < alto,
    );
    return {
      visibles: vistas.length,
      sinPrioridad: vistas.filter((foto) => foto.getAttribute('fetchpriority') !== 'high').length,
    };
  });
}

/**
 * Lote 24 (ADR-0026, PBI-0214): la imagen principal del producto se carga como archivo. Esta es una foto de ejemplo de
 * la tienda (1448 × 1086 px); el Admin genera con ella la versión de la ficha y la miniatura. La ruta es relativa a
 * `frontend/`, donde se ejecuta Playwright.
 */
export const FOTO_DE_PRODUCTO = 'src/assets/products/washer-studio.jpg';

/** Carga la imagen principal en el registro del producto y espera a que se vea la vista previa. */
export async function cargarImagenPrincipal(
  formulario: Locator | Page,
  foto = FOTO_DE_PRODUCTO,
): Promise<void> {
  const campo = formulario
    .getByLabel('Cargar imagen', { exact: true })
    .or(formulario.getByLabel('Reemplazar imagen', { exact: true }));
  await campo.setInputFiles(foto);
  await expect(formulario.getByRole('img', { name: 'Imagen principal actual' })).toBeVisible();
}

/** PNG de `ancho` × `alto` px de un solo color, dibujado en la página, para cargarlo como archivo (lote 24). */
export async function pngDeColor(page: Page, ancho: number, alto: number, color: string) {
  const base64 = await page.evaluate(
    ([a, h, c]) => {
      const lienzo = document.createElement('canvas');
      lienzo.width = a;
      lienzo.height = h;
      const contexto = lienzo.getContext('2d');
      if (contexto) {
        contexto.fillStyle = c;
        contexto.fillRect(0, 0, a, h);
      }
      return lienzo.toDataURL('image/png').split(',')[1];
    },
    [ancho, alto, color] as const,
  );
  return { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}
