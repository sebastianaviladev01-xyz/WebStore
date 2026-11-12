/** Pruebas unitarias de las reglas de roles del Admin: funciones puras, sin servidor ni archivo de estado. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  can,
  migrateRole,
} from '../../../../src/domain/sesion/rol.rules.mjs';

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

/** Tabla de roles fijos del 05/11. La feature 002 solo añade `themes.manage` al superadministrador. */
const OPERACION = [
  'dashboard.view',
  'products.edit',
  'products.manage',
  'inventory.manage',
  'categories.manage',
  'brands.manage',
  'customers.manage',
  'orders.manage',
  'banners.manage',
  'content.manage',
  'shipping.manage',
  'complaints.manage',
];

const TABLA = {
  superadmin: [...OPERACION, 'users.manage', 'store.reset', 'themes.manage'],
  admin: OPERACION,
  vendedor: ['dashboard.view', 'products.edit', 'inventory.manage', 'orders.manage'],
};

const permisosDe = (rol) => [...ADMIN_ROLES.find((definicion) => definicion.id === rol).permissions].sort();

test('los tres roles fijos tienen exactamente los permisos de la tabla', () => {
  assert.deepEqual(
    ADMIN_ROLES.map((rol) => rol.id),
    ['superadmin', 'admin', 'vendedor'],
  );
  for (const [rol, permisos] of Object.entries(TABLA)) {
    assert.deepEqual(permisosDe(rol), [...permisos].sort(), rol);
  }
});

test('solo el superadministrador gestiona los temas (TEST-09)', () => {
  assert.ok(ADMIN_PERMISSIONS.includes('themes.manage'));
  assert.ok(can('superadmin', 'themes.manage'));
  assert.ok(!can('admin', 'themes.manage'));
  assert.ok(!can('vendedor', 'themes.manage'));
  assert.ok(can('admin', 'content.manage'), 'el administrador sigue gestionando Contenido');
});
