import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ContenidoFacade } from '../application/contenido.facade';
import { contactosVisibles, redesVisibles } from '../domain/contacto.rules';

/**
 * Contacto: el texto de Contenido, los correos y los teléfonos de la tienda y sus redes (lote 15, ADR-0021; PBI-0169).
 * Cada dato puede llevar su etiqueta («Ventas»); las redes se abren en otra pestaña.
 */
@Component({
  selector: 'ws-contact-page',
  template: `
    <section class="ws-container py-12">
      <h1 class="text-4xl font-semibold sm:text-6xl">Contacto</h1>
      <p class="mt-4 max-w-2xl whitespace-pre-line text-muted">{{ content.settings().contactContent }}</p>
      @if (correos().length || telefonos().length || redes().length) {
        <div class="ws-card mt-8 grid gap-5 p-7 sm:grid-cols-2">
          @if (correos().length) {
            <div>
              <p class="text-sm text-muted">{{ correos().length > 1 ? 'Correos' : 'Correo' }}</p>
              @for (correo of correos(); track correo.value) {
                <p>
                  <strong>{{ correo.value }}</strong>
                  @if (correo.label) {
                    <span class="text-sm text-muted">{{ ' · ' + correo.label }}</span>
                  }
                </p>
              }
            </div>
          }
          @if (telefonos().length) {
            <div>
              <p class="text-sm text-muted">{{ telefonos().length > 1 ? 'Teléfonos' : 'Teléfono' }}</p>
              @for (telefono of telefonos(); track telefono.value) {
                <p>
                  <strong>{{ telefono.value }}</strong>
                  @if (telefono.label) {
                    <span class="text-sm text-muted">{{ ' · ' + telefono.label }}</span>
                  }
                </p>
              }
            </div>
          }
          @if (redes().length) {
            <div class="sm:col-span-2">
              <p class="text-sm text-muted">Redes sociales</p>
              <ul class="flex flex-wrap gap-x-5 gap-y-1">
                @for (red of redes(); track red.url) {
                  <li>
                    <a
                      class="font-semibold text-link hover:underline"
                      [href]="red.url"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ red.label }}
                      <span class="sr-only">(se abre en otra pestaña)</span>
                    </a>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactoPage {
  protected readonly content = inject(ContenidoFacade);
  protected readonly correos = computed(() => contactosVisibles(this.content.settings().contactEmails));
  protected readonly telefonos = computed(() => contactosVisibles(this.content.settings().contactPhones));
  protected readonly redes = computed(() => redesVisibles(this.content.settings().socialLinks));
}
