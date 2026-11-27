import { createHash } from 'node:crypto';

import { bytesDeImagen } from '../../domain/catalogo/imagen.rules.mjs';
import { galleryOf } from '../../domain/catalogo/producto.rules.mjs';
import { DomainError } from '../../domain/comun/domain-error.mjs';

/**
 * Imágenes cargadas en el Admin servidas por dirección (lote 24, ADR-0026, PBI-0214; confirmado por Sebastián Avila).
 * El BFF de prueba las guarda como Data URL en su estado, pero la tienda no las recibe dentro del JSON: recibe
 * `/bff/images/{collection}/{id}/{field}?v={versión}`, una dirección que la tienda trata como cualquier foto
 * (`NgOptimizedImage` no admite Data URL) y que el navegador guarda en caché. La versión es un resumen de la imagen:
 * cambia cuando cambia la imagen. Qué campos se sirven así, por colección y nombre en la dirección:
 */
const CAMPOS = {
  products: { image: 'imageUrl', thumbnail: 'thumbnailUrl' },
  banners: { image: 'imageUrl', 'mobile-image': 'mobileImageUrl' },
  // Lote 25 (ADR-0026): la imagen de la categoría también; las fotos de la galería, por posición (`gallery/{n}`).
  categories: { image: 'imageUrl' },
};

/** Foto de la galería por su posición entre las fotos válidas (`galleryOf`), la misma que usa su dirección. */
const FOTO_DE_GALERIA = /^gallery\/(\d{1,2})$/;

/** Versiones ya calculadas: el mismo texto guardado se resume una vez (se vacía al pasar de `MAXIMO_EN_MEMORIA`). */
const versiones = new Map();
const MAXIMO_EN_MEMORIA = 500;

/** Resumen corto (SHA-256 en base64url, 12 caracteres) de una imagen guardada. */
export function versionDeImagen(valor) {
  let version = versiones.get(valor);
  if (version === undefined) {
    if (versiones.size >= MAXIMO_EN_MEMORIA) versiones.clear();
    version = createHash('sha256').update(valor).digest('base64url').slice(0, 12);
    versiones.set(valor, version);
  }
  return version;
}

/**
 * Solo una Data URL PNG, JPEG o WebP se sirve por dirección (se mira el prefijo, no los bytes: se validaron al guardarla).
 * Otra guardada antes, como la SVG de una categoría del lote 07b, sigue llegando dentro del JSON.
 */
const esServible = (valor) => typeof valor === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(valor);

/**
 * Dirección pública de una imagen: si está guardada como Data URL servible, la del BFF con su versión; si no (una ruta
 * de `assets/`, vacía o ausente), tal cual.
 */
export function direccionDeImagen(coleccion, id, campo, valor) {
  if (!esServible(valor)) return valor;
  return `/bff/images/${coleccion}/${encodeURIComponent(id)}/${campo}?v=${versionDeImagen(valor)}`;
}

/** Lo guardado en `campo` de un registro: una propiedad de `CAMPOS` o, en un producto, una foto de su galería. */
function valorGuardado(coleccion, registro, campo) {
  const foto = coleccion === 'products' ? FOTO_DE_GALERIA.exec(campo) : null;
  if (foto) return galleryOf(registro)[Number(foto[1])];
  const campos = Object.hasOwn(CAMPOS, coleccion) ? CAMPOS[coleccion] : {};
  return Object.hasOwn(campos, campo) ? registro[campos[campo]] : undefined;
}

/** `GET /bff/images/{collection}/{id}/{field}`: el tipo, los bytes y la versión de una imagen cargada. */
export function createImagenesQueries({ store }) {
  return {
    obtener(coleccion, id, campo) {
      const registros = Object.hasOwn(CAMPOS, coleccion) ? store.state[coleccion] : undefined;
      const registro = registros?.find((item) => item.id === id);
      const valor = registro ? valorGuardado(coleccion, registro, campo) : undefined;
      const imagen = esServible(valor) ? bytesDeImagen(valor) : null;
      if (!imagen) throw new DomainError('not-found', 'IMAGE_NOT_FOUND', 'Imagen no encontrada.');
      return { ...imagen, version: versionDeImagen(valor) };
    },
  };
}
