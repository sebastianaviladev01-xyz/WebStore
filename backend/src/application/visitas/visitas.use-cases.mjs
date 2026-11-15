import { exigirIdDeVisita, personasEnLinea, registrarLatido } from '../../domain/visitas/visitas.rules.mjs';

/**
 * Personas en línea (lote 07b, ADR-0017, PBI-0027). Los latidos viven solo en la memoria de este proceso: no se
 * guardan en el estado ni en disco, y al reiniciar el BFF la cuenta vuelve a cero. `ahora` se inyecta para probar.
 */
export function createVisitasUseCases({ ahora = () => Date.now() } = {}) {
  const visitas = new Map();
  return {
    registrar(command) {
      registrarLatido(visitas, exigirIdDeVisita(command?.visitId), ahora());
    },
    enLinea: () => personasEnLinea(visitas, ahora()),
  };
}
