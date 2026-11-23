import { Directive, ElementRef, inject, input, OnInit, Renderer2 } from '@angular/core';

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Flecha de un plegable o de un menú del Admin (PBI-0080): la misma en el menú lateral, los bloques del Dashboard y
 * el menú de usuario. Va en el propio `<svg>`, que sigue siendo hijo directo del botón: la regla
 * `[aria-expanded='true'] > .ws-plegable-indicador` de `styles.css` la gira al desplegar. El tamaño, el color y la
 * clase del indicador los pone quien la usa.
 */
@Directive({
  selector: 'svg[wsAdminFlecha]',
  host: {
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.75',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  },
})
export class FlechaPlegableDirective implements OnInit {
  private readonly svg = inject<ElementRef<SVGSVGElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  ngOnInit(): void {
    const trazo = this.renderer.createElement('path', SVG) as SVGPathElement;
    this.renderer.setAttribute(trazo, 'd', 'm4 6 4 4 4-4');
    this.renderer.appendChild(this.svg.nativeElement, trazo);
  }
}

/** `id` de la región que controla el botón de un bloque plegable: el botón la nombra con `aria-controls`. */
export const idDeBloque = (id: string): string => `bloque-${id}`;

/**
 * Región de un bloque plegable (lote 08, PBI-0081): lleva el `id` que nombra el botón (`bloque-<id>`), la clase
 * `ws-plegable` que anima el pliegue y `data-plegado` mientras está plegada. Sustituye los tres atributos que cada
 * bloque del Dashboard escribía a mano, con el `id` repetido en el botón.
 */
@Directive({
  selector: '[wsAdminBloquePlegable]',
  host: {
    class: 'ws-plegable',
    '[id]': 'idDeLaRegion()',
    '[attr.data-plegado]': "abierto() ? null : ''",
  },
})
export class BloquePlegableDirective {
  readonly id = input.required<string>({ alias: 'wsAdminBloquePlegable' });
  readonly abierto = input.required<boolean>();
  protected idDeLaRegion = () => idDeBloque(this.id());
}

/** Conjunto de plegables con `id` alternado: lo quita si estaba y lo añade si no (menú lateral y Dashboard). */
export function alternarPlegable<T>(conjunto: ReadonlySet<T>, id: T): ReadonlySet<T> {
  const siguiente = new Set(conjunto);
  if (!siguiente.delete(id)) siguiente.add(id);
  return siguiente;
}
