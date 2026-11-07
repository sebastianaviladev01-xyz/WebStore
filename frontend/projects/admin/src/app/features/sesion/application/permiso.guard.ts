import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { Permiso } from '../domain/rol.rules';
import { SesionFacade } from './sesion.facade';

/** Bloquea un módulo para los roles que no tienen el permiso y los lleva al resumen del panel. */
export function permisoGuard(permission: Permiso): CanMatchFn {
  return () => {
    const session = inject(SesionFacade);
    return session.can(permission) ? true : inject(Router).createUrlTree(['/']);
  };
}
