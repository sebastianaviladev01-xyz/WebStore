import { computed, effect, inject, Injector, Signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { leerPagina, ParametrosUrl } from '../domain/filtro-catalogo.rules';
import {
  leerTamanoDePagina,
  paginaDelElemento,
  paginar,
  TAMANO_DE_PAGINA_POR_OMISION,
  TamanoDePagina,
} from '../domain/listado.rules';

/** Parámetro con que una página de registro avisa al listado del registro que acaba de crear: `?nuevo=<id>`. */
export const PARAMETRO_NUEVO = 'nuevo';

/** Dónde buscar un registro para llevar el listado a su página. */
export interface BusquedaDelRegistro<T> {
  /** La lista con los filtros de la URL, en el orden del listado. */
  readonly filtrados: () => readonly T[];
  /** La lista sin filtros, en el mismo orden. */
  readonly todos: () => readonly T[];
  /** Si el elemento es (o contiene, en un árbol) el registro con ese `id`. */
  readonly es: (item: T, id: string) => boolean;
}

/**
 * La página y su tamaño en la URL (STD-08), para todos los listados del backoffice (lote 43, ADR-0033, PBI-0265):
 * `pagina` y `porPagina` (10, 25 o 50; sin el parámetro, 10). Cambiar el tamaño vuelve a la primera página; buscar
 * conserva el tamaño (`conservar()`). Se llama en el constructor de la página (usa `inject`).
 *
 * Un registro recién creado puede quedar en otra página: `irAlRegistro()` lleva el listado a la suya (lo llaman las
 * ventanas de registro al crear) y `seguirRegistroNuevo()` hace lo mismo cuando la URL trae `?nuevo=<id>` (lo que
 * debe pasar una página de registro al volver al listado tras crear). Si los filtros de la URL lo dejan fuera, se
 * quitan los filtros (se conserva el tamaño) y se va a su página en la lista completa: es la única forma de verlo.
 */
export function paginacionDeLaUrl(parametros: Signal<ParametrosUrl>) {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const injector = inject(Injector);
  const tamano = computed(() => leerTamanoDePagina(parametros()['porPagina']));
  const conservar = (): Record<string, string> =>
    tamano() === TAMANO_DE_PAGINA_POR_OMISION ? {} : { porPagina: String(tamano()) };
  const numero = (pagina: number) => (pagina > 1 ? pagina : null);

  function irAlRegistro<T>(busqueda: BusquedaDelRegistro<T>, id: string): void {
    const es = (item: T) => busqueda.es(item, id);
    const conFiltros = paginaDelElemento(busqueda.filtrados(), es, tamano());
    if (conFiltros !== null) {
      void router.navigate([], {
        relativeTo: route,
        queryParams: { pagina: numero(conFiltros), [PARAMETRO_NUEVO]: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      return;
    }
    const sinFiltros = paginaDelElemento(busqueda.todos(), es, tamano());
    void router.navigate([], {
      relativeTo: route,
      // Sin `merge`: quita los filtros (y `nuevo`); conserva el tamaño.
      queryParams:
        sinFiltros === null
          ? { ...parametros(), [PARAMETRO_NUEVO]: null }
          : { ...conservar(), pagina: numero(sinFiltros) },
      replaceUrl: true,
    });
  }

  return {
    tamano,
    /** Corta la lista ya filtrada en la página de la URL, con el tamaño de la URL. */
    paginar: <T>(items: readonly T[]) => paginar(items, leerPagina(parametros()), tamano()),
    irAPagina(pagina: number): void {
      void router.navigate([], {
        relativeTo: route,
        queryParams: { pagina: numero(pagina) },
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
    conservar,
    irAlRegistro,
    /** Si la URL trae `?nuevo=<id>` y el registro ya está en los datos, lleva el listado a su página. */
    seguirRegistroNuevo<T>(busqueda: BusquedaDelRegistro<T>): void {
      effect(
        () => {
          const id = parametros()[PARAMETRO_NUEVO];
          if (!id || !busqueda.todos().some((item) => busqueda.es(item, id))) return;
          untracked(() => irAlRegistro(busqueda, id));
        },
        { injector },
      );
    },
  };
}
