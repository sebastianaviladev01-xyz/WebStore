import { sortCategories } from '../../domain/catalogo/categoria.rules.mjs';
import { galleryOf } from '../../domain/catalogo/producto.rules.mjs';
import { slugify } from '../../domain/catalogo/slug.mjs';
import { DomainError } from '../../domain/comun/domain-error.mjs';
import { direccionDeImagen } from './imagenes.queries.mjs';

const categoryToPublic = (category) => ({
  id: category.id,
  slug: slugify(category.name),
  name: category.name,
  description: `Explora productos de ${category.name}.`,
  parentId: category.parentId,
  order: category.order,
  // Lote 07b (PBI-0052): imagen pequeña opcional; sin ella, `null` y la tienda se ve como antes. Desde el lote 25
  // (ADR-0026), la cargada llega como dirección del BFF, no como Data URL.
  imageUrl: direccionDeImagen('categories', category.id, 'image', category.imageUrl) ?? null,
});

/** Ficha pública de un producto; marca y categoría se resuelven con el estado vigente. */
export const toPublicProduct = (state) => {
  const brandName = (id) => state.brands.find((brand) => brand.id === id)?.name ?? 'Marca';
  const categoryName = (id) => state.categories.find((category) => category.id === id)?.name ?? 'Categoría';
  return (product) => {
    // Lote 24 (ADR-0026, PBI-0214): las imágenes cargadas llegan como dirección del BFF, no como Data URL.
    const imageUrl = direccionDeImagen('products', product.id, 'image', product.imageUrl);
    const thumbnailUrl = product.thumbnailUrl
      ? direccionDeImagen('products', product.id, 'thumbnail', product.thumbnailUrl)
      : imageUrl;
    return {
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
      imageUrl,
      thumbnailUrl,
      badge: product.stock === 0 ? undefined : product.badge,
      // Lote 22 (PBI-0215): la marca que elige el Admin; sin ella, no es destacado.
      featured: product.featured === true,
      highlights: Array.isArray(product.highlights) ? product.highlights.filter(Boolean) : [],
      // Galería pública: la imagen principal siempre primero, seguida de las fotos adicionales.
      images: [imageUrl, ...fotosDeLaGaleria(product)].filter(Boolean),
    };
  };
};

/**
 * Fotos adicionales públicas, sin repetir ni repetir la principal. Lote 25 (ADR-0026): cada foto cargada llega como
 * dirección del BFF por su posición en `galleryOf` (`gallery/{n}`), la misma con la que el BFF la sirve.
 */
function fotosDeLaGaleria(product) {
  const vistas = new Set([product.imageUrl]);
  const fotos = [];
  galleryOf(product).forEach((url, posicion) => {
    if (vistas.has(url)) return;
    vistas.add(url);
    fotos.push(direccionDeImagen('products', product.id, `gallery/${posicion}`, url));
  });
  return fotos;
}

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
