import { Categoria } from './categoria.model';
import { Producto } from './producto.model';

export abstract class CatalogoGateway {
  abstract getCategories(): Promise<readonly Categoria[]>;
  abstract getProducts(): Promise<readonly Producto[]>;
}
