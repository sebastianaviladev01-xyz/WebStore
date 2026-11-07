import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ContenidoFacade } from '../application/contenido.facade';
@Component({
  selector: 'ws-terms-page',
  template: `
    <section class="ws-container py-12">
      <h1 class="text-4xl font-semibold sm:text-6xl">Términos y condiciones</h1>
      <div class="ws-card mt-8 max-w-4xl p-7 leading-7 text-muted">
        <p class="whitespace-pre-line">{{ content.settings().termsContent }}</p>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminosPage {
  protected readonly content = inject(ContenidoFacade);
}
