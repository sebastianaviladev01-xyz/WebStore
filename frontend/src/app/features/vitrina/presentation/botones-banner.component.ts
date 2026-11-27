import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink, UrlTree } from '@angular/router';

import { Banner } from '../../contenido/domain/contenido.model';
import { BotonBanner, botonesDelBanner } from '../../contenido/domain/banner.rules';
import { abreEnOtraPestana, esEnlaceExterno } from '../../contenido/domain/enlace.rules';

/**
 * Clase de cada estilo del tema (lote 46, ADR-0033, PBI-0266): el principal y el secundario (el acento) de siempre, el
 * relleno del color de contraste y el botón con borde. Las cuatro tienen las mismas medidas.
 */
const CLASE_DE_ESTILO: Readonly<Record<BotonBanner['estilo'], string>> = {
  primary: 'ws-btn-primary',
  accent: 'ws-btn-accent',
  contrast: 'ws-btn-contrast',
  outline: 'ws-btn-outline',
};

/**
 * Los botones de un banner (lote 12, ADR-0021, PBI-0184): el primero y el segundo, si tienen texto y enlace, cada uno
 * con su estilo (lote 46, PBI-0266). El componente no ocupa caja propia (`display: contents`): los botones quedan como
 * hijos de la fila que los contiene. Un enlace externo va en un `href` (PBI-0128: el router lo convertiría en una ruta rota de la tienda) y, si es una
 * web (`https://…` o `http://…`), se abre en otra pestaña con `rel="noopener noreferrer"` (PBI-0174).
 */
@Component({
  selector: 'ws-banner-buttons',
  imports: [RouterLink],
  template: `
    @for (boton of botones(); track boton.posicion) {
      @if (esEnlaceExterno(boton.enlace)) {
        @if (abreEnOtraPestana(boton.enlace)) {
          <a [href]="boton.enlace" [class]="clase[boton.estilo]" target="_blank" rel="noopener noreferrer">
            {{ boton.etiqueta }}
            <span class="sr-only">(se abre en otra pestaña)</span>
          </a>
        } @else {
          <a [href]="boton.enlace" [class]="clase[boton.estilo]">{{ boton.etiqueta }}</a>
        }
      } @else {
        <a [routerLink]="linkFor(boton.enlace)" [class]="clase[boton.estilo]">{{ boton.etiqueta }}</a>
      }
    }
  `,
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotonesBannerComponent {
  readonly banner = input.required<Banner>();
  private readonly router = inject(Router);
  protected readonly clase = CLASE_DE_ESTILO;
  protected readonly esEnlaceExterno = esEnlaceExterno;
  protected readonly abreEnOtraPestana = abreEnOtraPestana;
  protected readonly botones = computed(() => botonesDelBanner(this.banner()));

  protected linkFor(url: string): UrlTree {
    return this.router.parseUrl(url);
  }
}
