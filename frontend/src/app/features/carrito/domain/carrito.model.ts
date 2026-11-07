import { Producto } from '../../catalogo/domain/producto.model';

export interface LineaCarrito {
  readonly product: Producto;
  readonly quantity: number;
}
