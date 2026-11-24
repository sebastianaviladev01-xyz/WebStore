import { createHash } from 'node:crypto';

import { bytesDeImagen } from '../../domain/catalogo/imagen.rules.mjs';
import { DomainError } from '../../domain/comun/domain-error.mjs';

/**
 * Imágenes cargadas en el Admin servidas por dirección (lote 24, ADR-0026, PBI-0214; provisional). El BFF de prueba las
 * guarda como Data URL en su estado, pero la tienda no las recibe dentro del JSON: recibe
 * `/bff/images/{collection}/{id}/{field}?v={versión}`, una dirección que la tienda trata como cualquier foto
 * (`NgOptimizedImage` no admite Data URL) y que el navegador guarda en caché. La versión es un resumen de la imagen:
 * cambia cuando cambia la imagen. Qué campos se sirven así, por colección y nombre en la dirección:
 */
const CAMPOS = {
  products: { image: 'imageUrl', thumbnail: 'thumbnailUrl' },
  banners: { image: 'imageUrl', 'mobile-image': 'mobileImageUrl' },
};

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

const esDataUrl = (valor) => typeof valor === 'string' && valor.startsWith('data:');

/**
 * Dirección pública de una imagen: si está guardada como Data URL, la del BFF con su versión; si no (una ruta de
 * `assets/`, vacía o ausente), tal cual.
 */
export function direccionDeImagen(coleccion, id, campo, valor) {
  if (!esDataUrl(valor)) return valor;
  return `/bff/images/${coleccion}/${encodeURIComponent(id)}/${campo}?v=${versionDeImagen(valor)}`;
}

/** `GET /bff/images/{collection}/{id}/{field}`: el tipo, los bytes y la versión de una imagen cargada. */
export function createImagenesQueries({ store }) {
  return {
    obtener(coleccion, id, campo) {
      const campos = Object.hasOwn(CAMPOS, coleccion) ? CAMPOS[coleccion] : {};
      const propiedad = Object.hasOwn(campos, campo) ? campos[campo] : undefined;
      const registro = propiedad ? store.state[coleccion].find((item) => item.id === id) : undefined;
      const valor = registro?.[propiedad];
      const imagen = esDataUrl(valor) ? bytesDeImagen(valor) : null;
      if (!imagen) throw new DomainError('not-found', 'IMAGE_NOT_FOUND', 'Imagen no encontrada.');
      return { ...imagen, version: versionDeImagen(valor) };
    },
  };
}
