/**
 * Datos que no se pueden repetir entre registros (lote 06, ADR-0017): el SKU y la dirección de ficha de un producto
 * (PBI-0129), la dirección de una categoría (PBI-0148, lote 07) y el correo de un usuario administrativo
 * (PBI-0123). El Admin los comprueba antes de enviar; el BFF los vuelve a comprobar.
 */

import { normalizarCorreo } from './correo.rules';

/** Dirección de ficha del producto: la misma que calcula el BFF (`backend/src/domain/catalogo/slug.mjs`). */
export const slugDe = (nombre: string): string =>
  nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const clave = (texto: string) => texto.trim().toLowerCase();

interface ProductoComparable {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
}

/** Campo del producto que choca con otro y el motivo, listo para mostrarse junto a ese campo. */
export interface ProductoRepetido {
  readonly campo: 'sku' | 'name';
  readonly mensaje: string;
}

/** Por qué el producto choca con otro (SKU o dirección de ficha), o `null` si no choca. */
export function motivoDeProductoRepetido(
  productos: readonly ProductoComparable[],
  producto: ProductoComparable,
): ProductoRepetido | null {
  const otros = productos.filter((otro) => otro.id !== producto.id);
  const sku = clave(producto.sku);
  const mismoSku = otros.find((otro) => clave(otro.sku) === sku);
  if (mismoSku)
    return {
      campo: 'sku',
      mensaje: `Ya hay un producto con el SKU ${producto.sku.trim()}: «${mismoSku.name}». Usa otro SKU.`,
    };
  const slug = slugDe(producto.name);
  const mismaFicha = otros.find((otro) => slugDe(otro.name) === slug);
  if (mismaFicha)
    return {
      campo: 'name',
      mensaje: `Ya hay un producto con la dirección de ficha ${slug}: «${mismaFicha.name}». Cambia el nombre.`,
    };
  return null;
}

/** Otro usuario con el mismo correo, sin distinguir mayúsculas ni espacios; `null` si no hay. */
export function usuarioConElMismoCorreo<T extends { readonly id: string; readonly email: string }>(
  usuarios: readonly T[],
  usuario: { readonly id: string; readonly email: string },
): T | null {
  const correo = normalizarCorreo(usuario.email);
  return usuarios.find((otro) => otro.id !== usuario.id && normalizarCorreo(otro.email) === correo) ?? null;
}

/**
 * Por qué una categoría choca con otra (lote 07, PBI-0148): la tienda la abre por el slug de su nombre, como el BFF.
 * `null` si no choca.
 */
export function motivoDeCategoriaRepetida(
  categorias: readonly { readonly id: string; readonly name: string }[],
  categoria: { readonly id: string; readonly name: string },
): string | null {
  const slug = slugDe(categoria.name);
  const otra = categorias.find(
    (candidata) => candidata.id !== categoria.id && slugDe(candidata.name) === slug,
  );
  return otra ? `Ya hay una categoría con la dirección ${slug}: «${otra.name}». Cambia el nombre.` : null;
}
