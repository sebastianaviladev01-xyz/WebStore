import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

import { normalizeState, SCHEMA_VERSION } from './normalizar-estado.mjs';
import { seed } from './seed.mjs';

/** El archivo de datos existe pero no se puede usar: el BFF no arranca para no perder lo que contiene. */
export class EstadoIlegibleError extends Error {
  constructor(dataFile, motivo) {
    super(
      `El archivo de datos ${dataFile} no contiene un estado válido (${motivo}). ` +
        'El BFF no arranca para no reemplazarlo: revísalo o restáuralo desde una copia.',
    );
  }
}

/**
 * Estado guardado. Sin archivo, la semilla. Con un archivo dañado (JSON cortado o que no es un objeto) no
 * devuelve la semilla: lanza `EstadoIlegibleError`, porque guardarla después borraría los datos (PBI-0088).
 */
function load(dataFile) {
  if (!existsSync(dataFile)) return structuredClone(seed);
  let estado;
  try {
    estado = JSON.parse(readFileSync(dataFile, 'utf8'));
  } catch (error) {
    throw new EstadoIlegibleError(dataFile, error.message);
  }
  if (estado === null || typeof estado !== 'object' || Array.isArray(estado))
    throw new EstadoIlegibleError(dataFile, 'no es un objeto JSON');
  return estado;
}

/**
 * Escritura atómica: el estado completo va a un temporal junto al archivo y se renombra sobre él. Un corte a
 * mitad de la escritura deja el archivo anterior intacto, nunca uno a medias.
 */
function writeAtomically(dataFile, contenido) {
  const temporal = `${dataFile}.${process.pid}.tmp`;
  try {
    writeFileSync(temporal, contenido);
    renameSync(temporal, dataFile);
  } catch (error) {
    rmSync(temporal, { force: true });
    throw error;
  }
}

/**
 * Estado completo de la tienda en memoria, persistido como JSON en `dataFile`.
 * Al crearse normaliza y migra lo que haya en disco y lo vuelve a guardar.
 * Los casos de uso leen `store.state`, lo modifican y llaman a `save()` cuando corresponde. Lo que la
 * normalización repara o descarta al cargar (un tema propio inválido, PBI-0068) se escribe en `avisar`, el log del
 * BFF por defecto.
 */
export function createJsonStateStore({
  dataFile,
  demoPasswords,
  avisar = (aviso) => console.warn(aviso),
  fechasNoLaborablesIniciales = new Set(),
}) {
  const opciones = { fechasNoLaborablesIniciales };
  let state = normalizeState(load(dataFile), demoPasswords, avisar, opciones);
  const save = () => writeAtomically(dataFile, JSON.stringify(state, null, 2));
  save();

  return {
    get state() {
      return state;
    },
    set state(next) {
      state = next;
    },
    save,
    /** Estado de demostración recién normalizado (para reiniciar la tienda), con el calendario inicial (lote 17). */
    initialState: () =>
      normalizeState(
        { ...structuredClone(seed), schemaVersion: SCHEMA_VERSION },
        demoPasswords,
        () => {},
        opciones,
      ),
  };
}
