import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./rol.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { ROLES, definicionDeRol, rolPuede, rolesGestionables } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

/**
 * Tabla de roles fijos del 05/11, igual que la del BFF (backend/src/domain/sesion/rol.rules.mjs), con los permisos de
 * la reunión del 11/11 (lote 07, PBI-0013; confirmados por Daniel el 2026-11-18, con el cambio de PBI-0170). La feature
 * 002 añadió `themes.manage` al superadministrador.
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
  // PBI-0170 (lote 11, ADR-0021; provisional): el vendedor gestiona Inventario y ve Pedidos sin cambiar su estado.
  vendedor: ['dashboard.view', 'products.edit', 'products.manage', 'inventory.manage', 'orders.view'],
};

const permisosDe = (rol) => [...definicionDeRol(rol).permissions].sort();

test('los tres roles fijos, en este orden', () => {
  assert.deepEqual(
    ROLES.map((rol) => rol.id),
    ['superadmin', 'admin', 'vendedor'],
  );
});

for (const [rol, permisos] of Object.entries(TABLA)) {
  test(`${rol} tiene exactamente los permisos de la tabla`, () => {
    assert.deepEqual(permisosDe(rol), [...permisos].sort());
  });
}

test('rolPuede responde según la tabla y niega sin rol o con un rol desconocido', () => {
  assert.ok(rolPuede('superadmin', 'users.manage'));
  assert.ok(rolPuede('admin', 'users.manage'));
  assert.ok(!rolPuede('admin', 'store.reset'));
  assert.ok(!rolPuede('admin', 'content.manage'));
  assert.ok(!rolPuede('vendedor', 'orders.manage'));
  assert.ok(rolPuede('vendedor', 'products.manage'));
  assert.ok(!rolPuede('vendedor', 'products.delete'));
  assert.ok(!rolPuede(null, 'dashboard.view'));
  assert.ok(!rolPuede(undefined, 'dashboard.view'));
  assert.ok(!rolPuede('owner', 'dashboard.view'));
});

test('PBI-0170: el vendedor gestiona Inventario y ve Pedidos, pero no cambia su estado', () => {
  assert.ok(rolPuede('vendedor', 'inventory.manage'));
  assert.ok(rolPuede('vendedor', 'orders.view'));
  assert.ok(!rolPuede('vendedor', 'orders.manage'));
  assert.ok(rolPuede('admin', 'orders.view'));
  assert.ok(rolPuede('admin', 'orders.manage'));
});

test('solo el superadministrador gestiona los temas (TEST-09, réplica del Admin)', () => {
  assert.ok(rolPuede('superadmin', 'themes.manage'));
  assert.ok(!rolPuede('admin', 'themes.manage'));
  assert.ok(!rolPuede('vendedor', 'themes.manage'));
});

test('PBI-0013: el superadministrador gestiona a todos; el administrador, solo a los vendedores y sin eliminarlos', () => {
  assert.deepEqual(rolesGestionables('superadmin'), ['superadmin', 'admin', 'vendedor']);
  assert.deepEqual(rolesGestionables('admin'), ['vendedor']);
  assert.deepEqual(rolesGestionables('vendedor'), []);
  assert.deepEqual(rolesGestionables(null), []);
  assert.ok(rolPuede('superadmin', 'users.delete'));
  assert.ok(!rolPuede('admin', 'users.delete'));
});
