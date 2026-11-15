import { sortCategories } from '../../domain/catalogo/categoria.rules.mjs';
import { galleryOf } from '../../domain/catalogo/producto.rules.mjs';
import { slugify } from '../../domain/catalogo/slug.mjs';
import { DomainError } from '../../domain/comun/domain-error.mjs';

const categoryToPublic = (category) => ({
  id: category.id,
  slug: slugify(category.name),
  name: category.name,
  description: `Explora productos de ${category.name}.`,
  parentId: category.parentId,
  order: category.order,
});

/** Ficha pública de un producto; marca y categoría se resuelven con el estado vigente. */
export const toPublicProduct = (state) => {
  const brandName = (id) => state.brands.find((brand) => brand.id === id)?.name ?? 'Marca';
  const categoryName = (id) => state.categories.find((category) => category.id === id)?.name ?? 'Categoría';
  return (product, index) => ({
    id: product.id,
    slug: slugify(product.name),
    sku: product.sku,
    name: product.name,
    shortDescription: product.description,
    description: product.description,
    categoryId: product.categoryId,
    categoryName: categoryName(product.categoryId),
    brand: brandName(product.brandId),
    price: product.price,
    stock: product.stock,
    rating: product.rating ?? 0,
    reviewCount: product.reviewCount ?? 0,
    imageUrl: product.imageUrl,
    thumbnailUrl: product.thumbnailUrl || product.imageUrl,
    badge: product.stock === 0 ? undefined : product.badge,
    featured: product.featured ?? index < 4,
    highlights: Array.isArray(product.highlights) ? product.highlights.filter(Boolean) : [],
    // Galería pública: la imagen principal siempre primero, seguida de las fotos adicionales.
    images: [product.imageUrl, ...galleryOf(product)].filter(
      (url, index, all) => url && all.indexOf(url) === index,
    ),
  });
};

/** Consultas públicas del catálogo: solo productos activos. */
export function createCatalogoQueries({ store }) {
  const activeProducts = () =>
    store.state.products.filter((product) => product.active).map(toPublicProduct(store.state));

  return {
    listCategories: () => sortCategories(store.state.categories).map(categoryToPublic),
    listProducts: activeProducts,
    /** Ficha pública por slug; si no hay un producto activo con ese slug, `404 PRODUCT_NOT_FOUND` (PBI-0099). */
    getProductBySlug(slug) {
      const product = activeProducts().find((candidate) => candidate.slug === slug);
      if (!product) throw new DomainError('not-found', 'PRODUCT_NOT_FOUND', 'Producto no encontrado.');
      return product;
    },
  };
}
