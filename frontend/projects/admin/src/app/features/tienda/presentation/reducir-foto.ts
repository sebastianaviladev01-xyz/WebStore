import { BYTES_MAXIMOS_FOTO, CALIDADES_FOTO, medidasReducidas, primeraQueCabe } from '../domain/foto.rules';

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
export async function reducirFoto(archivo: Blob): Promise<string | null> {
  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    return null;
  }
  const { ancho, alto } = medidasReducidas(imagen.width, imagen.height);
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
  return primeraQueCabe(CALIDADES_FOTO.map((calidad) => lienzo.toDataURL(tipo, calidad)));
}
