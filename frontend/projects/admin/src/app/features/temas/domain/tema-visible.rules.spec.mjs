/**
 * TEST-15: regla `temaVisible` (AC-16 y AC-21). Como los demás `*.spec.mjs`, transpila el `.ts` y borra
 * sus líneas `import` (por eso `tema-visible.rules.ts` solo importa tipos). La misma regla y los mismos
 * casos viven en la tienda y en el Admin.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const fuente = await readFile(new URL('./tema-visible.rules.ts', import.meta.url), 'utf8');
const modulo = ts.transpileModule(fuente.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { temaVisible } = await import(`data:text/javascript;base64,${Buffer.from(modulo).toString('base64')}`);

const colores = {
  primary: '#111111',
  secondary: '#222222',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  contrast: '#000000',
};
const tema = (id) => ({
  id,
  name: `Tema ${id}`,
  kind: id.startsWith('t-') ? 'custom' : 'predefined',
  colors: colores,
  tokens: {},
});
const apariencia = (activeThemeId, ids = ['a', 'b', 'c', 't-1'], demoMode = false) => ({
  demoMode,
  activeThemeId,
  themes: ids.map(tema),
});

test('sin modo demo: el activo siempre y la cookie se ignora, pidiendo borrarla si existe', () => {
  const sinCookie = temaVisible(apariencia('c'), undefined);
  assert.equal(sinCookie.tema.id, 'c');
  assert.equal(sinCookie.esVistaPrevia, false);
  assert.equal(sinCookie.borrarVistaPrevia, false);

  const conCookie = temaVisible(apariencia('c'), 'a');
  assert.equal(conCookie.tema.id, 'c');
  assert.equal(conCookie.esVistaPrevia, false);
  assert.equal(conCookie.borrarVistaPrevia, true);

  for (const vacia of ['', null, undefined]) {
    const visible = temaVisible(apariencia('c'), vacia);
    assert.equal(visible.tema.id, 'c');
    assert.equal(visible.borrarVistaPrevia, false);
  }
});

test('con modo demo y vista previa existente: pinta ese tema y conserva la cookie', () => {
  for (const id of ['a', 't-1']) {
    const visible = temaVisible(apariencia('c', ['a', 'b', 'c', 't-1'], true), id);
    assert.equal(visible.tema.id, id);
    assert.equal(visible.esVistaPrevia, true);
    assert.equal(visible.borrarVistaPrevia, false);
  }
});

test('con modo demo y vista previa borrada o ausente: el activo, y se borra la cookie solo si había', () => {
  const borrada = temaVisible(apariencia('c', ['a', 'b', 'c', 't-1'], true), 'zz');
  assert.equal(borrada.tema.id, 'c');
  assert.equal(borrada.esVistaPrevia, false);
  assert.equal(borrada.borrarVistaPrevia, true);

  const sinCookie = temaVisible(apariencia('c', ['a', 'b', 'c', 't-1'], true), null);
  assert.equal(sinCookie.tema.id, 'c');
  assert.equal(sinCookie.esVistaPrevia, false);
  assert.equal(sinCookie.borrarVistaPrevia, false);
});

test('activo ausente de la lista: cae a `b`, luego al primero, y una lista vacía lanza', () => {
  assert.equal(temaVisible(apariencia('borrado'), null).tema.id, 'b');
  assert.equal(temaVisible(apariencia('borrado', ['t-1', 'c']), null).tema.id, 't-1');
  assert.throws(() => temaVisible(apariencia('borrado', []), null), Error);
});

test('no muta la apariencia y el .ts solo tiene import type', () => {
  const entrada = apariencia('c', ['a', 'b', 'c', 't-1'], true);
  const copia = structuredClone(entrada);
  temaVisible(entrada, 'a');
  temaVisible(entrada, 'zz');
  assert.deepEqual(entrada, copia);

  const imports = fuente.split('\n').filter((linea) => /^\s*import\b/.test(linea));
  assert.ok(imports.length > 0);
  for (const linea of imports) assert.match(linea, /^import type \{.*\} from '\.\/tema\.model';$/);
});
