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

/** Parámetros de consulta de la URL de un listado, tal como los entrega el router. */
export type ParametrosUrl = Readonly<Record<string, string | undefined>>;

const leerEstado = (valor: string | undefined): EstadoFiltro =>
  valor === 'activos' || valor === 'inactivos' ? valor : 'todos';

/** Solo los parámetros con valor: un texto vacío (o de espacios) y el estado «todos» no se escriben. */
const sinPorDefecto = (parametros: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(parametros)
      .map(([clave, valor]) => [clave, valor.trim()] as const)
      .filter(([clave, valor]) => valor && !(clave === 'estado' && valor === 'todos')),
  );

/** Filtros de Productos de `nombre`, `sku`, `categoria`, `marca` y `estado`; lo que falta, por defecto. */
export function leerFiltrosProductos(parametros: ParametrosUrl): FiltrosProductos {
  return {
    nombre: parametros['nombre'] ?? '',
    sku: parametros['sku'] ?? '',
    categoriaId: parametros['categoria'] ?? '',
    marcaId: parametros['marca'] ?? '',
    estado: leerEstado(parametros['estado']),
  };
}

/** Filtros de Categorías de `nombre` y `padre` (un id o `SIN_PADRE`). */
export function leerFiltrosCategorias(parametros: ParametrosUrl): FiltrosCategorias {
  return { nombre: parametros['nombre'] ?? '', padreId: parametros['padre'] ?? '' };
}

/** Filtros de Marcas de `nombre` y `estado`. */
export function leerFiltrosMarcas(parametros: ParametrosUrl): FiltrosMarcas {
  return { nombre: parametros['nombre'] ?? '', estado: leerEstado(parametros['estado']) };
}

/** Página de `pagina`: un entero desde 1, sin signos ni decimales; si no es válida, la 1. */
export function leerPagina(parametros: ParametrosUrl): number {
  const valor = parametros['pagina'];
  return valor && /^[1-9]\d*$/.test(valor) ? Number(valor) : 1;
}

/** Parámetros de la URL para los filtros de Productos, sin los valores por defecto ni `pagina`. */
export function parametrosDeFiltrosProductos(filtros: FiltrosProductos): Record<string, string> {
  return sinPorDefecto({
    nombre: filtros.nombre,
    sku: filtros.sku,
    categoria: filtros.categoriaId,
    marca: filtros.marcaId,
    estado: filtros.estado,
  });
}

/** Parámetros de la URL para los filtros de Categorías, sin los valores por defecto ni `pagina`. */
export function parametrosDeFiltrosCategorias(filtros: FiltrosCategorias): Record<string, string> {
  return sinPorDefecto({ nombre: filtros.nombre, padre: filtros.padreId });
}

/** Parámetros de la URL para los filtros de Marcas, sin los valores por defecto ni `pagina`. */
export function parametrosDeFiltrosMarcas(filtros: FiltrosMarcas): Record<string, string> {
  return sinPorDefecto({ nombre: filtros.nombre, estado: filtros.estado });
}
