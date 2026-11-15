import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017), PBI-0119, PBI-0120, PBI-0122 y PBI-0142: el Admin envía solo lo que cambió la persona y,
// antes de enviarlo sobre los datos vigentes, comprueba que el registro sigue existiendo y que nadie cambió esos
// mismos campos mientras tanto.
const source = await readFile(new URL('./cambio-registro.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { camposCambiados, prepararCambio, avisoDeCambio, cambiosEntreListas } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const tv = {
  id: 'p-001',
  name: 'OLED Vision',
  price: 3999,
  stock: 9,
  gallery: ['a.jpg', 'b.jpg'],
  parentId: 'cat-tv',
};

test('PBI-0120: camposCambiados devuelve solo los campos distintos, comparando listas por contenido', () => {
  assert.deepEqual(camposCambiados(tv, { ...tv, price: 3799, gallery: ['a.jpg', 'b.jpg'] }), { price: 3799 });
  assert.deepEqual(camposCambiados(tv, { ...tv, gallery: ['b.jpg', 'a.jpg'] }), {
    gallery: ['b.jpg', 'a.jpg'],
  });
  assert.deepEqual(camposCambiados(tv, { ...tv }), {});
});

test('PBI-0120: un campo que la persona vació llega como null (el BFF lo quita)', () => {
  assert.deepEqual(camposCambiados(tv, { ...tv, parentId: undefined }), { parentId: null });
});

test('PBI-0120: un registro nuevo se envía completo, sin los campos vacíos', () => {
  const nuevo = { id: 'p-nuevo', name: 'Nuevo', parentId: undefined };
  assert.deepEqual(prepararCambio(undefined, null, nuevo), {
    tipo: 'listo',
    cambio: { id: 'p-nuevo', name: 'Nuevo' },
  });
});

test('PBI-0121: un registro nuevo que ya existe en los datos vigentes no se vuelve a enviar', () => {
  assert.deepEqual(prepararCambio({ id: 'p-nuevo', name: 'Nuevo' }, null, { id: 'p-nuevo', name: 'Nuevo' }), {
    tipo: 'ya-existe',
  });
});

test('PBI-0120: la edición se envía como id y campos cambiados, sobre lo que otra persona cambió en otros campos', () => {
  const vigente = { ...tv, stock: 7, name: 'OLED Vision 2026' };
  assert.deepEqual(prepararCambio(vigente, tv, { ...tv, price: 3799 }), {
    tipo: 'listo',
    cambio: { id: 'p-001', price: 3799 },
  });
});

test('PBI-0120: si otra persona cambió el mismo campo, no se envía y dice cuál', () => {
  const vendido = { ...tv, stock: 7 };
  assert.deepEqual(prepararCambio(vendido, tv, { ...tv, stock: 12 }), {
    tipo: 'conflicto',
    campos: ['stock'],
  });
  assert.deepEqual(prepararCambio({ ...tv, price: 3500 }, tv, { ...tv, price: 3799, stock: 12 }), {
    tipo: 'conflicto',
    campos: ['price'],
  });
});

test('PBI-0120: si otra persona hizo el mismo cambio, no es un conflicto', () => {
  assert.deepEqual(prepararCambio({ ...tv, price: 3799 }, tv, { ...tv, price: 3799 }), {
    tipo: 'listo',
    cambio: { id: 'p-001', price: 3799 },
  });
});

test('PBI-0122 y PBI-0142: editar un registro que ya no existe no lo vuelve a crear', () => {
  assert.deepEqual(prepararCambio(undefined, tv, { ...tv, price: 1 }), { tipo: 'inexistente' });
});

test('PBI-0120: una edición sin cambios no se envía', () => {
  assert.deepEqual(prepararCambio(tv, tv, { ...tv }), { tipo: 'sin-cambios' });
});

test('PBI-0120: el aviso de un conflicto nombra los campos en español y pide revisar', () => {
  assert.equal(
    avisoDeCambio({ tipo: 'conflicto', campos: ['stock', 'price'] }),
    'Mientras editabas, otra persona cambió el stock y el precio. No se guardó: revisa los datos actuales y vuelve a intentarlo.',
  );
  assert.equal(
    avisoDeCambio({ tipo: 'conflicto', campos: ['campoRaro'] }),
    'Mientras editabas, otra persona cambió estos mismos datos. No se guardó: revisa los datos actuales y vuelve a intentarlo.',
  );
  assert.equal(
    avisoDeCambio({ tipo: 'inexistente' }),
    'Este registro ya no existe: otra persona lo eliminó. No se volvió a crear.',
  );
});

test('PBI-0120: una operación sobre varios registros (tarifas) envía solo los agregados, cambiados y quitados', () => {
  const antes = [
    { id: 'r1', origin: 'Lima', destination: 'Miraflores', price: 10 },
    { id: 'r2', origin: 'Lima', destination: 'Surco', price: 12 },
    { id: 'r3', origin: 'Lima', destination: 'Barranco', price: 9 },
  ];
  const despues = [
    { id: 'r1', origin: 'Lima', destination: 'Miraflores', price: 11 },
    { id: 'r2', origin: 'Lima', destination: 'Surco', price: 12 },
    { id: 'r4', origin: 'Lima', destination: 'Lince', price: 8 },
  ];
  assert.deepEqual(cambiosEntreListas(antes, despues), {
    upsert: [despues[0], despues[2]],
    remove: ['r3'],
  });
  assert.deepEqual(cambiosEntreListas(antes, antes), { upsert: [], remove: [] });
});
