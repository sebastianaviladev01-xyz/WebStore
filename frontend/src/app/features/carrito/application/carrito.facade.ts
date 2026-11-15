import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { CambioCarrito, LineaCarrito, LineaGuardada } from '../domain/carrito.model';
import { agregarAlCarrito, conciliarCarrito, unirLineasGuardadas } from '../domain/carrito.rules';
import { Producto } from '../../catalogo/domain/producto.model';
import { CatalogoFacade } from '../../catalogo/application/catalogo.facade';

/** Solo se guarda qué productos y cuántos; precio y stock siempre se toman del catálogo vigente. */
const CART_KEY = 'webstore-cart-v1';

@Injectable({ providedIn: 'root' })
export class CarritoFacade {
  private readonly catalog = inject(CatalogoFacade);
  private readonly itemsState = signal<readonly LineaCarrito[]>([]);
  /** Líneas recuperadas del almacenamiento que esperan el catálogo para reconstruirse. */
  private readonly pendingLines = signal<readonly LineaGuardada[]>(this.readLines());
  private readonly changesState = signal<readonly CambioCarrito[]>([]);
  readonly items = this.itemsState.asReadonly();
  readonly itemCount = computed(() => this.items().reduce((t, i) => t + i.quantity, 0));
  readonly subtotal = computed(() => this.items().reduce((t, i) => t + i.product.price * i.quantity, 0));
  readonly taxableBase = computed(() => this.subtotal() / 1.18);
  readonly igv = computed(() => this.subtotal() - this.taxableBase());
  readonly isEmpty = computed(() => this.items().length === 0);
  /** Lo que cambió en el carrito al recargar el catálogo (PBI-0106), hasta que se descarta. */
  readonly cambios = this.changesState.asReadonly();
  /** El carrito guardado espera al catálogo: no está vacío, está cargando (PBI-0110). */
  readonly cargando = computed(
    () => this.isEmpty() && this.pendingLines().length > 0 && this.catalog.error() === null,
  );
  /** El catálogo falló y el carrito guardado no se pudo reconstruir (PBI-0110). */
  readonly error = computed(
    () => this.isEmpty() && this.pendingLines().length > 0 && this.catalog.error() !== null,
  );

  constructor() {
    // Cada vez que el catálogo se recarga, se concilian precio y stock; se descartan productos retirados o agotados.
    effect(() => {
      const products = this.catalog.products();
      if (this.catalog.loading() || this.catalog.error()) return;
      untracked(() => {
        // Lo agregado antes de que cargara el catálogo prevalece sobre lo recuperado del almacenamiento.
        const restored = this.pendingLines()
          .filter((line) => !this.itemsState().some((item) => item.product.id === line.productId))
          .flatMap((line) => {
            const product = products.find((p) => p.id === line.productId);
            return product && product.stock > 0
              ? [{ product, quantity: Math.min(line.quantity, product.stock) }]
              : [];
          });
        const { items, cambios } = conciliarCarrito(this.itemsState(), products);
        this.pendingLines.set([]);
        if (cambios.length) this.changesState.update((previos) => [...previos, ...cambios]);
        this.setItems([...restored, ...items]);
      });
    });
  }

  /** Agrega sin pasar del stock y devuelve cuántas unidades se agregaron de verdad (PBI-0065). */
  add(product: Producto, quantity = 1): number {
    const { items, agregadas } = agregarAlCarrito(this.itemsState(), product, quantity);
    if (agregadas > 0) this.setItems(items);
    return agregadas;
  }
  /** Unidades de ese producto que ya están en el carrito. */
  quantityOf(productId: string): number {
    return this.itemsState().find((i) => i.product.id === productId)?.quantity ?? 0;
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
  /** Olvida los cambios ya avisados. */
  descartarCambios(): void {
    this.changesState.set([]);
  }
  /** Vuelve a pedir el catálogo para reconstruir el carrito guardado. */
  reintentar(): void {
    void this.catalog.load();
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
  /** Las líneas guardadas válidas, con las del mismo producto unidas en una (PBI-0092). */
  private readLines(): readonly LineaGuardada[] {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) ?? 'null') as unknown;
      if (!Array.isArray(raw)) return [];
      return unirLineasGuardadas(
        raw.filter(
          (line): line is LineaGuardada =>
            typeof line?.productId === 'string' && Number.isInteger(line?.quantity) && line.quantity > 0,
        ),
      );
    } catch {
      return [];
    }
  }
}
