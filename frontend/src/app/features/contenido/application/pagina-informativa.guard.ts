import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ContenidoFacade } from './contenido.facade';
import { ConfiguracionTienda } from '../domain/contenido.model';

type InfoPageFlag = keyof Pick<
  ConfiguracionTienda,
  'contactPageEnabled' | 'shippingPageEnabled' | 'privacyPageEnabled' | 'termsPageEnabled'
>;

function guardFor(flag: InfoPageFlag): CanActivateFn {
  return async () => {
    const content = inject(ContenidoFacade);
    const router = inject(Router);
    await content.load(true);
    return content.settings()[flag] ? true : router.parseUrl('/');
  };
}

export const contactoHabilitadoGuard = guardFor('contactPageEnabled');
export const enviosHabilitadoGuard = guardFor('shippingPageEnabled');
export const privacidadHabilitadaGuard = guardFor('privacyPageEnabled');
export const terminosHabilitadosGuard = guardFor('termsPageEnabled');
