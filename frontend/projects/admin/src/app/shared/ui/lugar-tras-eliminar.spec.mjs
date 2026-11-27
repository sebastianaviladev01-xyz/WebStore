import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 43 (ADR-0033, PBI-0269) y PBI-0273: a qué fila va el foco tras eliminar una. La regla es pura; la llevan a la
// práctica `focoTrasEliminar()` (los botones de eliminar de la lista) y las e2e de admin-confirmar-borrado.spec.ts.
const fuente = await readFile(new URL('./lugar-tras-eliminar.ts', import.meta.url), 'utf8');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { lugarTrasEliminar } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

const misma = { paginaAntes: 1, paginaDespues: 1 };

test('va a la fila que ocupa el lugar de la eliminada', () => {
  assert.equal(lugarTrasEliminar({ lugar: 0, quedan: 2, ...misma }), 0);
  assert.equal(lugarTrasEliminar({ lugar: 3, quedan: 9, ...misma }), 3);
});

test('si era la última, va a la anterior', () => {
  assert.equal(lugarTrasEliminar({ lugar: 2, quedan: 2, ...misma }), 1);
});

test('una página llena que se rellena con la siguiente conserva el lugar', () => {
  assert.equal(lugarTrasEliminar({ lugar: 9, quedan: 10, paginaAntes: 2, paginaDespues: 2 }), 9);
});

test('PBI-0273: si la lista volvió a la página anterior, va a la última fila de esa página', () => {
  assert.equal(lugarTrasEliminar({ lugar: 0, quedan: 10, paginaAntes: 2, paginaDespues: 1 }), 9);
  assert.equal(lugarTrasEliminar({ lugar: 0, quedan: 25, paginaAntes: 4, paginaDespues: 3 }), 24);
});

test('con la lista vacía o sin saber el lugar, va al título (-1)', () => {
  assert.equal(lugarTrasEliminar({ lugar: 0, quedan: 0, ...misma }), -1);
  assert.equal(lugarTrasEliminar({ lugar: -1, quedan: 4, ...misma }), -1);
  assert.equal(lugarTrasEliminar({ lugar: 0, quedan: 0, paginaAntes: 2, paginaDespues: 1 }), -1);
});
