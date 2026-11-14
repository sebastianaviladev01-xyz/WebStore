/** Estado que filtra un listado: todos, solo los activos o solo los inactivos. */
export type EstadoFiltro = 'todos' | 'activos' | 'inactivos';

/** Filtros de Productos. Un texto vacío no filtra. */
export interface FiltrosProductos {
  readonly nombre: string;
  readonly sku: string;
  /** Incluye la categoría elegida y sus subcategorías a cualquier profundidad. */
  readonly categoriaId: string;
  readonly marcaId: string;
  readonly estado: EstadoFiltro;
}

/** Filtros de Categorías. `padreId` es el id de la categoría padre o `SIN_PADRE`; vacío no filtra. */
export interface FiltrosCategorias {
  readonly nombre: string;
  readonly padreId: string;
}

/** Filtros de Marcas. */
export interface FiltrosMarcas {
  readonly nombre: string;
  readonly estado: EstadoFiltro;
}

/** Valor de «Categoría padre» que deja solo las categorías de primer nivel. No choca con los ids (`cat-…` o UUID). */
export const SIN_PADRE = 'sin-padre';

export const FILTROS_PRODUCTOS_VACIOS: FiltrosProductos = {
  nombre: '',
  sku: '',
  categoriaId: '',
  marcaId: '',
  estado: 'todos',
};

export const FILTROS_CATEGORIAS_VACIOS: FiltrosCategorias = { nombre: '', padreId: '' };

export const FILTROS_MARCAS_VACIOS: FiltrosMarcas = { nombre: '', estado: 'todos' };
