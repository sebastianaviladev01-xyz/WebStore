import {
  BYTES_MAXIMOS_FOTO,
  CALIDADES_FOTO,
  encajeEnCuadrado,
  LADO_IMAGEN_CATEGORIA,
  LADO_MAXIMO_FOTO,
  MAX_CARACTERES_IMAGEN_CATEGORIA,
  medidasReducidas,
  primeraQueCabe,
} from '../domain/foto.rules';

/** Peso máximo del archivo que se acepta para reducir (lo que pesa en el disco, antes de reducirlo). */
export const BYTES_MAXIMOS_ARCHIVO = 15 * 1024 * 1024;

/** Motivo por el que una foto no se pudo usar, listo para mostrarse. */
export const MENSAJE_FOTO_NO_CABE = `No pudimos reducir la foto a ${Math.round(BYTES_MAXIMOS_FOTO / 1024)} KB. Usa otra más simple o una URL.`;

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
