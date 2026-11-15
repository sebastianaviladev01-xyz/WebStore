import { Categoria, Marca } from './tienda.model';

/**
 * Lo que impide eliminar una marca o una categoría (lote 06, ADR-0017; PBI-0131): que la usen productos o, en una
 * categoría, que tenga subcategorías. Los motivos son los mismos que da el BFF (`BRAND_IN_USE`, `CATEGORY_IN_USE` y
 * `CATEGORY_HAS_CHILDREN`).
 */
interface ProductoClasificado {
  readonly brandId: string;
  readonly categoryId: string;
}

const productos = (n: number) => `${n} ${n === 1 ? 'producto' : 'productos'}`;
const laUsan = (n: number) => `la ${n === 1 ? 'usa' : 'usan'} ${productos(n)}`;
const cambiale = (n: number) => (n === 1 ? 'Cámbiale' : 'Cámbiales');

export function motivoParaNoEliminarMarca(
  marca: Pick<Marca, 'id' | 'name'>,
  catalogo: readonly ProductoClasificado[],
): string | null {
  const n = catalogo.filter((producto) => producto.brandId === marca.id).length;
  return n
    ? `No se puede eliminar la marca «${marca.name}»: ${laUsan(n)}. ${cambiale(n)} la marca antes de eliminarla.`
    : null;
}

export function motivoParaNoEliminarCategoria(
  categoria: Pick<Categoria, 'id' | 'name'>,
  categorias: readonly Pick<Categoria, 'id' | 'parentId'>[],
  catalogo: readonly ProductoClasificado[],
): string | null {
  const hijas = categorias.filter((item) => item.parentId === categoria.id).length;
  if (hijas)
    return hijas === 1
      ? `No se puede eliminar la categoría «${categoria.name}»: tiene 1 subcategoría. Muévela o elimínala antes.`
      : `No se puede eliminar la categoría «${categoria.name}»: tiene ${hijas} subcategorías. Muévelas o elimínalas antes.`;
  const n = catalogo.filter((producto) => producto.categoryId === categoria.id).length;
  return n
    ? `No se puede eliminar la categoría «${categoria.name}»: ${laUsan(n)}. ${cambiale(n)} la categoría antes de eliminarla.`
    : null;
}
