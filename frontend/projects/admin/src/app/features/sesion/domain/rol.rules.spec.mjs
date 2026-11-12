import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./rol.rules.ts', import.meta.url), 'utf8');
const moduleSource = ts.transpileModule(source.replace(/^import .*$/gm, ''), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { ROLES, definicionDeRol, rolPuede } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
);

/**
 * Tabla de roles fijos del 05/11, igual que la del BFF (backend/src/domain/sesion/rol.rules.mjs).
 * La feature 002 solo añade `themes.manage` al superadministrador.
 */
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
  assert.ok(!rolPuede('admin', 'users.manage'));
  assert.ok(!rolPuede('admin', 'store.reset'));
  assert.ok(rolPuede('admin', 'content.manage'));
  assert.ok(rolPuede('vendedor', 'orders.manage'));
  assert.ok(!rolPuede('vendedor', 'products.manage'));
  assert.ok(!rolPuede(null, 'dashboard.view'));
  assert.ok(!rolPuede(undefined, 'dashboard.view'));
  assert.ok(!rolPuede('owner', 'dashboard.view'));
});

test('solo el superadministrador gestiona los temas (TEST-09, réplica del Admin)', () => {
  assert.ok(rolPuede('superadmin', 'themes.manage'));
  assert.ok(!rolPuede('admin', 'themes.manage'));
  assert.ok(!rolPuede('vendedor', 'themes.manage'));
});
