import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

import { AparienciaGateway } from '../domain/apariencia.gateway';
import { temaVisible as resolverTemaVisible, TemaVisible } from '../domain/tema-visible.rules';
import { Apariencia } from '../domain/tema.model';
import { borrarVistaPrevia, leerVistaPrevia } from './cookie-vista-previa';

/**
 * Carga la apariencia del BFF y pinta el tema visible: escribe sus tokens en `:root` y el color de la
 * barra del navegador. La tienda no tiene tuerca (PBI-0188, ADR-0022): en modo demo solo lee la vista previa que
 * eligió la tuerca del Admin en la cookie `ws_tema_vista_previa` (`cookie-vista-previa.ts`, sin `Domain`: la
 * tienda y el Admin solo la comparten en el mismo host) y borra la que ya no sirve. Si la carga falla, no toca el
 * DOM y queda lo que pinta `tokens.css`.
 */
@Injectable({ providedIn: 'root' })
export class TemasFacade {
  private readonly gateway = inject(AparienciaGateway);
  private readonly document = inject(DOCUMENT);
  private readonly aparienciaState = signal<Apariencia | null>(null);
  private readonly vistaPreviaState = signal<string | null>(leerVistaPrevia(this.document));
  private loadPromise: Promise<void> | null = null;

  readonly temaVisible = computed<TemaVisible | null>(() => {
    const apariencia = this.aparienciaState();
    return apariencia ? resolverTemaVisible(apariencia, this.vistaPreviaState()) : null;
  });

  cargar(): Promise<void> {
    this.loadPromise ??= this.cargarApariencia();
    return this.loadPromise;
  }

  private async cargarApariencia(): Promise<void> {
    try {
      this.aparienciaState.set(await this.gateway.apariencia());
    } catch {
      this.aparienciaState.set(null);
      return;
    }
    if (this.temaVisible()?.borrarVistaPrevia) {
      borrarVistaPrevia(this.document);
      this.vistaPreviaState.set(null);
    }
    this.aplicar();
  }

  private aplicar(): void {
    const visible = this.temaVisible();
    if (!visible) return;
    const { tema } = visible;
    const raiz = this.document.documentElement;
    for (const [nombre, valor] of Object.entries(tema.tokens)) {
      raiz.style.setProperty(nombre, valor);
    }
    const meta = this.document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tema.colors.primary);
  }
}
