/** Pruebas unitarias de las reglas de roles del Admin: funciones puras, sin servidor ni archivo de estado. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  can,
  managedUserRoles,
  migrateRole,
} from '../../../../src/domain/sesion/rol.rules.mjs';

test('los roles anteriores se traducen a los roles fijos', () => {
  assert.equal(migrateRole('owner'), 'superadmin');
  assert.equal(migrateRole('catalog-maintainer'), 'vendedor');
  assert.equal(migrateRole('admin'), 'admin');
});

/**
 * Tabla de roles fijos (05/11), con los permisos de la reunión del 11/11 (lote 07, PBI-0013, confirmados por Daniel el
 * 2026-11-18, con el cambio de PBI-0170): el superadministrador tiene la configuración de la tienda (temas, contenido y
 * reinicio) y todo lo demás; el administrador opera la tienda, elimina productos y gestiona a los vendedores; el
 * vendedor crea productos y los modifica, sin eliminarlos. La feature 002 añadió `themes.manage` al superadministrador.
 */
const OPERACION = [
  'dashboard.view',
  'products.edit',
  'products.manage',
  'products.delete',
  'inventory.manage',
  'categories.manage',
  'brands.manage',
  'customers.manage',
  'users.manage',
  'orders.view',
  'orders.manage',
  'banners.manage',
  'shipping.manage',
  'complaints.manage',
];

const TABLA = {
  superadmin: [...OPERACION, 'users.delete', 'content.manage', 'store.reset', 'themes.manage'],
  admin: OPERACION,
  // PBI-0170 (lote 11, ADR-0021; confirmado por Sebastián Avila): el vendedor gestiona Inventario y ve Pedidos sin
  // cambiar su estado.
  vendedor: ['dashboard.view', 'products.edit', 'products.manage', 'inventory.manage', 'orders.view'],
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
  assert.deepEqual([...ADMIN_PERMISSIONS].sort(), [...TABLA.superadmin].sort());
});

test('PBI-0013: el vendedor crea y modifica productos, pero no los elimina', () => {
  assert.ok(can('vendedor', 'products.manage'));
  assert.ok(!can('vendedor', 'products.delete'));
  assert.ok(can('admin', 'products.delete'));
});

test('PBI-0170: el vendedor gestiona Inventario y ve Pedidos, pero no cambia su estado', () => {
  assert.ok(can('vendedor', 'inventory.manage'));
  assert.ok(can('vendedor', 'orders.view'));
  assert.ok(!can('vendedor', 'orders.manage'));
  for (const rol of ['superadmin', 'admin']) {
    assert.ok(can(rol, 'orders.view'), rol);
    assert.ok(can(rol, 'orders.manage'), rol);
  }
});

test('PBI-0013: Contenido es solo del superadministrador; banners y tarifas siguen con el administrador', () => {
  assert.ok(can('superadmin', 'content.manage'));
  assert.ok(!can('admin', 'content.manage'));
  assert.ok(can('admin', 'banners.manage'));
  assert.ok(can('admin', 'shipping.manage'));
});

test('PBI-0013: el superadministrador gestiona a todos; el administrador, solo a los vendedores y sin eliminarlos', () => {
  assert.deepEqual(managedUserRoles('superadmin'), ['superadmin', 'admin', 'vendedor']);
  assert.deepEqual(managedUserRoles('admin'), ['vendedor']);
  assert.deepEqual(managedUserRoles('vendedor'), []);
  assert.deepEqual(managedUserRoles('desconocido'), []);
  assert.ok(can('superadmin', 'users.delete'));
  assert.ok(!can('admin', 'users.delete'));
});

test('solo el superadministrador gestiona los temas (TEST-09)', () => {
  assert.ok(ADMIN_PERMISSIONS.includes('themes.manage'));
  assert.ok(can('superadmin', 'themes.manage'));
  assert.ok(!can('admin', 'themes.manage'));
  assert.ok(!can('vendedor', 'themes.manage'));
});
