import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { SesionFacade } from './sesion.facade';

export const sesionGuard: CanMatchFn = async () => {
  // inject() solo funciona antes del primer await: fuera del contexto de inyección lanza NG0203.
  const session = inject(SesionFacade);
  const router = inject(Router);
  await session.ensureReady();
  return session.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
