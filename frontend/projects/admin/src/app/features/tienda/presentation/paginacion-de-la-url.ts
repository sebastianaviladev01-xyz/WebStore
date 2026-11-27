import { computed, inject, Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { leerPagina, ParametrosUrl } from '../domain/filtro-catalogo.rules';
import {
  leerTamanoDePagina,
  paginar,
  TAMANO_DE_PAGINA_POR_OMISION,
  TamanoDePagina,
} from '../domain/listado.rules';

/**
 * La página y su tamaño en la URL (STD-08), para todos los listados del backoffice (lote 43, ADR-0033, PBI-0265):
 * `pagina` y `porPagina` (10, 25 o 50; sin el parámetro, 10). Cambiar el tamaño vuelve a la primera página; buscar
 * conserva el tamaño (`conservar()`). Se llama en el constructor de la página (usa `inject`).
 */
export function paginacionDeLaUrl(parametros: Signal<ParametrosUrl>) {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const tamano = computed(() => leerTamanoDePagina(parametros()['porPagina']));
  return {
    tamano,
    /** Corta la lista ya filtrada en la página de la URL, con el tamaño de la URL. */
    paginar: <T>(items: readonly T[]) => paginar(items, leerPagina(parametros()), tamano()),
    irAPagina(numero: number): void {
      void router.navigate([], {
        relativeTo: route,
        queryParams: { pagina: numero > 1 ? numero : null },
        queryParamsHandling: 'merge',
      });
    },
    cambiarTamano(nuevo: TamanoDePagina): void {
      void router.navigate([], {
        relativeTo: route,
        queryParams: { porPagina: nuevo === TAMANO_DE_PAGINA_POR_OMISION ? null : nuevo, pagina: null },
        queryParamsHandling: 'merge',
      });
    },
    /** El tamaño elegido, para los parámetros de una búsqueda nueva (que vuelve a la página 1). */
    conservar(): Record<string, string> {
      return tamano() === TAMANO_DE_PAGINA_POR_OMISION ? {} : { porPagina: String(tamano()) };
    },
  };
}
