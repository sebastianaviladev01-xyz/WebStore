import type { Locator } from '@playwright/test';

import { fondoDe } from './contraste';

/** Lo que se ve del contorno de un campo de Material: el color y el grosor del borde izquierdo y lo que hay dentro. */
export interface ContornoDelCampo {
  /** Color del borde, `rgb(r, g, b)`. */
  readonly color: string;
  /** Grosor del borde en píxeles. */
  readonly grosor: number;
  /** Color del interior del campo, `rgb(r, g, b)`: el del fondo si el campo es de contorno sin relleno. */
  readonly interior: string;
}

/**
 * Mide el contorno de un `mat-form-field` (PBI-0050) por lo que se pinta, no por las clases internas de Material
 * (`mdc-*`): captura el campo y lee, a media altura del recuadro, las columnas de píxeles desde su borde izquierdo
 * hasta llegar al interior. A 1x de densidad, un contorno de 1 o 2 px sale exacto. Es la forma de comprobar a la vez
 * los tokens, las clases de estado de Material y el aspecto que ve la persona.
 */
export async function contornoDelCampo(
  campo: Locator,
  esperado: Partial<Pick<ContornoDelCampo, 'color' | 'interior'>> = {},
): Promise<ContornoDelCampo> {
  const png = await campo.screenshot();
  const medido = await campo.page().evaluate(async (base64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const lienzo = new OffscreenCanvas(bitmap.width, bitmap.height);
    const contexto = lienzo.getContext('2d')!;
    contexto.drawImage(bitmap, 0, 0);
    // El recuadro mide 56 px de alto; el mensaje de error, si lo hay, va debajo: se lee a su mitad.
    const y = 28;
    const pixel = (x: number) => {
      const [r, g, b] = contexto.getImageData(x, y, 1, 1).data;
      return `rgb(${r}, ${g}, ${b})`;
    };
    const interior = pixel(8);
    let grosor = 0;
    while (grosor < 8 && pixel(grosor) !== interior) grosor++;
    return { color: pixel(0), grosor, interior };
  }, png.toString('base64'));
  return {
    ...medido,
    color: ajustar(medido.color, esperado.color),
    interior: ajustar(medido.interior, esperado.interior),
  };
}

/**
 * Un color calculado de `color-mix()` y el mismo color pintado pueden diferir en 1 de 255 por el redondeo: si el
 * medido está a 1 o menos de cada canal del esperado, se devuelve el esperado; si no, el medido, para ver la diferencia.
 */
function ajustar(medido: string, esperado: string | undefined): string {
  if (!esperado) return medido;
  const canales = (color: string) => color.match(/\d+/g)?.map(Number) ?? [];
  const [a, b] = [canales(medido), canales(esperado)];
  return a.length === 3 && a.every((canal, i) => Math.abs(canal - b[i]) <= 1) ? esperado : medido;
}

/**
 * Interior de un campo de contorno frente al fondo que tiene detrás: iguales si el campo no tiene relleno. Recibe el
 * control (el `textbox`); el recuadro es el `mat-form-field` que lo contiene.
 */
export async function interiorFrenteAlFondo(control: Locator): Promise<{ interior: string; fondo: string }> {
  const campo = control.locator('xpath=ancestor::mat-form-field');
  const fondo = await fondoDe(campo);
  return { interior: (await contornoDelCampo(campo, { interior: fondo })).interior, fondo };
}
