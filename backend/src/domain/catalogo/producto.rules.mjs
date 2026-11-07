import { DomainError } from '../comun/domain-error.mjs';

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
