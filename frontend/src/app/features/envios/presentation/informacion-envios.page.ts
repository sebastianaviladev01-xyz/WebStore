import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { EnviosFacade } from '../application/envios.facade';
import { ContenidoFacade } from '../../contenido/application/contenido.facade';
@Component({
  selector: 'ws-shipping-info-page',
  imports: [CurrencyPipe],
  template: `
    <section class="ws-container py-12">
      <h1 class="text-4xl font-semibold sm:text-6xl">Envíos</h1>
      <p class="mt-4 max-w-2xl whitespace-pre-line text-muted">{{ content.settings().shippingContent }}</p>
      <div class="ws-card mt-8 overflow-hidden">
        <div class="grid grid-cols-3 bg-subtle p-4 text-xs font-semibold uppercase">
          <span>Origen</span>
          <span>Destino</span>
          <span>Precio</span>
        </div>
        @for (rate of shipping.rates(); track rate.id) {
          <div class="grid grid-cols-3 border-t border-line p-4 text-sm">
            <span>{{ rate.origin }}</span>
            <span>{{ rate.destination }}</span>
            <strong>{{ rate.price | currency: 'PEN' : 'symbol' : '1.2-2' }}</strong>
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformacionEnviosPage {
  protected readonly shipping = inject(EnviosFacade);
  protected readonly content = inject(ContenidoFacade);
}
