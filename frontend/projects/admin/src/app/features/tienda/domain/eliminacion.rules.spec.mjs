import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 06 (ADR-0017), PBI-0131: una marca o una categoría que usan productos, o una categoría con subcategorías,
// no se elimina. El Admin lo avisa antes de enviar, con los mismos motivos que el BFF.
const source = await readFile(new URL('./eliminacion.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import [\s\S]*?;$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { motivoParaNoEliminarMarca, motivoParaNoEliminarCategoria } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

const productos = [
  { id: 'p1', brandId: 'b-nova', categoryId: 'cat-tv' },
  { id: 'p2', brandId: 'b-nova', categoryId: 'cat-tv' },
  { id: 'p3', brandId: 'b-zen', categoryId: 'cat-kitchen' },
];
const categorias = [
  { id: 'cat-tv', name: 'TV y audio' },
  { id: 'cat-tv-oled', name: 'OLED', parentId: 'cat-tv' },
  { id: 'cat-kitchen', name: 'Cocina' },
  { id: 'cat-libre', name: 'Libre' },
  { id: 'cat-padre', name: 'Padre' },
  { id: 'cat-h1', name: 'H1', parentId: 'cat-padre' },
  { id: 'cat-h2', name: 'H2', parentId: 'cat-padre' },
];

test('PBI-0131: una marca con productos no se elimina y el motivo dice cuántos', () => {
  assert.equal(
    motivoParaNoEliminarMarca({ id: 'b-nova', name: 'Nova' }, productos),
    'No se puede eliminar la marca «Nova»: la usan 2 productos. Cámbiales la marca antes de eliminarla.',
  );
  assert.equal(
    motivoParaNoEliminarMarca({ id: 'b-zen', name: 'Zenith' }, productos),
    'No se puede eliminar la marca «Zenith»: la usa 1 producto. Cámbiale la marca antes de eliminarla.',
  );
  assert.equal(motivoParaNoEliminarMarca({ id: 'b-libre', name: 'Libre' }, productos), null);
});

test('PBI-0131: una categoría con subcategorías o con productos no se elimina', () => {
  assert.equal(
    motivoParaNoEliminarCategoria(categorias[0], categorias, productos),
    'No se puede eliminar la categoría «TV y audio»: tiene 1 subcategoría. Muévela o elimínala antes.',
  );
  assert.equal(
    motivoParaNoEliminarCategoria(categorias[4], categorias, productos),
    'No se puede eliminar la categoría «Padre»: tiene 2 subcategorías. Muévelas o elimínalas antes.',
  );
  assert.equal(
    motivoParaNoEliminarCategoria(categorias[2], categorias, productos),
    'No se puede eliminar la categoría «Cocina»: la usa 1 producto. Cámbiale la categoría antes de eliminarla.',
  );
  assert.equal(motivoParaNoEliminarCategoria(categorias[3], categorias, productos), null);
});
