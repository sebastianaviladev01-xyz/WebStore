export interface Categoria {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly parentId?: string;
  readonly order?: number;
  /** Imagen pequeña opcional de la categoría (lote 07b, PBI-0052); sin ella, la tienda se ve como antes. */
  readonly imageUrl?: string | null;
}
