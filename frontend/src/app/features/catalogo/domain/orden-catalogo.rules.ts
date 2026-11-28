import type { Producto } from './producto.model';

/**
 * Orden del catálogo de la tienda (lote 52, ADR-0037, PBI-0278; decisión de Sebastián Avila del 2026-11-27). Vive en la
 * URL (`?orden=`), como los filtros (PBI-0108), y se aplica después de ellos. «Relevancia» es el orden en que el BFF
 * entrega el catálogo, el de siempre, y es el valor por defecto: no se escribe en la URL.
 */
export type OrdenCatalogo = 'relevancia' | 'precio-asc' | 'precio-desc' | 'nombre-asc' | 'nombre-desc';

export const ORDEN_POR_DEFECTO: OrdenCatalogo = 'relevancia';

/** Las opciones del control «Ordenar por», en el orden en que se muestran. */
export const OPCIONES_DE_ORDEN: readonly { readonly valor: OrdenCatalogo; readonly etiqueta: string }[] = [
  { valor: 'relevancia', etiqueta: 'Relevancia' },
  { valor: 'precio-asc', etiqueta: 'Precio: menor a mayor' },
  { valor: 'precio-desc', etiqueta: 'Precio: mayor a menor' },
  { valor: 'nombre-asc', etiqueta: 'Nombre: A–Z' },
  { valor: 'nombre-desc', etiqueta: 'Nombre: Z–A' },
];

/**
 * Nombres en español, sin distinguir mayúsculas ni tildes (la Ñ sigue siendo su propia letra, después de la N), y los
 * números del nombre por su valor («TV 9» antes que «TV 10»).
 */
const COMPARADOR_DE_NOMBRES = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** El orden de la URL; vacío o un valor que no es una de las opciones (escrito a mano, de otra versión) es «Relevancia». */
export function leerOrdenCatalogo(valor: string | null | undefined): OrdenCatalogo {
  return OPCIONES_DE_ORDEN.find((opcion) => opcion.valor === valor)?.valor ?? ORDEN_POR_DEFECTO;
}

/** El parámetro de la URL del orden: ninguno con «Relevancia», para que la dirección del catálogo no cambie. */
export function parametrosDeOrdenCatalogo(orden: OrdenCatalogo): Record<string, string> {
  return orden === ORDEN_POR_DEFECTO ? {} : { orden };
}

/**
 * Los productos en el orden elegido, sin cambiar la lista que recibe. A igual precio o nombre, quedan como en
 * «Relevancia»: el desempate es la posición en la lista recibida, en los dos sentidos.
 */
export function ordenarProductos<T extends Pick<Producto, 'name' | 'price'>>(
  productos: readonly T[],
  orden: OrdenCatalogo,
): readonly T[] {
  if (orden === 'relevancia') return productos;
  const comparar = comparadorDe(orden);
  return productos
    .map((producto, posicion) => ({ producto, posicion }))
    .sort((a, b) => comparar(a.producto, b.producto) || a.posicion - b.posicion)
    .map(({ producto }) => producto);
}

function comparadorDe(
  orden: Exclude<OrdenCatalogo, 'relevancia'>,
): (a: Pick<Producto, 'name' | 'price'>, b: Pick<Producto, 'name' | 'price'>) => number {
  switch (orden) {
    case 'precio-asc':
      return (a, b) => a.price - b.price;
    case 'precio-desc':
      return (a, b) => b.price - a.price;
    case 'nombre-asc':
      return (a, b) => COMPARADOR_DE_NOMBRES.compare(a.name, b.name);
    case 'nombre-desc':
      return (a, b) => COMPARADOR_DE_NOMBRES.compare(b.name, a.name);
  }
}
