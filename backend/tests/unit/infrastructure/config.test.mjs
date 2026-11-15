/**
 * Configuración del BFF (lote 01, ADR-0017): los códigos de verificación y de recuperación solo viajan en la
 * respuesta si se pide explícitamente o en modo demo (PBI-0091), y el reinicio de la tienda solo se habilita en
 * modo demo o con una variable explícita para pruebas (PBI-0090).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readConfig } from '../../../src/infrastructure/config.mjs';

const casos = [
  ['sin variables', {}, false, false],
  ['NODE_ENV=development', { NODE_ENV: 'development' }, false, false],
  ['WEBSTORE_EXPOSE_TEST_CODES=true', { WEBSTORE_EXPOSE_TEST_CODES: 'true' }, true, false],
  ['WEBSTORE_EXPOSE_TEST_CODES=1', { WEBSTORE_EXPOSE_TEST_CODES: '1' }, false, false],
  ['modo demo', { WEBSTORE_DEMO_MODE: 'true' }, true, true],
  [
    'modo demo con los códigos apagados',
    { WEBSTORE_DEMO_MODE: 'true', WEBSTORE_EXPOSE_TEST_CODES: 'false' },
    false,
    true,
  ],
  ['WEBSTORE_ALLOW_STORE_RESET=true', { WEBSTORE_ALLOW_STORE_RESET: 'true' }, false, true],
  ['WEBSTORE_ALLOW_STORE_RESET=sí', { WEBSTORE_ALLOW_STORE_RESET: 'sí' }, false, false],
  [
    'producción con los códigos pedidos',
    { NODE_ENV: 'production', WEBSTORE_EXPOSE_TEST_CODES: 'true' },
    true,
    false,
  ],
];

for (const [nombre, env, codigos, reinicio] of casos)
  test(`${nombre}: códigos ${codigos ? 'expuestos' : 'ocultos'}, reinicio ${reinicio ? 'habilitado' : 'deshabilitado'}`, () => {
    const config = readConfig(env);
    assert.equal(config.exposeTestCodes, codigos);
    assert.equal(config.allowStoreReset, reinicio);
  });
