import { IMAGE_CONFIG } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { adminRoutes } from './app.routes';
import { SesionGateway } from './features/sesion/domain/sesion.gateway';
import { TiendaGateway } from './features/tienda/domain/tienda.gateway';
import { BffSesionGateway } from './features/sesion/data/bff-sesion.gateway';
import { BffTiendaGateway } from './features/tienda/data/bff-tienda.gateway';

export const adminConfig: ApplicationConfig = {
  providers: [
    provideRouter(adminRoutes, withComponentInputBinding()),
    provideHttpClient(),
    { provide: LOCALE_ID, useValue: 'es-PE' },
    // El Admin muestra miniaturas de las fotos que se suben (banners, productos) en tamaño reducido; que la foto
    // sea más grande que la miniatura es lo esperado aquí, así que se apaga ese aviso de desarrollo (NG0913).
    { provide: IMAGE_CONFIG, useValue: { disableImageSizeWarning: true } },
    { provide: SesionGateway, useClass: BffSesionGateway },
    { provide: TiendaGateway, useClass: BffTiendaGateway },
  ],
};
