/**
 * Versiones de los términos y condiciones (lote 17, ADR-0021, PBI-0177; confirmado por Sebastián Avila): cada
 * texto publicado es una versión con su número, su fecha de publicación y su texto. El número lo calcula el BFF al
 * guardar, nunca el Admin. Los términos de antes del lote son la versión 1, sin fecha registrada.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  conTextoDeTerminos,
  normalizarVersionesDeTerminos,
  requireTermsVersion,
  versionVigente,
} from '../../../../src/domain/admin/terminos.rules.mjs';

const v1 = { version: 1, publishedAt: null, content: 'Texto 1' };

test('un estado sin versiones registra el texto vigente como la versión 1, sin fecha', () => {
  for (const guardadas of [undefined, null, 'x', []])
    assert.deepEqual(normalizarVersionesDeTerminos(guardadas, 'Texto 1', '2026-11-23T20:00:00.000Z'), [v1]);
});

test('si el texto vigente no es el de la última versión (otro BFF lo cambió), se registra uno nuevo al cargar', () => {
  assert.deepEqual(normalizarVersionesDeTerminos([v1], 'Texto 2', '2026-11-23T20:00:00.000Z'), [
    v1,
    { version: 2, publishedAt: '2026-11-23T20:00:00.000Z', content: 'Texto 2' },
  ]);
  assert.deepEqual(normalizarVersionesDeTerminos([v1], 'Texto 1', '2026-11-23T20:00:00.000Z'), [v1]);
});

test('al cargar se descartan las versiones mal formadas y se ordenan por número', () => {
  const v2 = { version: 2, publishedAt: '2026-11-20T10:00:00.000Z', content: 'Texto 2' };
  assert.deepEqual(
    normalizarVersionesDeTerminos(
      [v2, { version: 'x' }, null, v1, { version: 2, content: 'repetida' }],
      'Texto 2',
      'ahora',
    ),
    [v1, v2],
  );
});

test('cambiar el texto publica la versión siguiente con su fecha; el mismo texto no cambia nada', () => {
  const versiones = [v1];
  assert.equal(conTextoDeTerminos(versiones, 'Texto 1', '2026-11-23T20:00:00.000Z'), versiones);
  assert.deepEqual(conTextoDeTerminos(versiones, 'Texto nuevo', '2026-11-23T20:00:00.000Z'), [
    v1,
    { version: 2, publishedAt: '2026-11-23T20:00:00.000Z', content: 'Texto nuevo' },
  ]);
  assert.deepEqual(versiones, [v1], 'no modifica la lista recibida');
});

test('volver a un texto anterior es una versión nueva: lo que cuenta es lo publicado y cuándo', () => {
  const dos = conTextoDeTerminos([v1], 'Texto 2', 'a');
  assert.deepEqual(versionVigente(conTextoDeTerminos(dos, 'Texto 1', 'b')), {
    version: 3,
    publishedAt: 'b',
    content: 'Texto 1',
  });
});

test('el checkout envía la versión que mostró: si no es un entero positivo, INVALID_TERMS_VERSION', () => {
  for (const valor of [undefined, null, '1', 0, -1, 1.5])
    assert.throws(
      () => requireTermsVersion(valor, 1),
      { code: 'INVALID_TERMS_VERSION', kind: 'validation' },
      String(valor),
    );
});

test('una versión que ya no es la vigente responde TERMS_VERSION_CHANGED con la vigente', () => {
  assert.throws(
    () => requireTermsVersion(1, 2),
    (error) =>
      error.code === 'TERMS_VERSION_CHANGED' &&
      error.kind === 'conflict' &&
      error.details.termsVersion === 2 &&
      /cambiaron/.test(error.message),
  );
  assert.equal(requireTermsVersion(2, 2), 2);
});
