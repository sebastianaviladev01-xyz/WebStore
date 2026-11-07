/** Pruebas unitarias de las reglas de roles del Admin: funciones puras, sin servidor ni archivo de estado. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { can, migrateRole } from '../../../../src/domain/sesion/rol.rules.mjs';

test('los roles anteriores se traducen a los roles fijos', () => {
  assert.equal(migrateRole('owner'), 'superadmin');
  assert.equal(migrateRole('catalog-maintainer'), 'vendedor');
  assert.equal(migrateRole('admin'), 'admin');
});

test('solo el superadministrador gestiona usuarios; el vendedor no toca precios ni tarifas', () => {
  assert.ok(can('superadmin', 'users.manage'));
  assert.ok(!can('admin', 'users.manage'));
  assert.ok(can('admin', 'shipping.manage'));
  assert.ok(can('vendedor', 'orders.manage'));
  assert.ok(!can('vendedor', 'products.manage'));
  assert.ok(!can('vendedor', 'shipping.manage'));
});
