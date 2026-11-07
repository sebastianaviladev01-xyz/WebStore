import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { LineaCarrito } from '../domain/carrito.model';
import { Producto } from '../../catalogo/domain/producto.model';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';

/** Solo se guarda qué productos y cuántos; precio y stock siempre se toman del catálogo vigente. */
const CART_KEY = 'webstore-cart-v1';
type StoredLine = { readonly productId: string; readonly quantity: number };

@Injectable({ providedIn: 'root' })
export class CarritoFacade {
  private readonly catalog = inject(CatalogoFacade);
  private readonly itemsState = signal<readonly LineaCarrito[]>([]);
  /** Líneas recuperadas del almacenamiento que esperan el catálogo para reconstruirse. */
  private pendingLines: readonly StoredLine[] | null = this.readLines();
  readonly items = this.itemsState.asReadonly();
  readonly itemCount = computed(() => this.items().reduce((t, i) => t + i.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((t, i) => t + i.product.price * i.quantity, 0));
  readonly taxableBase = computed(() => this.subtotal() / 1.18);
  readonly igv = computed(() => this.subtotal() - this.taxableBase());
  readonly isEmpty = computed(() => this.items().length === 0);

  constructor() {
    // Cada vez que el catálogo se recarga, se concilian precio y stock; se descartan productos retirados o agotados.
    effect(() => {
      const products = this.catalog.products();
      if (this.catalog.loading() || this.catalog.error()) return;
      untracked(() => {
        // Lo agregado antes de que cargara el catálogo prevalece sobre lo recuperado del almacenamiento.
        const current = this.itemsState().map((i) => ({ productId: i.product.id, quantity: i.quantity }));
        const restored = (this.pendingLines ?? []).filter(
          (line) => !current.some((c) => c.productId === line.productId),
        );
        this.pendingLines = null;
        this.setItems(
          [...restored, ...current].flatMap((line) => {
            const product = products.find((p) => p.id === line.productId);
            return product && product.stock > 0
              ? [{ product, quantity: Math.min(line.quantity, product.stock) }]
              : [];
          }),
        );
      });
    });
  }

  add(product: Producto, quantity = 1): void {
    if (product.stock <= 0 || quantity <= 0) return;
    const items = this.itemsState();
    const current = items.find((i) => i.product.id === product.id);
    this.setItems(
      !current
        ? [...items, { product, quantity: Math.min(quantity, product.stock) }]
        : items.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) }
              : i,
          ),
    );
  }
  setQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) return this.remove(productId);
    this.setItems(
      this.itemsState().map((i) =>
        i.product.id === productId ? { ...i, quantity: Math.min(quantity, i.product.stock) } : i,
      ),
    );
  }
  remove(productId: string): void {
    this.setItems(this.itemsState().filter((i) => i.product.id !== productId));
  }
  clear(): void {
    this.setItems([]);
  }

  private setItems(items: readonly LineaCarrito[]): void {
    this.itemsState.set(items);
    try {
      localStorage.setItem(
        CART_KEY,
        JSON.stringify(items.map((i) => ({ productId: i.product.id, quantity: i.quantity }))),
      );
    } catch {
      /* el carrito sigue en memoria */
    }
  }
  private readLines(): readonly StoredLine[] | null {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) ?? 'null') as unknown;
      if (!Array.isArray(raw)) return null;
      return raw.filter(
        (line): line is StoredLine =>
          typeof line?.productId === 'string' && Number.isInteger(line?.quantity) && line.quantity > 0,
      );
    } catch {
      return null;
    }
  }
}
