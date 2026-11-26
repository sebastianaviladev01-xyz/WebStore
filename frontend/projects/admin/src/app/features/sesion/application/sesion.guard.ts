import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { SesionFacade } from './sesion.facade';

/**
 * Sin usuario no se entra al panel: lleva al acceso. Si hay token pero no se pudo comprobar (lote 40, PBI-0257), el
 * acceso avisa y ofrece «Reintentar»; la página que se quiso abrir queda anotada para volver a ella al reintentar.
 */
export const sesionGuard: CanMatchFn = async () => {
  // inject() solo funciona antes del primer await: fuera del contexto de inyección lanza NG0203.
  const session = inject(SesionFacade);
  const router = inject(Router);
  const destino = router.currentNavigation()?.extractedUrl;
  await session.ensureReady();
  if (session.isAuthenticated()) return true;
  if (destino) session.anotarRutaSinComprobar(router.serializeUrl(destino));
  return router.createUrlTree(['/login']);
};
