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
