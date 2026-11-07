import type { Categoria } from './categoria.model';

export interface DescendienteCategoria {
  readonly category: Categoria;
  readonly depth: number;
}

export function hijosDeCategoria(categories: readonly Categoria[], parentId?: string): readonly Categoria[] {
  return categories
    .filter((category) => category.parentId === parentId || (!parentId && !category.parentId))
    .sort(
      (a, b) =>
        (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name, 'es'),
    );
}

export function descendientesDeCategoria(
  categories: readonly Categoria[],
  parentId: string,
): readonly DescendienteCategoria[] {
  const visited = new Set([parentId]);
  const result: DescendienteCategoria[] = [];
  const visit = (id: string, depth: number): void => {
    for (const category of hijosDeCategoria(categories, id)) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      result.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(parentId, 0);
  return result;
}
