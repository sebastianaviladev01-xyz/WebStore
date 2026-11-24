import { imagen, pathSegment } from '../http.mjs';

const RUTA_IMAGEN = /^\/bff\/images\/(products|banners)\/([^/]+)\/(image|thumbnail|mobile-image)$/;

/**
 * Imágenes cargadas en el Admin (lote 24, ADR-0026, PBI-0214): la imagen principal y la miniatura de un producto, y las
 * de escritorio y del celular de un banner. Son públicas, como el catálogo y los banners que las enlazan.
 */
export const imagenesRoutes = (imagenes) => [
  {
    method: 'GET',
    path: RUTA_IMAGEN,
    handle: ({ req, url, path }) => {
      const [, coleccion, id, campo] = RUTA_IMAGEN.exec(path);
      return imagen(imagenes.obtener(coleccion, pathSegment(id), campo), req, url);
    },
  },
];
