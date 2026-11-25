import { Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { ICONOS, iconoDelModulo, type NombreIcono } from './iconos';

const SVG = 'http://www.w3.org/2000/svg';

/** Atributos comunes de los íconos del backoffice: trazo de 1.8 sobre 24 × 24 y decorativos. */
const ATRIBUTOS_DEL_ICONO = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '1.8',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
  focusable: 'false',
} as const;

/**
 * Ícono decorativo del backoffice (lote 31, ADR-0027, PBI-0243): va en el propio `<svg>`, como la flecha de los
 * plegables, con el trazo de `ICONOS` y `aria-hidden`: el nombre accesible del botón sigue siendo su texto. En un botón
 * mide 18 px y va a la izquierda del texto, separado por `gap-2` (el botón lleva `inline-flex items-center gap-2`); en
 * una opción de menú de Material, el ícono y el texto van juntos en un `<span class="inline-flex items-center gap-2">`.
 */
@Directive({
  selector: 'svg[wsAdminIcono]',
  host: { ...ATRIBUTOS_DEL_ICONO, class: 'h-[18px] w-[18px] shrink-0' },
})
export class IconoDirective {
  readonly nombre = input.required<NombreIcono>({ alias: 'wsAdminIcono' });

  constructor() {
    const renderer = inject(Renderer2);
    const trazo = renderer.createElement('path', SVG) as SVGPathElement;
    renderer.appendChild(inject<ElementRef<SVGSVGElement>>(ElementRef).nativeElement, trazo);
    effect(() => renderer.setAttribute(trazo, 'd', ICONOS[this.nombre()]));
  }
}

/**
 * Título de una página del backoffice (lote 31, PBI-0243): el `h1` lleva a la izquierda, a 28 px, el ícono de su
 * módulo, el mismo de su entrada del menú lateral (`iconoDelModulo`, con la ruta de la página), sin cambiar su texto ni
 * su nombre accesible. Las páginas de registro llevan el de su listado; Perfil e Ingreso, uno propio.
 */
@Directive({
  selector: 'h1[wsAdminTitulo]',
  host: { class: 'flex items-center gap-3' },
})
export class TituloPaginaDirective {
  constructor() {
    const ruta = inject(ActivatedRoute).snapshot.pathFromRoot.flatMap((tramo) => tramo.url);
    const icono = iconoDelModulo(ruta.map((segmento) => segmento.path).join('/'));
    if (!icono) return;
    const renderer = inject(Renderer2);
    const svg = renderer.createElement('svg', SVG) as SVGSVGElement;
    for (const [nombre, valor] of Object.entries(ATRIBUTOS_DEL_ICONO))
      renderer.setAttribute(svg, nombre, valor);
    renderer.setAttribute(svg, 'class', 'h-7 w-7 shrink-0');
    const trazo = renderer.createElement('path', SVG) as SVGPathElement;
    renderer.setAttribute(trazo, 'd', ICONOS[icono]);
    renderer.appendChild(svg, trazo);
    // Antes del texto: si el `h1` aún no tiene sus nodos, los recibe después, detrás del ícono.
    const h1 = inject<ElementRef<HTMLHeadingElement>>(ElementRef).nativeElement;
    renderer.insertBefore(h1, svg, h1.firstChild);
  }
}
