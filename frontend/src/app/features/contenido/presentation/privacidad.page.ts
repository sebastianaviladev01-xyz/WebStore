import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ContenidoFacade } from '../application/contenido.facade';
@Component({
  selector: 'ws-privacy-page',
  template: `
    <section class="ws-container py-12">
      <h1 class="text-4xl font-semibold sm:text-6xl">Política de privacidad</h1>
      <div class="ws-card mt-8 max-w-4xl p-7 leading-7 text-muted">
        <p class="whitespace-pre-line">{{ content.settings().privacyContent }}</p>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacidadPage {
  protected readonly content = inject(ContenidoFacade);
}
