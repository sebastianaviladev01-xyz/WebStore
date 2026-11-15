import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 08 (ADR-0017), PBI-0134: eliminar un registro con confirmación, y salir de la edición si era el que se estaba
// editando (PBI-0122: «Guardar» no debe volver a crear al eliminado). Estaba copiado en Clientes, Usuarios, Tarifas y
// Banners; los defectos de una copia se repetían en las otras.
const fuente = await readFile(new URL('./eliminar-registro.ts', import.meta.url), 'utf8');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { eliminarRegistro } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

/** Un caso con sus dobles: qué respondió la persona, si el BFF eliminó y qué pasó. */
function caso({ confirmar, eliminado = true, editando = null, id = 'r-1' }) {
  const registro = { preguntas: [], eliminados: [], salidas: 0 };
  const resultado = eliminarRegistro({
    pregunta: '¿Eliminar cliente?',
    id,
    editando: () => editando,
    confirmar: (pregunta) => (registro.preguntas.push(pregunta), confirmar),
    eliminar: async (idEliminado) => (registro.eliminados.push(idEliminado), eliminado),
    salirDeLaEdicion: () => registro.salidas++,
  });
  return { registro, resultado };
}

test('con «Cancelar» en la confirmación no se elimina ni se sale de la edición', async () => {
  const { registro, resultado } = caso({ confirmar: false, editando: 'r-1' });
  assert.equal(await resultado, false);
  assert.deepEqual(registro, { preguntas: ['¿Eliminar cliente?'], eliminados: [], salidas: 0 });
});

test('confirmado, se elimina el registro y, si era el que se editaba, el formulario sale de la edición', async () => {
  const { registro, resultado } = caso({ confirmar: true, editando: 'r-1' });
  assert.equal(await resultado, true);
  assert.deepEqual(registro, { preguntas: ['¿Eliminar cliente?'], eliminados: ['r-1'], salidas: 1 });
});

test('si se elimina otro registro, la edición en curso sigue', async () => {
  const { registro } = caso({ confirmar: true, editando: 'r-2' });
  await new Promise((listo) => setImmediate(listo));
  assert.deepEqual(registro, { preguntas: ['¿Eliminar cliente?'], eliminados: ['r-1'], salidas: 0 });
  const sinEdicion = caso({ confirmar: true, editando: null });
  assert.equal(await sinEdicion.resultado, true);
  assert.equal(sinEdicion.registro.salidas, 0);
});

test('si el BFF no elimina, el formulario no sale de la edición: lo escrito se conserva', async () => {
  const { registro, resultado } = caso({ confirmar: true, eliminado: false, editando: 'r-1' });
  assert.equal(await resultado, false);
  assert.deepEqual(registro, { preguntas: ['¿Eliminar cliente?'], eliminados: ['r-1'], salidas: 0 });
});

test('la edición se lee al terminar de eliminar, no antes: la persona pudo cambiar de registro mientras tanto', async () => {
  let editando = 'r-1';
  let salidas = 0;
  await eliminarRegistro({
    pregunta: '¿Eliminar cliente?',
    id: 'r-1',
    editando: () => editando,
    confirmar: () => true,
    eliminar: async () => {
      editando = 'r-2';
      return true;
    },
    salirDeLaEdicion: () => salidas++,
  });
  assert.equal(salidas, 0);
});
