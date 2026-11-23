/**
 * Enlaces de los banners (lote 06, ADR-0017; PBI-0128). Una dirección externa (`https://…`, `http://…` o
 * `mailto:`) va en un `href` normal; el resto es una ruta de la tienda y pasa por el router.
 */
export const esEnlaceExterno = (url: string): boolean => /^(https?:\/\/|mailto:)/i.test(url.trim());

/**
 * Lote 12 (ADR-0021), PBI-0174: un enlace a otra web (`https://…` o `http://…`) se abre en otra pestaña, con
 * `rel="noopener noreferrer"`. `mailto:` abre el correo y las rutas de la tienda siguen en la misma pestaña.
 */
export const abreEnOtraPestana = (url: string): boolean => /^https?:\/\//i.test(url.trim());
