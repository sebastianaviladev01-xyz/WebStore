import { DomainError } from '../comun/domain-error.mjs';
import { slugify } from './slug.mjs';

/** Fotos adicionales válidas de la ficha (sin la imagen principal). */
export function galleryOf(product) {
  return Array.isArray(product.gallery)
    ? product.gallery.filter((url) => typeof url === 'string' && url.trim())
    : [];
}

/**
 * Campos de la ficha que el rol Vendedor puede mantener; precio, categoría y marca quedan fuera.
 * Devuelve la nueva lista de productos.
 */
export function applyProductContentEdits(currentProducts, products) {
  const currentIds = new Set(currentProducts.map((product) => product.id));
  const nextIds = new Set(products.map((product) => product.id));
  if (currentIds.size !== nextIds.size || [...currentIds].some((id) => !nextIds.has(id)))
    throw new DomainError(
      'forbidden',
      'CATALOG_SCOPE_VIOLATION',
      'Tu rol no puede crear ni eliminar productos.',
    );
  return currentProducts.map((current) => {
    const update = products.find((product) => product.id === current.id);
    return {
      ...current,
      name: update.name,
      description: update.description,
      imageUrl: update.imageUrl,
      thumbnailUrl: update.thumbnailUrl || update.imageUrl,
      stock: Number(update.stock),
      highlights: Array.isArray(update.highlights) ? update.highlights : current.highlights,
      gallery: Array.isArray(update.gallery) ? galleryOf(update) : galleryOf(current),
    };
  });
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
