import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { normalizeState, SCHEMA_VERSION } from './normalizar-estado.mjs';
import { seed } from './seed.mjs';

function load(dataFile) {
  if (!existsSync(dataFile)) return structuredClone(seed);
  try {
    return JSON.parse(readFileSync(dataFile, 'utf8'));
  } catch {
    return structuredClone(seed);
  }
}

/**
 * Estado completo de la tienda en memoria, persistido como JSON en `dataFile`.
 * Al crearse normaliza y migra lo que haya en disco y lo vuelve a guardar.
 * Los casos de uso leen `store.state`, lo modifican y llaman a `save()` cuando corresponde.
 */
export function createJsonStateStore({ dataFile, demoPasswords }) {
  let state = normalizeState(load(dataFile), demoPasswords);
  const save = () => writeFileSync(dataFile, JSON.stringify(state, null, 2));
  save();

  return {
    get state() {
      return state;
    },
    set state(next) {
      state = next;
    },
    save,
    /** Estado de demostración recién normalizado (para reiniciar la tienda). */
    initialState: () =>
      normalizeState({ ...structuredClone(seed), schemaVersion: SCHEMA_VERSION }, demoPasswords),
  };
}
