import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ContenidoFacade } from '../application/contenido.facade';
import { versionDeLosTerminos } from '../domain/terminos.rules';

/**
 * Términos y condiciones. Lote 20 (ADR-0021; hallazgo del lote 17, PBI-0177): bajo el título, discreta, la versión
 * vigente y cuándo se publicó, porque el comprador acepta ese número en el checkout.
 */
@Component({
  selector: 'ws-terms-page',
  template: `
    <section class="ws-container py-12">
      <h1 class="text-4xl font-semibold sm:text-6xl">Términos y condiciones</h1>
      @if (version(); as texto) {
        <p class="mt-3 text-sm text-muted">{{ texto }}</p>
      }
      <div class="ws-card mt-8 max-w-4xl p-7 leading-7 text-muted">
        <p class="whitespace-pre-line">{{ content.settings().termsContent }}</p>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminosPage {
  protected readonly content = inject(ContenidoFacade);
  protected readonly version = computed(() => versionDeLosTerminos(this.content.settings()));
}
