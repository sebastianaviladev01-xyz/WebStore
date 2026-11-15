import { DomainError } from '../comun/domain-error.mjs';
import { slugify } from './slug.mjs';

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

/**
 * Una categoría eliminada no puede dejar subcategorías sin padre (PBI-0131). Se revisa antes del árbol, que solo
 * diría «La categoría padre no existe.».
 */
export function requireRemovedWithoutChildren(categories, previous) {
  for (const category of previous) {
    if (categories.some((item) => item.id === category.id)) continue;
    const count = categories.filter((item) => item.parentId === category.id).length;
    if (count)
      throw new DomainError(
        'conflict',
        'CATEGORY_HAS_CHILDREN',
        `No se puede eliminar la categoría «${category.name}»: tiene ${count} ${count === 1 ? 'subcategoría' : 'subcategorías'}. ${count === 1 ? 'Muévela o elimínala' : 'Muévelas o elimínalas'} antes.`,
        { categoryId: category.id, children: count },
      );
  }
}

/**
 * Dirección única de cada categoría (lote 07, PBI-0148): la tienda la abre por el slug de su nombre, así que dos
 * categorías con el mismo slug comparten dirección. Como con los productos (PBI-0129), solo se revisan las nuevas o
 * las renombradas: dos que ya lo compartían no bloquean el guardado de otra.
 */
export function requireUniqueCategorySlugs(categories, previous) {
  const previousSlug = new Map(previous.map((category) => [category.id, slugify(category.name)]));
  for (const category of categories) {
    const slug = slugify(category.name);
    if (previousSlug.get(category.id) === slug) continue;
    const other = categories.find(
      (candidate) => candidate.id !== category.id && slugify(candidate.name) === slug,
    );
    if (other)
      throw new DomainError(
        'validation',
        'INVALID_COLLECTION',
        `Revisa las categorías: la dirección ${slug} ya la usa «${other.name}». Cambia el nombre.`,
        { collection: 'categories', field: 'slug', id: category.id },
      );
  }
}
