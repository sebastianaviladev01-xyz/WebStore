/**
 * Enlaces de los banners (lote 06, ADR-0017; PBI-0128). Una dirección externa (`https://…`, `http://…` o
 * `mailto:`) va en un `href` normal; el resto es una ruta de la tienda y pasa por el router.
 */
export const esEnlaceExterno = (url: string): boolean => /^(https?:\/\/|mailto:)/i.test(url.trim());
