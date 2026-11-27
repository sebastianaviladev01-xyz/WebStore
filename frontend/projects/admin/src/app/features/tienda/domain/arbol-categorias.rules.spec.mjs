import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 22 (ADR-0025, PBI-0220; confirmado por Sebastián Avila): la lista de Categorías del Admin es un árbol que
// se abre y se cierra por niveles, en lugar de la ruta en texto. Una categoría sin hijas es el último nivel. Los filtros
// siguen: «Categoría padre» deja las hijas de esa categoría (con sus ramas) y «Nombre» deja las que coinciden, con las
// categorías que las contienen abiertas para que se vean. El teclado sigue el patrón de árbol de WAI-ARIA.
const leer = async (ruta) =>
  (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/^import [\s\S]*?;$/gm, '');
const fuente = [
  await leer('./categoria.rules.ts'),
  await leer('./listado.rules.ts'),
  await leer('./filtro-catalogo.model.ts'),
  await leer('./arbol-categorias.rules.ts'),
].join('\n');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { arbolDeCategorias, filasVisibles, moverEnArbol, SIN_PADRE } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

const cat = (id, name, parentId, order) => ({ id, name, parentId, order });
// TV y audio > OLED > QD-OLED; TV y audio > Barras; Cocina (sin hijas); Monitores (sin hijas).
const CATEGORIAS = [
  cat('cocina', 'Cocina', undefined, 3),
  cat('tv', 'TV y audio', undefined, 1),
  cat('oled', 'OLED', 'tv', 1),
  cat('qd', 'QD-OLED', 'oled'),
  cat('barras', 'Barras de sonido', 'tv', 2),
  cat('monitores', 'Monitores', undefined, 2),
];
const SIN_FILTROS = { nombre: '', padreId: '' };

const ids = (nodos) => nodos.map((nodo) => nodo.category.id);
const visibles = (raices, abiertas = []) => filasVisibles(raices, new Set(abiertas));

test('las raíces son las de primer nivel, en el orden de siempre, y cada una lleva sus hijas', () => {
  const { raices, abiertas } = arbolDeCategorias(CATEGORIAS, SIN_FILTROS);
  assert.deepEqual(ids(raices), ['tv', 'monitores', 'cocina']);
  assert.deepEqual(ids(raices[0].children), ['oled', 'barras']);
  assert.deepEqual(ids(raices[0].children[0].children), ['qd']);
  // Una categoría sin hijas es el último nivel.
  assert.deepEqual(raices[2].children, []);
  // Sin filtro de nombre, nada empieza abierto.
  assert.deepEqual([...abiertas], []);
});

test('un padre que ya no existe deja a la categoría como raíz, y un ciclo no se recorre sin fin', () => {
  const { raices } = arbolDeCategorias(
    [cat('huerfana', 'Huérfana', 'no-existe'), cat('a', 'A', 'b'), cat('b', 'B', 'a')],
    SIN_FILTROS,
  );
  assert.deepEqual(ids(raices).sort(), ['a', 'b', 'huerfana']);
});

test('cerradas, solo se ven las raíces; al abrir, aparecen las hijas justo debajo, con su nivel y su posición', () => {
  const { raices } = arbolDeCategorias(CATEGORIAS, SIN_FILTROS);
  assert.deepEqual(
    visibles(raices).map((fila) => fila.category.id),
    ['tv', 'monitores', 'cocina'],
  );
  const filas = visibles(raices, ['tv']);
  assert.deepEqual(
    filas.map((fila) => [
      fila.category.id,
      fila.nivel,
      fila.posicion,
      fila.total,
      fila.tieneHijas,
      fila.abierta,
    ]),
    [
      ['tv', 1, 1, 3, true, true],
      ['oled', 2, 1, 2, true, false],
      ['barras', 2, 2, 2, false, false],
      ['monitores', 1, 2, 3, false, false],
      ['cocina', 1, 3, 3, false, false],
    ],
  );
  assert.equal(filas[1].padreId, 'tv');
  assert.equal(filas[0].padreId, undefined);
  // Una abierta dentro de una cerrada no se ve.
  assert.deepEqual(
    visibles(raices, ['oled']).map((fila) => fila.category.id),
    ['tv', 'monitores', 'cocina'],
  );
});

test('«Categoría padre» deja como raíces sus hijas directas, con sus ramas; «Sin padre», las de primer nivel', () => {
  const porPadre = arbolDeCategorias(CATEGORIAS, { nombre: '', padreId: 'tv' });
  assert.deepEqual(ids(porPadre.raices), ['oled', 'barras']);
  assert.deepEqual(ids(porPadre.raices[0].children), ['qd']);
  const sinPadre = arbolDeCategorias(CATEGORIAS, { nombre: '', padreId: SIN_PADRE });
  assert.deepEqual(ids(sinPadre.raices), ['tv', 'monitores', 'cocina']);
  assert.deepEqual(ids(arbolDeCategorias(CATEGORIAS, { nombre: '', padreId: 'cocina' }).raices), []);
});

