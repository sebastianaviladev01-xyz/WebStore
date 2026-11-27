import { computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { TiendaFacade } from '../application/tienda.facade';
import { ParametrosUrl } from '../domain/filtro-catalogo.rules';
import { paginacionDeLaUrl } from './paginacion-de-la-url';

type Filtros<F> = { readonly [K in keyof F]: string };

interface OpcionesFiltros<F extends Filtros<F>> {
  readonly leer: (parametros: ParametrosUrl) => F;
  readonly escribir: (filtros: F) => Record<string, string>;
  readonly vacios: F;
  /** Qué listado no se pudo consultar, para el aviso junto al panel (por ejemplo, «los clientes»). */
  readonly que: string;
}

/**
 * Filtros de un listado del Admin en la URL, con la disposición de la feature 008 que ya usa Productos (lote 07,
 * PBI-0139): el panel edita un borrador que se iguala a los parámetros cada vez que cambian (también con atrás y
 * adelante); «Buscar» trae los datos actuales con `TiendaFacade.refresh()` y navega sin `pagina`; «Limpiar filtros»
 * vacía el borrador sin buscar. Se llama en el constructor de la página (usa `inject`).
 */
export function filtrosDeListado<F extends Filtros<F>>(opciones: OpcionesFiltros<F>) {
  const admin = inject(TiendaFacade);
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const parametros = toSignal(
    route.queryParamMap.pipe(
      map((mapa): ParametrosUrl =>
        Object.fromEntries(mapa.keys.map((clave) => [clave, mapa.get(clave) ?? undefined])),
      ),
    ),
    { requireSync: true },
  );
  const aplicados = computed(() => opciones.leer(parametros()));
  const paginacion = paginacionDeLaUrl(parametros);
  const controles = Object.fromEntries(
    Object.entries(opciones.vacios).map(([clave, valor]) => [
      clave,
      new FormControl(valor as string, { nonNullable: true }),
    ]),
  ) as { [K in keyof F]: FormControl<F[K]> };
  const borrador = new FormGroup(controles);
  const buscando = signal(false);
  const error = signal<string | null>(null);
  effect(() => {
    const filtros = aplicados();
    untracked(() => borrador.setValue({ ...filtros } as never));
  });

  return {
    aplicados,
    borrador,
    buscando: buscando.asReadonly(),
    error: error.asReadonly(),
    /** Corta la lista ya filtrada en la página de la URL (`pagina`), con el tamaño de la URL (`porPagina`, lote 43). */
    paginar: paginacion.paginar,
    tamano: paginacion.tamano,
    cambiarTamano: paginacion.cambiarTamano,
    async buscar(): Promise<void> {
      buscando.set(true);
      error.set(null);
      const actual = await admin.refresh();
      buscando.set(false);
      if (!actual) {
        error.set(
          `No pudimos consultar ${opciones.que} actuales. La lista muestra la última búsqueda; inténtalo de nuevo.`,
        );
        return;
      }
      await router.navigate([], {
        relativeTo: route,
        queryParams: {
          ...opciones.escribir(borrador.getRawValue() as unknown as F),
          ...paginacion.conservar(),
        },
      });
    },
    limpiar(): void {
      borrador.setValue({ ...opciones.vacios } as never);
    },
    irAPagina: paginacion.irAPagina,
    /** Lote 43: lleva el listado a la página de un registro (recién creado); ver `paginacionDeLaUrl`. */
    irAlRegistro: paginacion.irAlRegistro,
    /** Lote 43: con `?nuevo=<id>` en la URL, lleva el listado a la página de ese registro. */
    seguirRegistroNuevo: paginacion.seguirRegistroNuevo,
  };
}
