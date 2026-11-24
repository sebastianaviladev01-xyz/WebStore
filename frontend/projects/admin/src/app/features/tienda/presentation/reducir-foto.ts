import {
  BYTES_MAXIMOS_FOTO,
  CALIDADES_FOTO,
  encajeEnCuadrado,
  LADO_IMAGEN_CATEGORIA,
  LADO_MAXIMO_FOTO,
  LIMITE_ARCHIVO_FOTO,
  MAX_CARACTERES_IMAGEN_CATEGORIA,
  MAX_CARACTERES_MINIATURA,
  medidasDeMiniatura,
  medidasReducidas,
  primeraQueCabe,
} from '../domain/foto.rules';
import { TonoDeFoto, tonoDeLaZona, zonaDeLosControles } from '../domain/tono-de-foto.rules';

/** Peso máximo del archivo que se acepta para reducir (lo que pesa en el disco, antes de reducirlo). */
export const BYTES_MAXIMOS_ARCHIVO = LIMITE_ARCHIVO_FOTO;

/** Motivo por el que el logo no se pudo usar, listo para mostrarse (el logo aún admite una URL). */
export const MENSAJE_FOTO_NO_CABE = `No pudimos reducir la foto a ${Math.round(BYTES_MAXIMOS_FOTO / 1024)} KB. Usa otra más simple o una URL.`;

/** Lote 25 (ADR-0026): lo mismo para una foto de la galería, que ya no admite una URL. */
export const MENSAJE_FOTO_DE_GALERIA_NO_CABE = `No pudimos reducir la foto a ${Math.round(BYTES_MAXIMOS_FOTO / 1024)} KB. Usa otra más simple.`;

/**
 * Reduce y comprime una foto en el navegador antes de guardarla como Data URL (lote 06, PBI-0119): lado mayor de
 * `LADO_MAXIMO_FOTO` px y la primera calidad de `CALIDADES_FOTO` que cabe en `BYTES_MAXIMOS_FOTO`. Usa WebP, que
 * conserva la transparencia (logos); si el navegador no lo genera, JPEG sobre el fondo de la superficie. Devuelve `null` si ni
 * con la menor calidad cabe o si el archivo no se puede leer como imagen.
 */
export async function reducirFoto(
  archivo: Blob,
  { ladoMaximo = LADO_MAXIMO_FOTO, maximo = BYTES_MAXIMOS_FOTO } = {},
): Promise<string | null> {
  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    return null;
  }
  const { ancho, alto } = medidasReducidas(imagen.width, imagen.height, ladoMaximo);
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext('2d');
  if (!contexto) {
    imagen.close();
    return null;
  }
  contexto.drawImage(imagen, 0, 0, ancho, alto);
  const webp = lienzo.toDataURL('image/webp', CALIDADES_FOTO[0]).startsWith('data:image/webp');
  if (!webp) {
    contexto.globalCompositeOperation = 'destination-over';
    // Fondo de la superficie del tema (los colores viven en los tokens, no en el código).
    contexto.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ws-surface').trim();
    contexto.fillRect(0, 0, ancho, alto);
  }
  imagen.close();
  const tipo = webp ? 'image/webp' : 'image/jpeg';
  return primeraQueCabe(
    CALIDADES_FOTO.map((calidad) => lienzo.toDataURL(tipo, calidad)),
    maximo,
  );
}

/**
 * Versión única de la imagen de una categoría (lote 11, ADR-0021, PBI-0176; provisional): un cuadrado de
 * `LADO_IMAGEN_CATEGORIA` px con la foto entera, centrada y sin agrandar (`encajeEnCuadrado`), comprimida hasta que cabe
 * en lo que acepta el BFF. El BFF de prueba no reduce imágenes, solo comprueba el formato y las medidas. Usa WebP, que
 * conserva la transparencia; si el navegador no lo genera, JPEG sobre el fondo de la superficie. Devuelve `null` si el
 * archivo no se puede leer como imagen o si ni con la menor calidad cabe.
 */
