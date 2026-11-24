import { computed, Injectable, signal } from '@angular/core';

import {
  alternarEnComparar,
  MAXIMO_A_COMPARAR,
  quitarDeComparar,
  ResultadoDeComparar,
} from '../domain/comparador.rules';

/**
 * Comparador de productos (lote 19, ADR-0021, PBI-0001; provisional). La lista vive solo en memoria mientras dura la
 * visita (STD-08 no permite guardarla en el navegador); `/comparar` la refleja en la URL para compartirla y la toma de
 * ella al abrir un enlace. No llama al BFF: los productos salen del catálogo ya cargado.
 */
@Injectable({ providedIn: 'root' })
export class ComparadorFacade {
  private readonly idsState = signal<readonly string[]>([]);

  readonly ids = this.idsState.asReadonly();
  readonly cantidad = computed(() => this.idsState().length);
  readonly maximo = MAXIMO_A_COMPARAR;

  estaEn(id: string): boolean {
    return this.idsState().includes(id);
  }

  /** Agrega o quita el producto; con la lista llena no lo agrega y devuelve `lleno` para avisar. */
  alternar(id: string): ResultadoDeComparar {
    const { ids, resultado } = alternarEnComparar(this.idsState(), id);
    this.idsState.set(ids);
    return resultado;
  }

  quitar(id: string): void {
    this.idsState.update((ids) => quitarDeComparar(ids, id));
  }

  /** Toma la lista de un enlace compartido (ya depurada con `idsDesdeLaUrl`) o la que quedó tras quitar retirados. */
  reemplazar(ids: readonly string[]): void {
    this.idsState.set(ids);
  }
}
