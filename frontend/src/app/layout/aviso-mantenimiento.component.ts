import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ContenidoFacade } from '../features/contenido/application/contenido.facade';

/**
 * Aviso de mantenimiento (lote 15, ADR-0021; PBI-0182, provisional): si el contenido nunca llegó del BFF, la tienda no
 * se muestra a medias (sin nombre, contacto ni páginas): reemplaza la cabecera, la página y el pie, para que nadie
 * compre sobre una tienda que no responde. «Reintentar» vuelve a pedir el contenido; también se reintenta al volver a
 * la pestaña. Al llegar, la tienda aparece en la página en la que se estaba.
 */
@Component({
  selector: 'ws-maintenance-notice',
  template: `
    <main
      id="main-content"
      tabindex="-1"
      class="ws-container grid min-h-screen place-items-center py-16 focus:outline-none"
    >
      <section class="ws-card max-w-xl p-8 text-center sm:p-10" aria-labelledby="titulo-mantenimiento">
        <h1 id="titulo-mantenimiento" class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Estamos haciendo mantenimiento
        </h1>
        <p class="mt-4 leading-7 text-muted">
          La tienda no está disponible en este momento. Vuelve a intentarlo en unos minutos.
        </p>
        <button
          type="button"
          class="ws-btn-primary mt-7"
          [disabled]="content.reintentando()"
          (click)="reintentar()"
        >
          {{ content.reintentando() ? 'Reintentando…' : 'Reintentar' }}
        </button>
        <p class="mt-4 min-h-6 text-sm text-muted" role="status">
          @if (sigueSinResponder() && !content.reintentando()) {
            La tienda todavía no responde.
          }
        </p>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvisoMantenimientoComponent {
  protected readonly content = inject(ContenidoFacade);
  /** El último «Reintentar» tampoco trajo el contenido. */
  protected readonly sigueSinResponder = signal(false);

  protected async reintentar(): Promise<void> {
    this.sigueSinResponder.set(false);
    await this.content.reintentar();
    this.sigueSinResponder.set(this.content.enMantenimiento());
  }
}
