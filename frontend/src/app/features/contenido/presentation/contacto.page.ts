import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ContenidoFacade } from '../application/contenido.facade';
@Component({
  selector: 'ws-contact-page',
  template: `
    <section class="ws-container py-12">
      <h1 class="text-4xl font-semibold sm:text-6xl">Contacto</h1>
      <p class="mt-4 max-w-2xl whitespace-pre-line text-muted">{{ content.settings().contactContent }}</p>
      <div class="ws-card mt-8 grid gap-5 p-7 sm:grid-cols-2">
        <div>
          <p class="text-sm text-muted">Correo</p>
          <strong>{{ content.settings().contactEmail }}</strong>
        </div>
        <div>
          <p class="text-sm text-muted">Teléfono</p>
          <strong>{{ content.settings().contactPhone }}</strong>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactoPage {
  protected readonly content = inject(ContenidoFacade);
}