test('«Nombre» deja las que coinciden y las que las contienen, abiertas hasta la que coincide', () => {
  const { raices, abiertas } = arbolDeCategorias(CATEGORIAS, { nombre: 'qd', padreId: '' });
  assert.deepEqual(ids(raices), ['tv']);
  assert.deepEqual(ids(raices[0].children), ['oled']);
  assert.deepEqual([...abiertas].sort(), ['oled', 'tv']);
  const filas = filasVisibles(raices, abiertas);
  assert.deepEqual(
    filas.map((fila) => [fila.category.id, fila.coincide]),
    [
      ['tv', false],
      ['oled', false],
      ['qd', true],
    ],
  );
});

test('«Nombre» conserva las ramas de la que coincide, cerradas, y no distingue mayúsculas ni tildes', () => {
  const { raices, abiertas } = arbolDeCategorias(CATEGORIAS, { nombre: 'tv Y AUDIO', padreId: '' });
  assert.deepEqual(ids(raices), ['tv']);
  assert.deepEqual(ids(raices[0].children), ['oled', 'barras']);
  assert.deepEqual([...abiertas], []);
  const conTilde = arbolDeCategorias([cat('a', 'Línea blanca')], { nombre: 'linea', padreId: '' });
  assert.deepEqual(ids(conTilde.raices), ['a']);
  assert.deepEqual(ids(arbolDeCategorias(CATEGORIAS, { nombre: 'zzz', padreId: '' }).raices), []);
});

test('«Nombre» y «Categoría padre» juntos buscan dentro de las ramas de esa categoría', () => {
  const { raices } = arbolDeCategorias(CATEGORIAS, { nombre: 'oled', padreId: 'tv' });
  assert.deepEqual(ids(raices), ['oled']);
  assert.deepEqual(ids(arbolDeCategorias(CATEGORIAS, { nombre: 'cocina', padreId: 'tv' }).raices), []);
});

test('teclado: flechas arriba y abajo, Inicio y Fin recorren las filas visibles', () => {
  const { raices } = arbolDeCategorias(CATEGORIAS, SIN_FILTROS);
  const filas = visibles(raices, ['tv']);
  assert.deepEqual(moverEnArbol(filas, 'tv', 'ArrowDown'), { foco: 'oled', abrir: [], cerrar: [] });
  assert.deepEqual(moverEnArbol(filas, 'oled', 'ArrowUp').foco, 'tv');
  assert.equal(moverEnArbol(filas, 'tv', 'ArrowUp').foco, 'tv');
  assert.equal(moverEnArbol(filas, 'cocina', 'ArrowDown').foco, 'cocina');
  assert.equal(moverEnArbol(filas, 'barras', 'Home').foco, 'tv');
  assert.equal(moverEnArbol(filas, 'tv', 'End').foco, 'cocina');
});

test('teclado: la derecha abre una cerrada y, abierta, baja a su primera hija; en la última, no hace nada', () => {
  const { raices } = arbolDeCategorias(CATEGORIAS, SIN_FILTROS);
  assert.deepEqual(moverEnArbol(visibles(raices), 'tv', 'ArrowRight'), {
    foco: 'tv',
    abrir: ['tv'],
    cerrar: [],
  });
  assert.deepEqual(moverEnArbol(visibles(raices, ['tv']), 'tv', 'ArrowRight'), {
    foco: 'oled',
    abrir: [],
    cerrar: [],
  });
  assert.deepEqual(moverEnArbol(visibles(raices), 'cocina', 'ArrowRight'), {
    foco: 'cocina',
    abrir: [],
    cerrar: [],
  });
});

test('teclado: la izquierda cierra una abierta y, cerrada o sin hijas, sube a su padre', () => {
  const { raices } = arbolDeCategorias(CATEGORIAS, SIN_FILTROS);
  const filas = visibles(raices, ['tv']);
  assert.deepEqual(moverEnArbol(filas, 'tv', 'ArrowLeft'), { foco: 'tv', abrir: [], cerrar: ['tv'] });
  assert.deepEqual(moverEnArbol(filas, 'barras', 'ArrowLeft'), { foco: 'tv', abrir: [], cerrar: [] });
  assert.deepEqual(moverEnArbol(filas, 'cocina', 'ArrowLeft'), { foco: 'cocina', abrir: [], cerrar: [] });
});

test('teclado: el asterisco abre todas las hermanas que tienen hijas', () => {
  const { raices } = arbolDeCategorias(CATEGORIAS, SIN_FILTROS);
  const filas = visibles(raices, ['tv']);
  assert.deepEqual(moverEnArbol(filas, 'barras', '*'), { foco: 'barras', abrir: ['oled'], cerrar: [] });
  assert.deepEqual(moverEnArbol(filas, 'cocina', '*'), { foco: 'cocina', abrir: ['tv'], cerrar: [] });
});

test('teclado: una tecla que no es del árbol no hace nada, y una fila que ya no se ve lleva a la primera', () => {
  const { raices } = arbolDeCategorias(CATEGORIAS, SIN_FILTROS);
  const filas = visibles(raices);
  assert.equal(moverEnArbol(filas, 'tv', 'a'), null);
  assert.equal(moverEnArbol(filas, 'qd', 'ArrowDown').foco, 'tv');
  assert.equal(moverEnArbol([], 'tv', 'ArrowDown'), null);
});
