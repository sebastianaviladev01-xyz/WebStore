import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Lote 07 (ADR-0017), PBI-0151: lo escrito en un formulario del Admin cuando la sesión vence se conserva solo en
// memoria (nunca en localStorage ni sessionStorage) y vuelve al ingresar otra vez en la misma pestaña, solo para la
// misma persona y en la misma página.
const fuente = await readFile(new URL('./borrador.rules.ts', import.meta.url), 'utf8');
const salida = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { conBorrador, tomarBorrador, borradoresAlIngresar, rutaDeRetorno } = await import(
  `data:text/javascript;base64,${Buffer.from(salida).toString('base64')}`
);

test('PBI-0151: un borrador nuevo de la misma persona y la misma página reemplaza al anterior', () => {
  const uno = conBorrador([], { usuarioId: 'u-1', ruta: '/contenido', valor: { storeName: 'A' } });
  const dos = conBorrador(uno, { usuarioId: 'u-1', ruta: '/contenido', valor: { storeName: 'B' } });
  const otro = conBorrador(dos, { usuarioId: 'u-1', ruta: '/marcas/nueva', valor: { name: 'Zeta' } });
  assert.deepEqual(
    otro.map((borrador) => [borrador.ruta, borrador.valor]),
    [
      ['/contenido', { storeName: 'B' }],
      ['/marcas/nueva', { name: 'Zeta' }],
    ],
  );
});

test('PBI-0151: tomar el borrador de una página lo devuelve una sola vez y deja los demás', () => {
  const borradores = [
    { usuarioId: 'u-1', ruta: '/contenido', valor: 1 },
    { usuarioId: 'u-1', ruta: '/clientes', valor: 2 },
  ];
  const { borrador, resto } = tomarBorrador(borradores, 'u-1', '/contenido');
  assert.equal(borrador.valor, 1);
  assert.deepEqual(resto, [borradores[1]]);
  assert.equal(tomarBorrador(resto, 'u-1', '/contenido').borrador, null);
});

test('PBI-0151: el borrador de otra persona no se recupera y se descarta al ingresar', () => {
  const borradores = [
    { usuarioId: 'u-1', ruta: '/contenido', valor: 1 },
    { usuarioId: 'u-2', ruta: '/contenido', valor: 2 },
  ];
  assert.equal(tomarBorrador(borradores, 'u-3', '/contenido').borrador, null);
  assert.deepEqual(borradoresAlIngresar(borradores, 'u-2'), [borradores[1]]);
  assert.deepEqual(borradoresAlIngresar(borradores, 'u-9'), []);
});

test('PBI-0151: tras ingresar se vuelve a la página del panel donde venció la sesión', () => {
  assert.equal(rutaDeRetorno('/contenido'), '/contenido');
  assert.equal(rutaDeRetorno('/productos/p-001?nombre=tv'), '/productos/p-001?nombre=tv');
  for (const ruta of [
    null,
    undefined,
    '',
    'contenido',
    '//otro.sitio',
    '/login',
    '/login?x=1',
    'https://x.pe',
  ])
    assert.equal(rutaDeRetorno(ruta), '/', String(ruta));
});
