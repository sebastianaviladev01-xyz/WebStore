/**
 * Qué colecciones del snapshot puede guardar cada rol (lote 02, PBI-0102). La tabla de permisos de los roles (lote 07,
 * PBI-0013, confirmada por Daniel el 2026-11-18) está en `rol.rules.test.mjs`; aquí, su traducción a
 * `INSUFFICIENT_ROLE`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  requireWritableCollections,
  WRITE_PERMISSIONS,
} from '../../../../src/domain/admin/snapshot.rules.mjs';

/** Colecciones que cada rol puede guardar, por la tabla de permisos vigente (productos se revisan aparte). */
const PERMITIDAS = {
  superadmin: Object.keys(WRITE_PERMISSIONS),
  admin: ['categories', 'brands', 'customers', 'banners', 'rates', 'complaints', 'users', 'orders'],
  vendedor: [],
};

for (const [rol, permitidas] of Object.entries(PERMITIDAS))
  for (const coleccion of Object.keys(WRITE_PERMISSIONS)) {
    const puede = permitidas.includes(coleccion);
    test(`${rol} ${puede ? 'puede' : 'no puede'} guardar ${coleccion}`, () => {
      const guardar = () => requireWritableCollections({ revision: 1, [coleccion]: [] }, rol);
      if (puede) assert.doesNotThrow(guardar);
      else
        assert.throws(guardar, {
          code: 'INSUFFICIENT_ROLE',
          kind: 'forbidden',
          details: { collection: coleccion },
        });
    });
  }

test('lo que no llega en el guardado no se revisa, ni siquiera para un rol sin permisos', () => {
  assert.doesNotThrow(() => requireWritableCollections({ revision: 3 }, 'vendedor'));
  assert.doesNotThrow(() => requireWritableCollections({ revision: 3, users: undefined }, 'vendedor'));
});

test('con una colección que no se puede, falla aunque otra sí se pueda, y nombra la que no', () => {
  assert.throws(() => requireWritableCollections({ banners: [], config: {} }, 'admin'), {
    details: { collection: 'config' },
  });
});

test('un rol que no existe no puede guardar nada', () => {
  assert.throws(() => requireWritableCollections({ brands: [] }, 'owner'), { code: 'INSUFFICIENT_ROLE' });
  assert.throws(() => requireWritableCollections({ brands: [] }, undefined), { code: 'INSUFFICIENT_ROLE' });
});
