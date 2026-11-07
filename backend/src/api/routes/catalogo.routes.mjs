import { ok } from '../http.mjs';

/** Catálogo público. El detalle se busca por el slug del último segmento de la ruta. */
export const catalogoRoutes = (catalogo) => [
  { method: 'GET', path: '/bff/catalog/categories', handle: () => ok(catalogo.listCategories()) },
  { method: 'GET', path: '/bff/catalog/products', handle: () => ok(catalogo.listProducts()) },
  {
    method: 'GET',
    path: /^\/bff\/catalog\/products\//,
    handle: ({ path }) => ok(catalogo.findProductBySlug(decodeURIComponent(path.split('/').pop()))),
  },
];
