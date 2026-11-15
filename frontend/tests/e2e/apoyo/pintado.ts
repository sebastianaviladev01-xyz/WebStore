import type { Locator } from '@playwright/test';

/**
 * Lectura de lo que se pinta (PBI-0164): captura un elemento y lee sus píxeles, sin recorrer la estructura interna
 * de Material (`nextElementSibling`, `children[n]`, `mat-pseudo-checkbox`, pseudoelementos). Si Material cambia su
 * DOM, estas medidas siguen valiendo mientras el control se vea igual. A 1x de densidad, un borde de 1 o 2 px sale
 * exacto. `apoyo/campos.ts` hace lo mismo con el contorno de un campo.
 */

/** Un píxel: canales de 0 a 255. */
export type Pixel = readonly [number, number, number];

export interface Imagen {
  readonly ancho: number;
  readonly alto: number;
  pixel(x: number, y: number): Pixel;
}

/** Un píxel como `rgb(r, g, b)`, el formato de los colores calculados que usan las e2e de contraste. */
export const aRgb = ([r, g, b]: Pixel): string => `rgb(${r}, ${g}, ${b})`;

/** Diferencia entre dos píxeles: la suma de las de sus tres canales. */
export const distancia = (a: Pixel, b: Pixel): number =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

/** Un salto de color que separa un borde o un relleno de lo que lo rodea (un velo de estado no llega a 60). */
export const SALTO = 60;

/** Captura el elemento tal como se ve y lo decodifica en la página (PNG → lienzo), para leer sus píxeles en Node. */
export async function capturar(elemento: Locator): Promise<Imagen> {
  const png = await elemento.screenshot();
  const { ancho, alto, datos } = await elemento.page().evaluate(async (base64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const lienzo = new OffscreenCanvas(bitmap.width, bitmap.height);
    const contexto = lienzo.getContext('2d')!;
    contexto.drawImage(bitmap, 0, 0);
    return {
      ancho: bitmap.width,
      alto: bitmap.height,
      datos: Array.from(contexto.getImageData(0, 0, bitmap.width, bitmap.height).data),
    };
  }, png.toString('base64'));
  return {
    ancho,
    alto,
    pixel(x, y) {
      if (x < 0 || y < 0 || x >= ancho || y >= alto) throw new Error(`Píxel fuera de la captura: ${x}, ${y}`);
      const i = (y * ancho + x) * 4;
      return [datos[i], datos[i + 1], datos[i + 2]];
    },
  };
}

/** De los píxeles que da `candidatos`, el más distinto de `referencia`: el trazo, que se lee aunque lo suavice el borde. */
export function masDistinto(referencia: Pixel, candidatos: Iterable<Pixel>): Pixel {
  let elegido = referencia;
  let mayor = -1;
  for (const candidato of candidatos) {
    const diferencia = distancia(candidato, referencia);
    if (diferencia > mayor) {
      mayor = diferencia;
      elegido = candidato;
    }
  }
  return elegido;
}

/** Los píxeles del rectángulo `[x0, x1] × [y0, y1]`, ambos extremos incluidos. */
export function* rectangulo(
  imagen: Imagen,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Generator<Pixel> {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) yield imagen.pixel(x, y);
}

/** Salto mínimo para dar por visto un borde: por debajo, el recuadro del control no se distingue de lo que lo rodea. */
const SALTO_MINIMO = 20;

/**
 * Primera columna de la fila `y`, entre 1 y `hasta`, donde el color salta casi tanto como en el salto mayor: el borde
 * del recuadro de un control (el velo de estado, mucho más suave, no lo confunde). Un borde casi invisible falla con
 * un mensaje claro; uno poco contrastado se mide, y es la aserción de contraste la que falla.
 */
export function bordeIzquierdo(imagen: Imagen, y: number, hasta: number, que: string): number {
  const saltos: number[] = [];
  for (let x = 1; x < hasta; x++) saltos.push(distancia(imagen.pixel(x, y), imagen.pixel(x - 1, y)));
  const mayor = Math.max(...saltos);
  if (mayor < SALTO_MINIMO) throw new Error(`No se ve el borde de ${que}`);
  return saltos.findIndex((salto) => salto >= mayor * 0.6) + 1;
}
