import type { Locator, Page } from '@playwright/test';

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
