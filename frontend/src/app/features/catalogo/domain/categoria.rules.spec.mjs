import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./categoria.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { hijosDeCategoria, descendientesDeCategoria } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const category = (id, name, parentId, order) => ({ id, name, parentId, order, slug: id, description: '' });

test('las categorías respetan orden explícito y fallback alfabético', () => {
  const items = [category('b', 'Beta'), category('z', 'Zeta', undefined, 1), category('a', 'Alfa')];
  assert.deepEqual(
    hijosDeCategoria(items).map((item) => item.id),
    ['z', 'a', 'b'],
  );
});

test('navegación y filtros incluyen todos los niveles descendientes', () => {
  const items = [
    category('root', 'Raíz'),
    category('a', 'A', 'root'),
    category('c', 'C', 'a'),
    category('d', 'D', 'c'),
    category('other', 'Otra'),
  ];
  assert.deepEqual(
    descendientesDeCategoria(items, 'root').map((entry) => [entry.category.id, entry.depth]),
    [
      ['a', 0],
      ['c', 1],
      ['d', 2],
    ],
  );
});

test('una referencia cíclica no bloquea la navegación', () => {
  const items = [category('a', 'A', 'c'), category('b', 'B', 'a'), category('c', 'C', 'b')];
  assert.deepEqual(
    descendientesDeCategoria(items, 'a').map((entry) => entry.category.id),
    ['b', 'c'],
  );
});
