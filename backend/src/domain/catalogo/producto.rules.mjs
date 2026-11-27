import { DomainError } from '../comun/domain-error.mjs';
import { slugify } from './slug.mjs';

/** Fotos adicionales válidas de la ficha (sin la imagen principal). */
export function galleryOf(product) {
  return Array.isArray(product.gallery)
    ? product.gallery.filter((url) => typeof url === 'string' && url.trim())
    : [];
}

/**
 * Un rol que crea y modifica productos sin `products.delete` (el vendedor, lote 07, PBI-0013) no puede dejar fuera
 * ningún producto vigente, ni con `remove` ni enviando la lista sin él.
 */
export function requireNoRemovedProducts(currentProducts, products) {
  const nextIds = new Set(products.map((product) => product.id));
  if (currentProducts.some((product) => !nextIds.has(product.id)))
    throw new DomainError('forbidden', 'CATALOG_SCOPE_VIOLATION', 'Tu rol no puede eliminar productos.');
}

/**
 * Dirección de ficha única (PBI-0129): la tienda abre la ficha por el slug del nombre, así que dos productos con el
 * mismo slug dejan una ficha inalcanzable. Solo se revisan los productos nuevos o cuyo slug cambia: dos que ya lo
 * compartían no bloquean el guardado de otro.
 */
export function requireUniqueSlugs(products, previous) {
  const previousSlug = new Map(previous.map((product) => [product.id, slugify(product.name)]));
  for (const product of products) {
    const slug = slugify(product.name);
    if (previousSlug.get(product.id) === slug) continue;
    const other = products.find(
      (candidate) => candidate.id !== product.id && slugify(candidate.name) === slug,
    );
    if (other)
      throw new DomainError(
        'validation',
        'INVALID_COLLECTION',
        `Revisa los productos: la dirección de ficha ${slug} ya la usa «${other.name}». Cambia el nombre.`,
        { collection: 'products', field: 'slug', id: product.id },
      );
  }
}

const cuantos = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

/**
 * Una marca o una categoría eliminadas en este guardado no pueden seguir en uso por un producto (PBI-0131): la
 * tienda mostraría «Marca» o «Categoría» en su lugar. `previous` y `next` son las listas antes y después.
 */
export function requireRemovedNotInUse(
  products,
  { previousBrands, nextBrands, previousCategories, nextCategories },
) {
  const removed = (before, after) => before.filter((item) => !after.some((other) => other.id === item.id));
  for (const brand of removed(previousBrands, nextBrands)) {
    const count = products.filter((product) => product.brandId === brand.id).length;
    if (count)
      throw new DomainError(
        'conflict',
        'BRAND_IN_USE',
        `No se puede eliminar la marca «${brand.name}»: la ${count === 1 ? 'usa' : 'usan'} ${cuantos(count, 'producto', 'productos')}. ${count === 1 ? 'Cámbiale' : 'Cámbiales'} la marca antes de eliminarla.`,
        { brandId: brand.id, products: count },
      );
  }
  for (const category of removed(previousCategories, nextCategories)) {
    const count = products.filter((product) => product.categoryId === category.id).length;
    if (count)
      throw new DomainError(
        'conflict',
        'CATEGORY_IN_USE',
        `No se puede eliminar la categoría «${category.name}»: la ${count === 1 ? 'usa' : 'usan'} ${cuantos(count, 'producto', 'productos')}. ${count === 1 ? 'Cámbiale' : 'Cámbiales'} la categoría antes de eliminarla.`,
        { categoryId: category.id, products: count },
      );
  }
}

/** Cuántos productos destacaba el BFF antes del lote 22: los primeros activos del catálogo. */
const DESTACADOS_ANTERIORES = 4;

/**
 * Marca de destacado de cada producto (lote 22, ADR-0025, PBI-0215; confirmado por Sebastián Avila). Con
 * `migrar`, la de un estado guardado antes del lote: un producto sin marca booleana recibe la que le daba el BFF hasta
 * entonces (`featured ?? posición < 4` entre los activos), así la tienda se ve igual. Sin `migrar`, un producto sin
 * marca no es destacado.
 */
export function conMarcaDeDestacado(products, { migrar = false } = {}) {
  let posicion = 0;
  return products.map((product) => {
    const anterior = product.active ? posicion++ < DESTACADOS_ANTERIORES : false;
    if (typeof product.featured === 'boolean') return product;
    return { ...product, featured: migrar && anterior };
  });
}
