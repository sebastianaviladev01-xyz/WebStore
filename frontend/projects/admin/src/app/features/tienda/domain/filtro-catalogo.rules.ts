import { aplanarArbolCategorias, EntradaArbolCategorias, idsDescendientes } from './categoria.rules';
import {
  EstadoFiltro,
  FiltrosCategorias,
  FiltrosMarcas,
  FiltrosProductos,
  SIN_PADRE,
} from './filtro-catalogo.model';
import { contieneTexto } from './listado.rules';
import { Categoria, Marca, Producto } from './tienda.model';

const cumpleEstado = (activo: boolean, estado: EstadoFiltro) =>
  estado === 'todos' || (estado === 'activos') === activo;

/**
 * Productos que cumplen todos los filtros escritos, en el orden de entrada. «Categoría» incluye la elegida y sus
 * subcategorías a cualquier profundidad.
 */
export function filtrarProductos(
  productos: readonly Producto[],
  categorias: readonly Categoria[],
  filtros: FiltrosProductos,
): readonly Producto[] {
  const enCategoria = filtros.categoriaId
    ? new Set([filtros.categoriaId, ...idsDescendientes(categorias, filtros.categoriaId)])
    : null;
  return productos.filter(
    (producto) =>
      contieneTexto(producto.name, filtros.nombre) &&
      contieneTexto(producto.sku, filtros.sku) &&
      (!enCategoria || enCategoria.has(producto.categoryId)) &&
      (!filtros.marcaId || producto.brandId === filtros.marcaId) &&
      cumpleEstado(producto.active, filtros.estado),
  );
}

/**
 * Categorías que cumplen los filtros, en el orden de árbol de `aplanarArbolCategorias` y con su profundidad.
 * «Categoría padre» deja solo las hijas directas; `SIN_PADRE`, las de primer nivel (también las que apuntan a un
 * padre que ya no existe, que el árbol muestra como raíz).
 */
export function filtrarCategorias(
  categorias: readonly Categoria[],
  filtros: FiltrosCategorias,
): readonly EntradaArbolCategorias[] {
  const ids = new Set(categorias.map((categoria) => categoria.id));
  const esRaiz = (categoria: Categoria) => !categoria.parentId || !ids.has(categoria.parentId);
  const cumplePadre = (categoria: Categoria) =>
    !filtros.padreId ||
    (filtros.padreId === SIN_PADRE ? esRaiz(categoria) : categoria.parentId === filtros.padreId);
  return aplanarArbolCategorias(categorias).filter(
    ({ category }) => contieneTexto(category.name, filtros.nombre) && cumplePadre(category),
  );
}

/** Marcas que cumplen el nombre y el estado, en el orden de entrada. */
export function filtrarMarcas(marcas: readonly Marca[], filtros: FiltrosMarcas): readonly Marca[] {
  return marcas.filter(
    (marca) => contieneTexto(marca.name, filtros.nombre) && cumpleEstado(marca.active, filtros.estado),
  );
}