export async function imagenDeCategoria(archivo: Blob): Promise<string | null> {
  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    return null;
  }
  const lado = LADO_IMAGEN_CATEGORIA;
  const encaje = encajeEnCuadrado(imagen.width, imagen.height, lado);
  const lienzo = document.createElement('canvas');
  lienzo.width = lado;
  lienzo.height = lado;
  const contexto = lienzo.getContext('2d');
  if (!contexto) {
    imagen.close();
    return null;
  }
  const webp = lienzo.toDataURL('image/webp').startsWith('data:image/webp');
  if (!webp) {
    // Fondo de la superficie del tema (los colores viven en los tokens, no en el código).
    contexto.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ws-surface').trim();
    contexto.fillRect(0, 0, lado, lado);
  }
  contexto.drawImage(imagen, encaje.x, encaje.y, encaje.ancho, encaje.alto);
  imagen.close();
  const tipo = webp ? 'image/webp' : 'image/jpeg';
  return primeraQueCabe(
    CALIDADES_FOTO.map((calidad) => lienzo.toDataURL(tipo, calidad)),
    MAX_CARACTERES_IMAGEN_CATEGORIA,
  );
}

/** Lienzo de `ancho` × `alto` con `fuente` dibujada encima; sin WebP, sobre el fondo de la superficie del tema. */
function dibujar(
  fuente: CanvasImageSource,
  ancho: number,
  alto: number,
): { lienzo: HTMLCanvasElement; tipo: string } | null {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext('2d');
  if (!contexto) return null;
  const webp = lienzo.toDataURL('image/webp').startsWith('data:image/webp');
  if (!webp) {
    // Fondo de la superficie del tema (los colores viven en los tokens, no en el código).
    contexto.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ws-surface').trim();
    contexto.fillRect(0, 0, ancho, alto);
  }
  contexto.drawImage(fuente, 0, 0, ancho, alto);
  return { lienzo, tipo: webp ? 'image/webp' : 'image/jpeg' };
}

/** La primera calidad de `CALIDADES_FOTO` con la que el lienzo cabe en `maximo` caracteres, o `null`. */
const comprimir = ({ lienzo, tipo }: { lienzo: HTMLCanvasElement; tipo: string }, maximo: number) =>
  primeraQueCabe(
    CALIDADES_FOTO.map((calidad) => lienzo.toDataURL(tipo, calidad)),
    maximo,
  );

/**
 * Imagen principal y miniatura de un producto a partir de un solo archivo (lote 24, ADR-0026, PBI-0214; provisional):
 * la de la ficha, con el lado mayor reducido a `LADO_MAXIMO_FOTO` px, y la miniatura de los listados, que es esa misma
 * imagen reducida a `LADO_MINIATURA` px (el BFF comprueba que lo sea). Devuelve `null` si el archivo no se puede leer
 * como imagen o si alguna versión no cabe ni con la menor calidad.
 */
export async function versionesDelProducto(
  archivo: Blob,
): Promise<{ imagen: string; miniatura: string } | null> {
  let original: ImageBitmap;
  try {
    original = await createImageBitmap(archivo);
  } catch {
    return null;
  }
  const grande = medidasReducidas(original.width, original.height, LADO_MAXIMO_FOTO);
  const principal = dibujar(original, grande.ancho, grande.alto);
  original.close();
  if (!principal) return null;
  const chica = medidasDeMiniatura(grande.ancho, grande.alto);
  const reducida = dibujar(principal.lienzo, chica.ancho, chica.alto);
  const imagen = comprimir(principal, BYTES_MAXIMOS_FOTO);
  const miniatura = reducida ? comprimir(reducida, MAX_CARACTERES_MINIATURA) : null;
  return imagen && miniatura ? { imagen, miniatura } : null;
}

/**
 * Imagen del banner a partir de un archivo (lote 24, ADR-0026, PBI-0214 y PBI-0221; provisional): reducida a
 * `ladoMaximo` px de lado mayor y comprimida hasta caber en `maximo` caracteres, con el tono de la esquina inferior
 * derecha, donde van los controles del carrusel (`tonoDeLaZona`). Devuelve `null` si el archivo no se puede leer como
 * imagen o si no cabe ni con la menor calidad.
 */
export async function imagenDelBanner(
  archivo: Blob,
  { ladoMaximo, maximo }: { ladoMaximo: number; maximo: number },
): Promise<{ imagen: string; tono: TonoDeFoto } | null> {
  let original: ImageBitmap;
  try {
    original = await createImageBitmap(archivo);
  } catch {
    return null;
  }
  const medidas = medidasReducidas(original.width, original.height, ladoMaximo);
  const dibujo = dibujar(original, medidas.ancho, medidas.alto);
  original.close();
  if (!dibujo) return null;
  const zona = zonaDeLosControles(medidas.ancho, medidas.alto);
  const pixeles = dibujo.lienzo.getContext('2d')?.getImageData(zona.x, zona.y, zona.ancho, zona.alto).data;
  const imagen = comprimir(dibujo, maximo);
  return imagen ? { imagen, tono: pixeles ? tonoDeLaZona(pixeles) : 'light' } : null;
}
