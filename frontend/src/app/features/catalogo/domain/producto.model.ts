export type InsigniaProducto = 'Nuevo' | 'Oferta' | 'Top ventas';

export interface Producto {
  readonly id: string;
  readonly slug: string;
  readonly sku: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly brand: string;
  readonly price: number;
  readonly compareAtPrice?: number;
  readonly stock: number;
  readonly rating: number;
  readonly reviewCount: number;
  readonly imageUrl: string;
  readonly thumbnailUrl: string;
  /** Galería completa de la ficha: la imagen principal primero, luego las fotos adicionales. */
  readonly images: readonly string[];
  readonly badge?: InsigniaProducto;
  readonly featured: boolean;
  readonly highlights: readonly string[];
}
