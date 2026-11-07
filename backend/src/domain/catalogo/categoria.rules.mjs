import { DomainError } from '../comun/domain-error.mjs';

/** Cada padre debe existir y subir por la jerarquía nunca puede volver a la misma categoría (sin ciclos). */
export function requireValidCategoryTree(categories) {
  if (!Array.isArray(categories))
    throw new DomainError('validation', 'INVALID_CATEGORY_TREE', 'La lista de categorías no es válida.');
  const byId = new Map(categories.map((category) => [category.id, category]));
  for (const category of categories) {
    const seen = new Set([category.id]);
    let parentId = category.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent)
        throw new DomainError('validation', 'INVALID_CATEGORY_TREE', 'La categoría padre no existe.', {
          categoryId: category.id,
        });
      if (seen.has(parent.id))
        throw new DomainError(
          'validation',
          'INVALID_CATEGORY_TREE',
          'Una categoría no puede ser su propio padre ni colgar de una de sus subcategorías.',
          { categoryId: category.id },
        );
      seen.add(parent.id);
      parentId = parent.parentId;
    }
  }
}

/** Agrupa por padre; dentro de cada grupo ordena por `order` y luego por nombre. */
export const sortCategories = (items) =>
  [...items].sort((a, b) => {
    const parentA = a.parentId ?? '';
    const parentB = b.parentId ?? '';
    if (parentA !== parentB) return parentA.localeCompare(parentB);
    const ao = a.order;
    const bo = b.order;
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    if (ao != null && bo == null) return -1;
    if (ao == null && bo != null) return 1;
    return a.name.localeCompare(b.name, 'es');
  });
