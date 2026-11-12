import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';

import { AparienciaGateway } from '../domain/apariencia.gateway';
import { temaVisible as resolverTemaVisible, TemaVisible } from '../domain/tema-visible.rules';
import { Apariencia, Tema } from '../domain/tema.model';

/** Cookie con el id del tema en vista previa (modo demo). */
export const COOKIE_VISTA_PREVIA = 'ws_tema_vista_previa';

const VIGENCIA_VISTA_PREVIA_SEGUNDOS = 2592000;

/**
 * Carga la apariencia del BFF y pinta el tema visible: escribe sus tokens en `:root` y el color de la
 * barra del navegador. En modo demo recuerda la vista previa elegida en la cookie `ws_tema_vista_previa`
 * (sin `Domain`, ver ADR-0012). Si la carga falla, no toca el DOM y queda lo que pinta `tokens.css`.
 */
@Injectable({ providedIn: 'root' })
export class TemasFacade {
  private readonly gateway = inject(AparienciaGateway);
  private readonly document = inject(DOCUMENT);
  private readonly aparienciaState = signal<Apariencia | null>(null);
  private readonly vistaPreviaState = signal<string | null>(this.leerCookie());
  private loadPromise: Promise<void> | null = null;

  readonly modoDemo = computed(() => this.aparienciaState()?.demoMode ?? false);
  readonly temas = computed<readonly Tema[]>(() => this.aparienciaState()?.themes ?? []);
  readonly temaActivo = computed<Tema | null>(() => {
    const apariencia = this.aparienciaState();
    return apariencia ? resolverTemaVisible(apariencia, null).tema : null;
  });
  readonly temaVisible = computed<TemaVisible | null>(() => {
    const apariencia = this.aparienciaState();
    return apariencia ? resolverTemaVisible(apariencia, this.vistaPreviaState()) : null;
  });

  cargar(): Promise<void> {
    this.loadPromise ??= this.cargarApariencia();
    return this.loadPromise;
  }

  verTema(id: string): void {
    if (!this.modoDemo() || !this.temas().some((tema) => tema.id === id)) return;
    this.escribirCookie(id);
    this.vistaPreviaState.set(id);
    this.aplicar();
  }

  volverAlActivo(): void {
    this.borrarCookie();
    this.vistaPreviaState.set(null);
    this.aplicar();
  }

  private async cargarApariencia(): Promise<void> {
    try {
      this.aparienciaState.set(await this.gateway.apariencia());
    } catch {
      this.aparienciaState.set(null);
      return;
    }
    if (this.temaVisible()?.borrarVistaPrevia) {
      this.borrarCookie();
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

  private leerCookie(): string | null {
    const prefijo = `${COOKIE_VISTA_PREVIA}=`;
    const entrada = this.document.cookie
      .split(';')
      .map((parte) => parte.trim())
      .find((parte) => parte.startsWith(prefijo));
    if (entrada === undefined) return null;
    try {
      return decodeURIComponent(entrada.slice(prefijo.length));
    } catch {
      return null;
    }
  }

  private escribirCookie(id: string): void {
    this.document.cookie = this.atributosCookie(encodeURIComponent(id), VIGENCIA_VISTA_PREVIA_SEGUNDOS);
  }

  private borrarCookie(): void {
    this.document.cookie = this.atributosCookie('', 0);
  }

  private atributosCookie(valor: string, maxAge: number): string {
    const seguro = this.document.location.protocol === 'https:' ? '; Secure' : '';
    return `${COOKIE_VISTA_PREVIA}=${valor}; Path=/; SameSite=Lax; Max-Age=${maxAge}${seguro}`;
  }
}
