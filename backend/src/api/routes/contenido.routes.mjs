import { ok } from '../http.mjs';

/** Contenido público: configuración del CMS y banners. */
export const contenidoRoutes = (contenido) => [
  { method: 'GET', path: '/bff/content/settings', handle: () => ok(contenido.getSettings()) },
  { method: 'GET', path: '/bff/content/banners', handle: () => ok(contenido.listBanners()) },
];
