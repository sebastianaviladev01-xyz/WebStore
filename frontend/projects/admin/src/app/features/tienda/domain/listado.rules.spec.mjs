import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// TEST-01 y TEST-02 (feature 008): reglas genéricas de los listados del Admin.
const source = await readFile(new URL('./listado.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { textoBuscable, contieneTexto, paginar, ELEMENTOS_POR_PAGINA } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('TEST-01: el texto buscable no tiene mayúsculas, tildes ni espacios en los extremos', () => {
  assert.equal(textoBuscable('  Jesús María  '), 'jesus maria');
  assert.equal(textoBuscable('ÁÉÍÓÚ Ü'), 'aeiou u');
  assert.equal(textoBuscable('Ñandú'), 'nandu');
  assert.equal(textoBuscable(''), '');
});

test('TEST-01: contieneTexto ignora mayúsculas, tildes y espacios de los extremos', () => {
  assert.equal(contieneTexto('Jesús María', 'jesus maria'), true);
  assert.equal(contieneTexto('Cooler portátil', '  COOLER '), true);
  assert.equal(contieneTexto('Cooler portátil', 'PORTATIL'), true);
  assert.equal(contieneTexto('Audífonos', 'cooler'), false);
  assert.equal(
    contieneTexto('Cooler portátil', 'cooler  portatil'),
    false,
    'los espacios interiores cuentan',
  );
});

test('TEST-01: un filtro vacío o de solo espacios no filtra', () => {
  assert.equal(contieneTexto('Audífonos', ''), true);
  assert.equal(contieneTexto('Audífonos', '   '), true);
  assert.equal(contieneTexto('', ''), true);
});

const numeros = (n) => Array.from({ length: n }, (_, indice) => indice + 1);

test('TEST-02: 25 elementos por página', () => {
  assert.equal(ELEMENTOS_POR_PAGINA, 25);
  const pagina = paginar(numeros(25), 1, ELEMENTOS_POR_PAGINA);
  assert.deepEqual(
    [pagina.page, pagina.pages, pagina.from, pagina.to, pagina.total, pagina.items.length],
    [1, 1, 1, 25, 25, 25],
  );
});

test('TEST-02: 26 elementos dan dos páginas, la segunda con uno', () => {
  const primera = paginar(numeros(26), 1, 25);
  assert.deepEqual([primera.page, primera.pages, primera.from, primera.to], [1, 2, 1, 25]);
  assert.deepEqual(primera.items, numeros(25));
  const segunda = paginar(numeros(26), 2, 25);
  assert.deepEqual(
    [segunda.page, segunda.pages, segunda.from, segunda.to, segunda.total],
    [2, 2, 26, 26, 26],
  );
  assert.deepEqual(segunda.items, [26]);
});

test('TEST-02: una página mayor que la última muestra la última', () => {
  const pagina = paginar(numeros(30), 7, 25);
  assert.deepEqual([pagina.page, pagina.pages, pagina.from, pagina.to], [2, 2, 26, 30]);
  assert.deepEqual(pagina.items, [26, 27, 28, 29, 30]);
});

test('TEST-02: una página menor que 1 muestra la primera, y una decimal se redondea hacia abajo', () => {
  assert.equal(paginar(numeros(30), 0, 25).page, 1);
  assert.equal(paginar(numeros(30), -3, 25).page, 1);
  assert.equal(paginar(numeros(30), 1.9, 25).page, 1);
});

test('TEST-02: sin elementos, página 1 de 1 con from y to en 0', () => {
  const pagina = paginar([], 3, 25);
  assert.deepEqual(
    [pagina.page, pagina.pages, pagina.from, pagina.to, pagina.total, pagina.items.length],
    [1, 1, 0, 0, 0, 0],
  );
});
