import { Directive, ElementRef, inject, OnInit, Renderer2 } from '@angular/core';

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Flecha de un plegable o de un menú del Admin (PBI-0080): la misma en el menú lateral, los bloques del Resumen y
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

/** Conjunto de plegables con `id` alternado: lo quita si estaba y lo añade si no (menú lateral y Resumen). */
export function alternarPlegable<T>(conjunto: ReadonlySet<T>, id: T): ReadonlySet<T> {
  const siguiente = new Set(conjunto);
  if (!siguiente.delete(id)) siguiente.add(id);
  return siguiente;
}
