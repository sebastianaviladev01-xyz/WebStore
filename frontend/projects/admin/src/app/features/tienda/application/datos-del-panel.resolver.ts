import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';

import { TiendaFacade } from './tienda.facade';

/**
 * Cada página del panel consulta sus datos al BFF al entrar (lote 07, PBI-0140): la cabecera ya no tiene
 * «Actualizar». No espera la respuesta: la primera vez el panel muestra «Cargando operación…» y, después, la página
 * se actualiza cuando llegan los datos. Solo corre al cambiar de página, no con los filtros de la URL, que refresca
 * «Buscar». Las interfaces de edición (`:id`) traen los datos ellas mismas.
 */
export const datosDelPanelResolver: ResolveFn<true> = () => {
  void inject(TiendaFacade).entrar();
  return true;
};
