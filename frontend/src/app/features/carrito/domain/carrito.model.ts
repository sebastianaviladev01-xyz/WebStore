import { Producto } from '../../catalogo/domain/producto.model';

export interface LineaCarrito {
  readonly product: Producto;
  readonly quantity: number;
}

/** Lo que se guarda del carrito en el navegador: qué producto y cuántas unidades (sin precio ni stock). */
export interface LineaGuardada {
  readonly productId: string;
  readonly quantity: number;
}

/** Lo que cambió en una línea al conciliar el carrito con el catálogo vigente (PBI-0106). */
export type CambioCarrito =
  | { readonly tipo: 'precio'; readonly nombre: string; readonly antes: number; readonly ahora: number }
  | { readonly tipo: 'stock'; readonly nombre: string; readonly antes: number; readonly ahora: number }
  | { readonly tipo: 'retirado'; readonly nombre: string };
