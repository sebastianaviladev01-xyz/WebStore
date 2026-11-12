import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./usuario-admin.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { inicialesDeUsuario } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

/**
 * TEST-01 de la feature 003 (AC-08, AC-11): las iniciales del botón del menú de usuario salen del nombre y,
 * si no hay nombre, de la primera letra del correo.
 */
const CASOS = [
  ['Superadministrador Demo', 'owner@webstore.demo', 'SD'],
  ['Vendedor Demo', 'catalogo@webstore.demo', 'VD'],
  ['Ana María Torres', 'ana@example.com', 'AT'],
  ['  carlos  ', 'carlos@example.com', 'C'],
  ['Ángel Ruiz', 'angel@example.com', 'ÁR'],
  ['ñandú pérez', 'nandu@example.com', 'ÑP'],
];

for (const [nombre, correo, esperado] of CASOS) {
  test(`«${nombre}» → «${esperado}»`, () => {
    assert.equal(inicialesDeUsuario(nombre, correo), esperado);
  });
}

test('con la tilde descompuesta (NFD) devuelve la misma letra compuesta (NFC)', () => {
  const descompuesto = 'Ángel Ruiz'.normalize('NFD');
  assert.notEqual(descompuesto, 'Ángel Ruiz'.normalize('NFC'));
  const iniciales = inicialesDeUsuario(descompuesto, 'angel@example.com');
  assert.equal(iniciales, 'ÁR');
  assert.equal(iniciales, iniciales.normalize('NFC'));
});

test('con varios espacios entre las palabras usa la primera y la última', () => {
  assert.equal(inicialesDeUsuario('Ana    María   Torres', 'ana@example.com'), 'AT');
});

test('las letras fuera del BMP cuentan como un solo carácter', () => {
  // 𐐨 (U+10428, minúscula deseret) ocupa dos unidades UTF-16 y su mayúscula es 𐐀 (U+10400).
  assert.equal(inicialesDeUsuario('𐐨mil 𐐨rtiz', 'x@example.com'), '𐐀𐐀');
});

test('sin nombre o con solo espacios usa la primera letra del correo en mayúsculas', () => {
  assert.equal(inicialesDeUsuario('', 'owner@webstore.demo'), 'O');
  assert.equal(inicialesDeUsuario('   ', 'catalogo@webstore.demo'), 'C');
  assert.equal(inicialesDeUsuario('', ' ñandu@example.com'), 'Ñ');
});

test('sin nombre ni correo devuelve una cadena vacía', () => {
  assert.equal(inicialesDeUsuario('', ''), '');
  assert.equal(inicialesDeUsuario('   ', '   '), '');
});
