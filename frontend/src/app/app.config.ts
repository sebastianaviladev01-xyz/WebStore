import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions } from '@angular/material/form-field';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { CuentaGateway } from './features/cuenta/domain/cuenta.gateway';
import { BFF_BASE_URL } from './core/bff.config';
import { CatalogoGateway } from './features/catalogo/domain/catalogo.gateway';
import { CheckoutGateway } from './features/checkout/domain/checkout.gateway';
import { ReclamoGateway } from './features/reclamos/domain/reclamo.gateway';
import { ContenidoGateway } from './features/contenido/domain/contenido.gateway';
import { PedidoGateway } from './features/pedidos/domain/pedido.gateway';
import { EnvioGateway } from './features/envios/domain/envio.gateway';
import { AparienciaGateway } from './features/temas/domain/apariencia.gateway';
import { BffCuentaGateway } from './features/cuenta/data/bff-cuenta.gateway';
import { BffCatalogoGateway } from './features/catalogo/data/bff-catalogo.gateway';
import { BffCheckoutGateway } from './features/checkout/data/bff-checkout.gateway';
import { BffReclamoGateway } from './features/reclamos/data/bff-reclamo.gateway';
import { BffContenidoGateway } from './features/contenido/data/bff-contenido.gateway';
import { BffPedidoGateway } from './features/pedidos/data/bff-pedido.gateway';
import { BffEnvioGateway } from './features/envios/data/bff-envio.gateway';
import { BffAparienciaGateway } from './features/temas/data/bff-apariencia.gateway';
import { VisitaGateway } from './features/visitas/domain/visita.gateway';
import { BffVisitaGateway } from './features/visitas/data/bff-visita.gateway';

/** Composición: cada puerto del dominio se resuelve con su adaptador HTTP hacia el BFF. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    // Todos los campos de la tienda son de contorno (PBI-0081): se dice una vez aquí y no en cada `mat-form-field`.
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' } satisfies MatFormFieldDefaultOptions,
    },
    { provide: BFF_BASE_URL, useValue: '/bff' },
    { provide: CatalogoGateway, useClass: BffCatalogoGateway },
    { provide: CheckoutGateway, useClass: BffCheckoutGateway },
    { provide: EnvioGateway, useClass: BffEnvioGateway },
    { provide: CuentaGateway, useClass: BffCuentaGateway },
    { provide: PedidoGateway, useClass: BffPedidoGateway },
    { provide: ContenidoGateway, useClass: BffContenidoGateway },
    { provide: ReclamoGateway, useClass: BffReclamoGateway },
    { provide: AparienciaGateway, useClass: BffAparienciaGateway },
    { provide: VisitaGateway, useClass: BffVisitaGateway },
  ],
};
