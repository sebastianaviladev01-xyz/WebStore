import { textoBuscable } from './listado.rules';
import { Categoria } from './tienda.model';

export interface EntradaArbolCategorias {
  readonly category: Categoria;
  readonly depth: number;
}

/** Orden explícito (1…n) primero; sin orden, alfabético. Es el mismo criterio que aplica el BFF. */
const byOrderThenName = (a: Categoria, b: Categoria) =>
  (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
  a.name.localeCompare(b.name, 'es');

/**
 * Recorre el árbol en profundidad: cada subcategoría queda justo debajo de su padre.
 * Una categoría cuyo padre no existe se muestra como raíz; un ciclo se corta para no recorrerlo infinitamente.
 */
export function aplanarArbolCategorias(categories: readonly Categoria[]): readonly EntradaArbolCategorias[] {
  const ids = new Set(categories.map((category) => category.id));
  const childrenOf = (parentId: string | undefined) =>
    categories
      .filter(
        (category) =>
          (category.parentId && ids.has(category.parentId) ? category.parentId : undefined) === parentId,
      )
      .sort(byOrderThenName);
  const visited = new Set<string>();
  const result: EntradaArbolCategorias[] = [];
  const walk = (parentId: string | undefined, depth: number) => {
    for (const category of childrenOf(parentId)) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      result.push({ category, depth });
      walk(category.id, depth + 1);
    }
  };
  walk(undefined, 0);
  // Categorías atrapadas en un ciclo (datos previos a la validación) igual se listan para poder corregirlas.
  for (const category of categories) if (!visited.has(category.id)) result.push({ category, depth: 0 });
  return result;
}

/** Identificadores de todas las subcategorías (a cualquier profundidad) de una categoría. */
export function idsDescendientes(categories: readonly Categoria[], id: string): ReadonlySet<string> {
  const found = new Set<string>();
  const pending = [id];
  while (pending.length) {
    const current = pending.pop()!;
    for (const category of categories) {
      if (category.parentId === current && !found.has(category.id) && category.id !== id) {
        found.add(category.id);
        pending.push(category.id);
      }
    }
  }
  return found;
}

/** Una categoría como opción de la selección con búsqueda (lote 29, PBI-0238), con su ruta en el árbol. */
export interface OpcionDeCategoria {
  readonly category: Categoria;
  /** Los nombres de las categorías que la contienen, desde el primer nivel; vacío en una de primer nivel. */
  readonly ancestros: readonly string[];
  /** «Electrodomésticos › Refrigeradoras › Side by side»: los ancestros y su nombre. */
  readonly ruta: string;
}

/** Separador de los niveles en la ruta de una categoría. */
export const SEPARADOR_DE_RUTA = ' › ';

/** Desde cuántos caracteres (sin espacios en los extremos ni tildes) se filtra la lista. Daniel: «mínimo tres». */
export const MINIMO_PARA_BUSCAR_CATEGORIA = 3;

/** Cada categoría con su ruta, en el orden del árbol (`aplanarArbolCategorias`): cada una justo debajo de su padre. */
export function opcionesDeCategoria(categories: readonly Categoria[]): readonly OpcionDeCategoria[] {
  const camino: string[] = [];
  return aplanarArbolCategorias(categories).map(({ category, depth }) => {
    camino.length = depth;
    const ancestros = [...camino];
    camino.push(category.name);
    return { category, ancestros, ruta: [...ancestros, category.name].join(SEPARADOR_DE_RUTA) };
  });
}

/**
 * Las opciones que coinciden con lo escrito (lote 29, ADR-0027, PBI-0238; confirmado por Sebastián Avila). Con
 * menos de `MINIMO_PARA_BUSCAR_CATEGORIA` caracteres no se filtra: están todas, para elegir sin escribir. Desde ahí, sin
 * distinguir mayúsculas ni tildes, primero las que lo llevan en su nombre y después las que lo llevan solo en la ruta
 * (están dentro de una que coincide), cada grupo en el orden del árbol. Así Enter, que elige la primera, elige una cuyo
 * nombre coincide.
 */
export function buscarCategorias(
  opciones: readonly OpcionDeCategoria[],
  texto: string,
): readonly OpcionDeCategoria[] {
  const buscado = textoBuscable(texto);
  if (buscado.length < MINIMO_PARA_BUSCAR_CATEGORIA) return opciones;
  const porNombre = opciones.filter(({ category }) => textoBuscable(category.name).includes(buscado));
  const porRuta = opciones.filter(
    (opcion) => !porNombre.includes(opcion) && textoBuscable(opcion.ruta).includes(buscado),
  );
  return [...porNombre, ...porRuta];
}
