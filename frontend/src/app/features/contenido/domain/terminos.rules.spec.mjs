/**
 * Versión de los términos en su página (lote 20, ADR-0021; hallazgo del lote 17, PBI-0177): el comprador acepta en el
 * checkout un número de versión, así que la página de Términos dice cuál está vigente y, si se sabe, cuándo se
 * publicó, con la fecha de Lima. Sin versión (el contenido de respaldo), nada.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./terminos.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { versionDeLosTerminos } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

test('con la fecha de publicación: «Versión N · publicada el DD/MM/AAAA», con la fecha de Lima', () => {
  assert.equal(
    versionDeLosTerminos({ termsVersion: 2, termsPublishedAt: '2026-11-23T15:04:09.000Z' }),
    'Versión 2 · publicada el 23/11/2026',
  );
  // 02:30 UTC del 1 de marzo es aún 28 de febrero en Lima (UTC−5).
  assert.equal(
    versionDeLosTerminos({ termsVersion: 3, termsPublishedAt: '2026-03-01T02:30:00.000Z' }),
    'Versión 3 · publicada el 28/02/2026',
  );
});

test('sin fecha (anterior al registro de versiones) o con una fecha que no se entiende, solo la versión', () => {
  assert.equal(versionDeLosTerminos({ termsVersion: 1, termsPublishedAt: null }), 'Versión 1');
  assert.equal(versionDeLosTerminos({ termsVersion: 1 }), 'Versión 1');
  assert.equal(versionDeLosTerminos({ termsVersion: 4, termsPublishedAt: 'ayer' }), 'Versión 4');
});

test('sin una versión válida (el contenido de respaldo), no dice nada', () => {
  for (const termsVersion of [undefined, null, 0, -1, 1.5, '2'])
    assert.equal(versionDeLosTerminos({ termsVersion, termsPublishedAt: null }), null, String(termsVersion));
});
