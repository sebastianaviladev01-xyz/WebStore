import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { Producto } from '../../catalogo/domain/producto.model';
import { TarjetaProductoComponent } from './tarjeta-producto.component';

/**
 * Carrusel de los productos destacados del inicio (lote 22, ADR-0025, PBI-0215; confirmado por Sebastián Avila): con
 * más de cuatro destacados, una fila que se desplaza con «Anterior» y «Siguiente», de a una página (cuatro en
 * escritorio, dos en tablet). En el celular sigue siendo la fila que se desliza con el dedo, como la cuadrícula.
 *
 * Accesibilidad: los botones tienen nombre, no se desactivan con `disabled` (el foco se quedaría sin lugar al llegar
 * al final), sino con `aria-disabled`; el foco no se mueve al desplazar; con movimiento reducido el salto es inmediato;
 * y un aviso cortés dice qué productos quedan a la vista después de pulsar un botón.
 */
@Component({
  selector: 'ws-featured-carousel',
  imports: [TarjetaProductoComponent],
  template: `
    <div
      class="ws-product-carousel"
      role="region"
      aria-roledescription="carrusel"
      [attr.aria-label]="etiqueta()"
    >
      <div #pista class="ws-product-grid is-carousel" (scroll)="medir()" (scrollend)="anunciar()">
        @for (product of products(); track product.id; let first = $first, index = $index) {
          <ws-product-card
            [product]="product"
            [priority]="first"
            role="group"
            aria-roledescription="producto"
            [attr.aria-label]="index + 1 + ' de ' + products().length"
          />
        }
      </div>
      <div class="ws-product-carousel-controls">
        <p class="sr-only" aria-live="polite">{{ aviso() }}</p>
        <button
          type="button"
          class="ws-carousel-control"
          aria-label="Destacados anteriores"
          [attr.aria-disabled]="alInicio()"
          (click)="mover(-1)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5" /></svg>
        </button>
        <button
          type="button"
          class="ws-carousel-control"
          aria-label="Destacados siguientes"
          [attr.aria-disabled]="alFinal()"
          (click)="mover(1)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 7 5 5-5 5" /></svg>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarruselDestacadosComponent {
  readonly products = input.required<readonly Producto[]>();
  readonly etiqueta = input('Destacados');

  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');
  protected readonly alInicio = signal(true);
  protected readonly alFinal = signal(false);
  protected readonly aviso = signal('');
  /** El aviso solo se escribe tras pulsar un botón: deslizar con el dedo no llena el lector de anuncios. */
  private avisarAlTerminar = false;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      this.medir();
      const observador = new ResizeObserver(() => this.medir());
      observador.observe(this.pista().nativeElement);
      this.destroyRef.onDestroy(() => observador.disconnect());
    });
  }

  /** Desplaza una página (lo que se ve más el espacio entre tarjetas), sin mover el foco. */
  protected mover(sentido: -1 | 1): void {
    if (sentido < 0 ? this.alInicio() : this.alFinal()) return;
    const pista = this.pista().nativeElement;
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const espacio = parseFloat(getComputedStyle(pista).columnGap) || 0;
    this.avisarAlTerminar = true;
    pista.scrollBy({ left: sentido * (pista.clientWidth + espacio), behavior: reducido ? 'auto' : 'smooth' });
    if (reducido) {
      this.medir();
      this.anunciar();
    }
  }

  /** Si la fila está al principio o al final: el botón de ese lado queda con `aria-disabled`. */
  protected medir(): void {
    const pista = this.pista().nativeElement;
    this.alInicio.set(pista.scrollLeft <= 1);
    this.alFinal.set(pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 1);
  }

  /** Al terminar un desplazamiento pedido con un botón, qué productos quedan a la vista. */
  protected anunciar(): void {
    if (!this.avisarAlTerminar) return;
    this.avisarAlTerminar = false;
    const pista = this.pista().nativeElement;
    const tarjetas = [...pista.children] as HTMLElement[];
    const izquierda = pista.getBoundingClientRect().left;
    const derecha = izquierda + pista.clientWidth;
    const visibles = tarjetas
      .map((tarjeta, indice) => ({ caja: tarjeta.getBoundingClientRect(), indice }))
      .filter(({ caja }) => caja.left >= izquierda - 1 && caja.right <= derecha + 1)
      .map(({ indice }) => indice + 1);
    if (!visibles.length) return;
    const total = tarjetas.length;
    const desde = visibles[0];
    const hasta = visibles[visibles.length - 1];
    this.aviso.set(
      desde === hasta ? `Producto ${desde} de ${total}` : `Productos ${desde} a ${hasta} de ${total}`,
    );
  }
}
